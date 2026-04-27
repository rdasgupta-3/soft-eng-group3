const { generateReplyFromOllama } = require('./ollamaClient');
const { getDefaultModelIds, getModelById, sanitizeSelectedModelIds } = require('./modelCatalog');
const { answerWithTools, buildSystemPrompt, getPersona } = require('./practicalAssistant');

function getConfiguredModelIds(modelIds = []) {
    const configured = sanitizeSelectedModelIds(modelIds);
    return configured.length ? configured : getDefaultModelIds();
}

function latestUserText(messages = []) {
    const latest = [...messages].reverse().find(message => message.type === 'user-bubble');
    return latest ? latest.text : '';
}

async function callOpenAI(model, messages, systemPrompt) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model.runtimeModel,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.slice(-12).map(message => ({
                    role: message.type === 'user-bubble' ? 'user' : 'assistant',
                    content: message.text
                }))
            ]
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callGemini(model, messages, systemPrompt) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured.');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.runtimeModel}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: messages.slice(-12).map(message => ({
                role: message.type === 'user-bubble' ? 'user' : 'model',
                parts: [{ text: message.text }]
            }))
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

async function callClaude(model, messages, systemPrompt) {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model.runtimeModel,
            max_tokens: 600,
            system: systemPrompt,
            messages: messages.slice(-12).map(message => ({
                role: message.type === 'user-bubble' ? 'user' : 'assistant',
                content: message.text
            }))
        })
    });

    if (!response.ok) {
        throw new Error(`Claude request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text?.trim() || '';
}

function providerVoice(model) {
    if (model.provider === 'google') {
        return 'Use a crisp, direct answer with one short supporting detail.';
    }
    if (model.provider === 'openai') {
        return 'Use a balanced, conversational answer with clear wording.';
    }
    if (model.provider === 'anthropic') {
        return 'Use a thoughtful, polished answer with a little context.';
    }
    return 'Use a concise answer that sounds natural for a local assistant model.';
}

function buildToolFormattingPrompt(model, personaId, userText, toolAnswer) {
    const persona = getPersona(personaId);
    const toolCall = toolAnswer.metadata && Array.isArray(toolAnswer.metadata.toolCalls)
        ? toolAnswer.metadata.toolCalls[0]
        : null;

    return [
        `User request: ${userText}`,
        `Selected personality: ${persona.name} (${persona.tone}).`,
        `You are formatting this answer as ${model.name}. ${providerVoice(model)}`,
        'Use only the factual tool result below. Do not invent or alter facts.',
        'Write a concise response in your own wording, matching the selected personality.',
        `Tool intent: ${toolAnswer.intent}`,
        `Tool call: ${toolCall ? toolCall.name : 'unknown'}`,
        `Tool provider: ${toolCall ? (toolCall.apiProvider || 'unknown') : 'unknown'}`,
        `Tool result JSON: ${JSON.stringify(toolCall ? toolCall.result || toolCall.error : toolAnswer.text)}`
    ].join('\n');
}

function formatNumber(value) {
    return Number.isFinite(Number(value)) ? Number(value).toFixed(0) : value;
}

function formatUnit(unit) {
    return unit === 'mp/h' ? 'mph' : unit;
}

function toolResultFor(toolAnswer) {
    const toolCall = toolAnswer.metadata && Array.isArray(toolAnswer.metadata.toolCalls)
        ? toolAnswer.metadata.toolCalls[0]
        : null;
    return toolCall && toolCall.result ? toolCall.result : {};
}

function formatFactSummary(intent, result) {
    if (intent === 'math') {
        return {
            answer: result.answer,
            steps: Array.isArray(result.steps) ? result.steps.join(' Then ') : `Answer: ${result.answer}`
        };
    }

    if (intent === 'time') {
        const now = result.now ? new Date(result.now) : new Date();
        const dateText = now.toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: result.timezone || 'America/New_York',
            timeZoneName: 'short'
        });
        return {
            dateText,
            location: result.location || result.timezone || 'the selected timezone',
            relativeOffset: result.relativeOffset || null
        };
    }

    if (intent === 'weather') {
        return {
            location: result.location || 'the selected location',
            weatherText: `${formatNumber(result.temperature)} ${formatUnit(result.temperatureUnit)}, ${result.condition}, wind ${formatNumber(result.windSpeed)} ${formatUnit(result.windSpeedUnit)}, humidity ${formatNumber(result.humidity)}%`
        };
    }

    return {};
}

function fallbackByPersona(persona, model, intent, facts) {
    const provider = model.provider;

    if (intent === 'math') {
        if (persona.id === 'sweetheart') {
            if (provider === 'google') return `Absolutely, sweetheart: ${facts.steps}. So the answer is ${facts.answer}.`;
            if (provider === 'openai') return `You got it, dear. ${facts.steps}. The answer is ${facts.answer}.`;
            if (provider === 'anthropic') return `Of course. Walking through it gently: ${facts.steps}. So we land at ${facts.answer}.`;
            return `${facts.steps}. Final answer: ${facts.answer}.`;
        }
        if (persona.id === 'silly') {
            if (provider === 'google') return `Royal math decree: ${facts.steps}. The number wearing the crown is ${facts.answer}.`;
            if (provider === 'openai') return `The arithmetic council has spoken: ${facts.steps}. Final answer: ${facts.answer}.`;
            if (provider === 'anthropic') return `After a suitably dramatic calculation, ${facts.steps}. The royal answer is ${facts.answer}.`;
            return `By royal decree: ${facts.steps}. Final answer: ${facts.answer}.`;
        }
        if (provider === 'google') return `${facts.steps}. Answer: ${facts.answer}.`;
        if (provider === 'openai') return `Here is the clean solution: ${facts.steps}. Final answer: ${facts.answer}.`;
        if (provider === 'anthropic') return `Solving step by step, ${facts.steps}. Therefore, the answer is ${facts.answer}.`;
        return `${facts.steps}. Final answer: ${facts.answer}.`;
    }

    if (intent === 'time') {
        const relativeLabel = facts.relativeOffset ? (facts.relativeOffset.durationLabel || facts.relativeOffset.label) : '';
        const relativePrefix = facts.relativeOffset ? `${facts.relativeOffset.label}, it will be` : 'it is';
        if (persona.id === 'sweetheart') {
            if (provider === 'google') return `Of course, sweetheart: ${relativePrefix} ${facts.dateText} for ${facts.location}.`;
            if (provider === 'openai') return `Sure thing, dear. ${facts.relativeOffset ? `In ${relativeLabel}, it will be` : 'Right now it is'} ${facts.dateText} for ${facts.location}.`;
            if (provider === 'anthropic') return `Absolutely. For ${facts.location}, ${facts.relativeOffset ? `after ${relativeLabel}, it will be` : 'it is'} ${facts.dateText}. Hope that helps.`;
            return `Of course, sweetheart. ${relativePrefix} ${facts.dateText} for ${facts.location}.`;
        }
        if (persona.id === 'silly') {
            if (provider === 'google') return `The grand clock declares ${relativePrefix} ${facts.dateText} for ${facts.location}.`;
            if (provider === 'openai') return `Hear ye, hear ye: ${relativePrefix} ${facts.dateText} for ${facts.location}.`;
            if (provider === 'anthropic') return `By order of the royal clock tower, ${relativePrefix} ${facts.dateText} for ${facts.location}.`;
            return `The grand clock proclaims: ${relativePrefix} ${facts.dateText} for ${facts.location}.`;
        }
        if (provider === 'google') return `${facts.location}: ${relativePrefix} ${facts.dateText}.`;
        if (provider === 'openai') return `For ${facts.location}, ${relativePrefix} ${facts.dateText}.`;
        if (provider === 'anthropic') return `For ${facts.location}, ${relativePrefix} ${facts.dateText}.`;
        return `Date and time: ${relativePrefix} ${facts.dateText} for ${facts.location}.`;
    }

    if (intent === 'weather') {
        if (persona.id === 'sweetheart') {
            if (provider === 'google') return `For ${facts.location}, sweetheart, it is ${facts.weatherText}.`;
            if (provider === 'openai') return `Sure thing, dear. In ${facts.location}, it is ${facts.weatherText}.`;
            if (provider === 'anthropic') return `Of course. For ${facts.location}, conditions are ${facts.weatherText}. Hope you stay comfy.`;
            return `For ${facts.location}, it is ${facts.weatherText}.`;
        }
        if (persona.id === 'silly') {
            if (provider === 'google') return `Royal weather bulletin for ${facts.location}: ${facts.weatherText}. Tiny dramatic sky behavior remains possible.`;
            if (provider === 'openai') return `The sky council reports ${facts.weatherText} in ${facts.location}. Umbrella confidence: cautiously theatrical.`;
            if (provider === 'anthropic') return `By Lord Silly's forecast scroll, ${facts.location} has ${facts.weatherText}. Proceed with noble weather awareness.`;
            return `My official prediction for ${facts.location}: ${facts.weatherText}.`;
        }
        if (provider === 'google') return `${facts.location}: ${facts.weatherText}.`;
        if (provider === 'openai') return `Current weather in ${facts.location}: ${facts.weatherText}.`;
        if (provider === 'anthropic') return `For ${facts.location}, the current conditions are ${facts.weatherText}.`;
        return `Current weather for ${facts.location}: ${facts.weatherText}.`;
    }

    return null;
}

function fallbackToolFormatting(model, personaId, toolAnswer) {
    const persona = getPersona(personaId);
    const facts = formatFactSummary(toolAnswer.intent, toolResultFor(toolAnswer));
    return fallbackByPersona(persona, model, toolAnswer.intent, facts) || toolAnswer.text;
}

function promptWantsStory(userText) {
    return /\b(story|tale|fairy tale|bedtime|narrative)\b/i.test(userText || '');
}

function titleCaseName(name) {
    return name
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function extractNamedCharacters(userText) {
    const match = (userText || '').match(/\bnamed\s+(.+?)(?:[.!?]|$)/i);
    if (!match) {
        return [];
    }

    return match[1]
        .replace(/\band\b/gi, ',')
        .split(',')
        .map(part => titleCaseName(part))
        .filter(Boolean);
}

function extractStorySubject(userText) {
    const match = (userText || '').match(/\b(?:story|tale|fairy tale|bedtime story|narrative)\b(?:\s+about)?\s+(.+?)(?:\s+named\b|[.!?]|$)/i);
    if (!match || !match[1].trim()) {
        return 'the requested characters';
    }
    return match[1].trim().replace(/^(about|of)\s+/i, '');
}

function humanList(items) {
    if (items.length <= 2) {
        return items.join(' and ');
    }
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function buildStoryDetails(userText) {
    const names = extractNamedCharacters(userText);
    const subject = extractStorySubject(userText);
    const cast = names.length ? humanList(names) : subject;
    const subjectLabel = subject.replace(/^(a|an|the)\s+/i, '');
    const castSentence = names.length
        ? `${cast} ${names.length === 1 ? 'is' : 'are'} the ${subjectLabel} at the center of the story`
        : `${subject} is at the center of the story`;

    return { names, subject, cast, castSentence };
}

function fallbackStory(model, persona, userText) {
    const provider = model.provider;
    const details = buildStoryDetails(userText);
    const subject = details.subject;
    const cast = details.cast;
    const castSentence = details.castSentence;

    if (persona.id === 'sweetheart') {
        if (provider === 'google') {
            return `Of course, sweetheart. Here is a gentle story about ${subject}: ${castSentence}. One soft morning, ${cast} found a little path that needed kindness more than courage. By helping one another step by step, they turned an ordinary day into a warm adventure full of friendship.`;
        }
        if (provider === 'openai') {
            return `Sure thing, dear. In this story about ${subject}, ${castSentence}. They wandered into a quiet neighborhood where someone needed a helping hand, and each one offered their own sweet bit of bravery. By sunset, ${cast} had learned that caring for each other can make even a small journey feel magical.`;
        }
        if (provider === 'anthropic') {
            return `Absolutely. Let us tell it warmly: ${castSentence}. When a small problem appeared, they listened, encouraged each other, and chose the kindest solution they could find. In the end, ${cast} carried home not a prize, but the happy feeling of having stayed together.`;
        }
        return `Of course, sweetheart. Here is a kind little story about ${subject}: ${castSentence}, and they make the day brighter by staying gentle and brave together.`;
    }

    if (persona.id === 'silly') {
        if (provider === 'google') {
            return `Behold, a tale about ${subject}: ${castSentence}. ${cast} marched into a very important quest involving a suspiciously squeaky gate, three dramatic crumbs, and one heroic decision to keep going. Naturally, the kingdom applauded because the adventure made almost perfect sense.`;
        }
        if (provider === 'openai') {
            return `Hear ye: in this magnificently silly story about ${subject}, ${castSentence}. They discovered a royal mystery, solved it with teamwork, and briefly considered wearing tiny capes for official business. By the end, ${cast} were celebrated as champions of cheerful nonsense.`;
        }
        if (provider === 'anthropic') {
            return `By decree of Lord Silly the Ninth, ${castSentence}. Their quest included one baffled town crier, a grand announcement, and a problem solved with more confidence than planning. Still, ${cast} succeeded nobly, which is the best kind of ridiculous.`;
        }
        return `By royal command, here is a silly story about ${subject}: ${castSentence}, and they complete their quest with excellent chaos and surprisingly useful teamwork.`;
    }

    if (provider === 'google') {
        return `Here is a concise story about ${subject}: ${castSentence}. They encounter a clear problem, divide the work fairly, and use patience to solve it. By the end, ${cast} understand that steady cooperation can turn a difficult moment into progress.`;
    }
    if (provider === 'openai') {
        return `Certainly. In a story about ${subject}, ${castSentence}. A challenge interrupts their day, so they compare ideas, choose a practical plan, and follow through together. The result is simple but meaningful: ${cast} finish stronger because they worked as a team.`;
    }
    if (provider === 'anthropic') {
        return `In this story about ${subject}, ${castSentence}. They face a situation that requires care rather than haste, so each character contributes something useful. When the problem is resolved, ${cast} leave with a clearer sense of trust and shared purpose.`;
    }
    return `Here is a story about ${subject}: ${castSentence}, and they solve their challenge with focus, cooperation, and care.`;
}

function fallbackGeneralReply(model, personaId, userText) {
    const persona = getPersona(personaId);
    const provider = model.provider;

    if (promptWantsStory(userText)) {
        return fallbackStory(model, persona, userText);
    }

    if (persona.id === 'sweetheart') {
        if (provider === 'google') return `Of course, sweetheart. I can help with that: ${userText}`;
        if (provider === 'openai') return `Sure thing, dear. Here is a warm, simple response to your request: ${userText}`;
        if (provider === 'anthropic') return `Absolutely. I hear what you are asking, and I would answer gently and clearly: ${userText}`;
        return `Of course, sweetheart. I can help with that.`;
    }

    if (persona.id === 'silly') {
        if (provider === 'google') return `Royal response incoming: ${userText}. I shall answer with maximum useful nonsense and minimum confusion.`;
        if (provider === 'openai') return `Hear ye, hear ye. Your request, "${userText}", has entered the court of Silly and will be treated with cheerful seriousness.`;
        if (provider === 'anthropic') return `By decree of Lord Silly, I shall address "${userText}" with dignity, whimsy, and only a modest amount of imaginary trumpet fanfare.`;
        return `By royal decree, I can help with that request.`;
    }

    if (provider === 'google') return `Direct answer: I can respond to "${userText}" with a concise, practical reply.`;
    if (provider === 'openai') return `Here is a clear response to your prompt: ${userText}`;
    if (provider === 'anthropic') return `I can help with that. I would approach "${userText}" carefully, clearly, and with enough context to be useful.`;
    return `I can help with that request.`;
}

async function formatToolAnswerWithModel(model, userText, personaId, toolAnswer) {
    const systemPrompt = [
        buildSystemPrompt(personaId, userText),
        'You are not finding new facts. You are only rephrasing the supplied tool result.'
    ].join('\n\n');
    const formattingPrompt = buildToolFormattingPrompt(model, personaId, userText, toolAnswer);

    try {
        let text = '';
        if (model.provider === 'ollama') {
            if (process.env.OLLAMA_TOOL_FORMATTING !== 'true') {
                throw new Error('Local Ollama tool formatting is disabled for fast API-backed replies.');
            }
            text = await generateReplyFromOllama([{ type: 'user-bubble', text: formattingPrompt }], {
                runtimeModel: model.runtimeModel,
                systemPrompt
            });
            if (/could not reach local ollama/i.test(text)) {
                throw new Error(text);
            }
        } else if (model.provider === 'openai') {
            text = await callOpenAI(model, [{ type: 'user-bubble', text: formattingPrompt }], systemPrompt);
        } else if (model.provider === 'google') {
            text = await callGemini(model, [{ type: 'user-bubble', text: formattingPrompt }], systemPrompt);
        } else if (model.provider === 'anthropic') {
            text = await callClaude(model, [{ type: 'user-bubble', text: formattingPrompt }], systemPrompt);
        }

        if (!text) {
            throw new Error('Provider returned no text.');
        }

        return {
            modelId: model.id,
            modelName: model.name,
            provider: model.provider,
            status: 'ok',
            text,
            metadata: toolAnswer.metadata
        };
    } catch (error) {
        return {
            modelId: model.id,
            modelName: model.name,
            provider: model.provider,
            status: 'ok',
            text: fallbackToolFormatting(model, personaId, toolAnswer),
            metadata: {
                ...(toolAnswer.metadata || {}),
                formatterFallback: error.message
            }
        };
    }
}

async function generateModelReply(model, messages, personaId) {
    const userText = latestUserText(messages);
    const systemPrompt = buildSystemPrompt(personaId, userText);

    try {
        let text = '';
        if (model.provider === 'ollama') {
            text = await generateReplyFromOllama(messages, {
                runtimeModel: model.runtimeModel,
                systemPrompt
            });
        } else if (model.provider === 'openai') {
            text = await callOpenAI(model, messages, systemPrompt);
        } else if (model.provider === 'google') {
            text = await callGemini(model, messages, systemPrompt);
        } else if (model.provider === 'anthropic') {
            text = await callClaude(model, messages, systemPrompt);
        }

        if (!text) {
            throw new Error('Provider returned no text.');
        }

        return {
            modelId: model.id,
            modelName: model.name,
            provider: model.provider,
            status: 'ok',
            text,
            metadata: {
                techniques: [
                    'retrieval-augmented generation',
                    'in-context learning',
                    'chain-of-thought planning'
                ],
                toolCalls: []
            }
        };
    } catch (error) {
        return {
            modelId: model.id,
            modelName: model.name,
            provider: model.provider,
            status: 'ok',
            text: fallbackGeneralReply(model, personaId, userText),
            metadata: {
                techniques: [
                    'retrieval-augmented generation',
                    'in-context learning',
                    'chain-of-thought planning'
                ],
                toolCalls: [],
                providerFallback: error.message
            }
        };
    }
}

async function generateReplies(modelIds, messages, options = {}) {
    const configuredIds = getConfiguredModelIds(modelIds);
    const personaId = options.personaId || 'professional';
    const userText = latestUserText(messages);
    const sharedToolAnswer = await answerWithTools(userText, personaId, options.toolOptions || {});
    const replies = await Promise.all(configuredIds.map(async modelId => {
        const model = getModelById(modelId);
        if (sharedToolAnswer) {
            return formatToolAnswerWithModel(model, userText, personaId, sharedToolAnswer);
        }
        return generateModelReply(model, messages, personaId);
    }));

    return replies;
}

module.exports = {
    generateReplies,
    getConfiguredModelIds
};
