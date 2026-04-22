const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:latest';

function isTestMode() {
    return process.env.TEST_MODE === '1';
}

async function checkOllamaStatus() {
    if (isTestMode()) {
        return true;
    }

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

function getPersonaInstruction(persona) {
    if (persona === 'sweetheart') {
        return 'Adopt a warm, encouraging, and empathetic tone.';
    }

    if (persona === 'silly') {
        return 'Adopt a playful, whimsical, and slightly absurd tone while remaining understandable.';
    }

    return 'Adopt a concise, practical, and professional tone.';
}

function getProviderInstruction(provider) {
    if (provider.id === 'openai') {
        return 'Answer with clear structure and a short numbered list when helpful.';
    }

    if (provider.id === 'gemini') {
        return 'Answer analytically and compare tradeoffs where useful.';
    }

    return 'Answer supportively with reflective phrasing and practical next steps.';
}

function toConversationTranscript(messages = []) {
    return messages.slice(-12).map(message => {
        if (message.type === 'user-bubble') {
            return `User: ${message.text}`;
        }

        if (message.type === 'model-group') {
            return message.responses.map(response => `${response.providerLabel}: ${response.text}`).join('\n');
        }

        return '';
    }).filter(Boolean).join('\n');
}

function buildMockReply(provider, prompt, persona) {
    const personaLabel = persona === 'sweetheart'
        ? 'Miss Sweetheart'
        : persona === 'silly'
            ? 'Lord Silly The Ninth'
            : 'Mr. Professional';

    if (provider.id === 'openai') {
        return `${personaLabel} guided GPT to answer "${prompt}" with a structured plan: identify the goal, break it into manageable steps, and verify the result after each change.`;
    }

    if (provider.id === 'gemini') {
        return `${personaLabel} guided Gemini to compare options for "${prompt}" by weighing clarity, speed, and confidence before choosing the strongest approach.`;
    }

    return `${personaLabel} guided Claude to respond to "${prompt}" with reassurance, a short explanation, and one concrete next action the user can take immediately.`;
}

async function generateReplyFromOllama({ provider, prompt, persona, conversationMessages = [] }) {
    if (isTestMode()) {
        return buildMockReply(provider, prompt, persona);
    }

    const systemPrompt = [
        'You are generating one response card in a three-model comparison UI.',
        getPersonaInstruction(persona),
        getProviderInstruction(provider),
        'Keep the answer focused, natural, and under 120 words.'
    ].join(' ');

    const transcript = toConversationTranscript(conversationMessages);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                stream: false,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...(transcript ? [{ role: 'user', content: `Conversation so far:\n${transcript}` }] : []),
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const content = payload && payload.message && typeof payload.message.content === 'string'
            ? payload.message.content.trim()
            : '';

        if (!content) {
            throw new Error('Ollama returned empty content.');
        }

        return content;
    } catch (error) {
        throw new Error('ollama-failed');
    } finally {
        clearTimeout(timeout);
    }
}

async function warmupOllama() {
    const online = await checkOllamaStatus();
    if (!online) {
        return false;
    }

    try {
        await generateReplyFromOllama({
            provider: { id: 'openai', label: 'GPT' },
            prompt: 'Say hello in one sentence.',
            persona: 'professional',
            conversationMessages: []
        });
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    checkOllamaStatus,
    warmupOllama,
    generateReplyFromOllama,
    buildMockReply
};
