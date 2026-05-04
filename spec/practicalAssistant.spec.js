const {
    answerWithTools,
    buildAssistantPipeline,
    buildSystemPrompt,
    classifyIntent,
    retrieveContext,
    selectInContextExamples,
    solveLinearEquation
} = require('../utils/practicalAssistant');
const { generateReplies, getConfiguredModelIds } = require('../utils/llmService');
const { getModelById, listModelSummaries, sanitizeSelectedModelIds } = require('../utils/modelCatalog');
const { evaluateWeatherConfidence } = require('../utils/confidenceEvaluator');
const { resolveKnownTimezone } = require('../utils/locationResolver');
const { extractLocationFromMessage } = require('../utils/queryParser');
const { isLowQualityResponse } = require('../utils/responseQuality');
const { reconstructTemperatureTrend } = require('../utils/weatherSignalReconstruction');

function makeResponse(body, ok = true, status = 200) {
    return {
        ok,
        status,
        json: async () => body,
        text: async () => String(body)
    };
}

function mockFetch(url) {
    const textUrl = String(url);
    if (textUrl.includes('api.mathjs.org')) {
        if (textUrl.includes(encodeURIComponent('derivative(6*x^7, x)'))) {
            return Promise.resolve(makeResponse('42 * x ^ 6'));
        }
        if (textUrl.includes(encodeURIComponent('(10 - (4)) / (2)'))) {
            return Promise.resolve(makeResponse('3'));
        }
        if (textUrl.includes(encodeURIComponent('(12 - (-6)) / (3)'))) {
            return Promise.resolve(makeResponse('6'));
        }
        return Promise.resolve(makeResponse('32'));
    }

    if (textUrl.includes('geocoding-api.open-meteo.com')) {
        const parsedUrl = new URL(textUrl);
        const requestedName = parsedUrl.searchParams.get('name') || 'Miami';
        if (/atlantis/i.test(requestedName)) {
            return Promise.resolve(makeResponse({ results: [] }));
        }
        return Promise.resolve(makeResponse({
            results: [{
                name: requestedName.replace(/\b\w/g, letter => letter.toUpperCase()),
                admin1: /edison|piscataway|new brunswick/i.test(requestedName) ? 'New Jersey' : 'Florida',
                country: 'United States',
                latitude: 25.7617,
                longitude: -80.1918,
                timezone: 'America/New_York'
            }]
        }));
    }

    if (textUrl.includes('api.open-meteo.com')) {
        return Promise.resolve(makeResponse({
            timezone: 'America/New_York',
            current_units: {
                temperature_2m: 'F',
                wind_speed_10m: 'mph'
            },
            current: {
                temperature_2m: 82,
                relative_humidity_2m: 65,
                precipitation: 0,
                weather_code: 2,
                wind_speed_10m: 9
            },
            hourly: {
                time: [
                    '2026-04-25T00:00', '2026-04-25T01:00', '2026-04-25T02:00', '2026-04-25T03:00',
                    '2026-04-25T04:00', '2026-04-25T05:00', '2026-04-25T06:00', '2026-04-25T07:00',
                    '2026-04-25T08:00', '2026-04-25T09:00', '2026-04-25T10:00', '2026-04-25T11:00'
                ],
                temperature_2m: [70, 69, 68, 68, 70, 73, 76, 80, 84, 86, 85, 83],
                precipitation_probability: [5, 5, 5, 5, 8, 10, 12, 15, 18, 20, 25, 25],
                weather_code: [2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3]
            }
        }));
    }

    if (textUrl.includes('timeapi.io')) {
        const parsedUrl = new URL(textUrl);
        const requestedTimezone = parsedUrl.searchParams.get('timeZone') || 'America/New_York';
        return Promise.resolve(makeResponse({
            dateTime: '2026-04-25T18:30:00',
            timeZone: requestedTimezone,
            dstActive: true
        }));
    }

    return Promise.resolve(makeResponse({}, false, 404));
}

describe('practical assistant tools', () => {
    it('solves simple linear equations through the math API', async () => {
        const result = await answerWithTools('Solve 2x + 4 = 10', 'professional', { fetchImpl: mockFetch });
        const directResult = await solveLinearEquation('Solve 2x + 4 = 10', { fetchImpl: mockFetch });

        expect(result.intent).toBe('math');
        expect(result.text).toContain('x = 3');
        expect(result.metadata.techniques).toContain('tool calling');
        expect(result.metadata.toolCalls[0].name).toBe('solveEquation');
        expect(result.metadata.toolCalls[0].apiProvider).toBe('mathjs');
        expect(directResult.answer).toBe('3');
    });

    it('formats time answers using the TimeAPI response', async () => {
        const result = await answerWithTools('What day is it?', 'sweetheart', { fetchImpl: mockFetch });

        expect(result.intent).toBe('time');
        expect(result.text).toContain('sweetheart');
        expect(result.text).toContain('Saturday');
        expect(result.metadata.toolCalls[0].name).toBe('getCurrentDateTime');
        expect(result.metadata.toolCalls[0].apiProvider).toBe('timeapi');
    });

    it('uses weather, retrieval, in-context examples, planning, and model sanitizing', async () => {
        const weatherResult = await answerWithTools('How is the weather looking for Miami?', 'silly', { fetchImpl: mockFetch });
        const pipeline = buildAssistantPipeline('How is the weather looking for Miami?', 'silly');

        expect(classifyIntent('predict the weather in Miami')).toBe('weather');
        expect(weatherResult.text).toContain('prediction for Miami');
        expect(weatherResult.text).toContain('82 F');
        expect(weatherResult.text.toLowerCase()).not.toContain('demo');
        expect(weatherResult.metadata.techniques).toEqual([
            'retrieval-augmented generation',
            'in-context learning',
            'chain-of-thought planning',
            'tool calling'
        ]);
        expect(weatherResult.metadata.retrievedContext[0].id).toBe('weather-api-policy');
        expect(weatherResult.metadata.inContextExamples[0].id).toBe('weather-silly-example');
        expect(weatherResult.metadata.reasoningSummary.join(' ')).toContain('Call API tool: getCurrentWeather');
        expect(weatherResult.metadata.toolCalls[0].apiProvider).toBe('open-meteo');
        expect(weatherResult.metadata.toolCalls[0].result.confidence.level).toBe('HIGH');
        expect(weatherResult.metadata.toolCalls[0].result.reconstruction).toBeNull();
        expect(pipeline.reasoningPlan.length).toBeGreaterThan(0);
        expect(selectInContextExamples('weather', 'silly')[0].id).toBe('weather-silly-example');
        expect(retrieveContext('Can you solve an equation?').length).toBeGreaterThan(0);
        expect(buildSystemPrompt('silly', 'weather in Boston')).toContain('Retrieved guidance');
        expect(buildSystemPrompt('silly', 'weather in Boston')).toContain('In-context examples');
        expect(buildSystemPrompt('silly', 'weather in Boston')).toContain('Reasoning plan summary');
        expect(getConfiguredModelIds(['bad-id', 'ollama-qwen2.5-3b'])).toEqual(['ollama-qwen2.5-3b']);
    });

    it('exposes the requested local Ollama models for backend selection', () => {
        const localModels = listModelSummaries().filter(model => model.access === 'local');

        expect(localModels.map(model => model.id)).toEqual([
            'ollama-gemma3-1b',
            'ollama-phi3-mini',
            'ollama-llama3.2-1b',
            'ollama-qwen2.5-3b',
            'ollama-llama3.2-latest'
        ]);
        expect(getModelById('ollama-gemma3-1b').runtimeModel).toBe('gemma3:1b');
        expect(getModelById('ollama-phi3-mini').runtimeModel).toBe('phi3:mini');
        expect(getModelById('ollama-llama3.2-1b').runtimeModel).toBe('llama3.2:1b');
        expect(getModelById('ollama-qwen2.5-3b').runtimeModel).toBe('qwen2.5:3b');
        expect(getModelById('ollama-gemma3-1b').description).toContain('Recommended fastest');
        expect(getModelById('ollama-llama3.2-latest').description).toContain('not recommended for demos');
        expect(sanitizeSelectedModelIds([
            'ollama-gemma3-1b',
            'ollama-phi3-mini',
            'ollama-llama3.2-1b',
            'ollama-qwen2.5-3b',
            'ollama-llama3.2-latest'
        ])).toEqual([
            'ollama-gemma3-1b',
            'ollama-phi3-mini',
            'ollama-llama3.2-1b',
            'ollama-qwen2.5-3b',
            'ollama-llama3.2-latest'
        ]);
    });

    it('adds an uncertainty note for medium confidence weather questions', async () => {
        const weatherResult = await answerWithTools('What is the weather trend tonight in Miami?', 'professional', { fetchImpl: mockFetch });

        expect(weatherResult.intent).toBe('weather');
        expect(weatherResult.metadata.toolCalls[0].result.confidence.level).toBe('MEDIUM');
        expect(weatherResult.metadata.toolCalls[0].result.reconstruction).toBeTruthy();
        expect(weatherResult.text).toContain('Forecast confidence is medium');
        expect(weatherResult.metadata.reasoningSummary.join(' ')).toContain('Weather confidence was MEDIUM');
    });

    it('extracts locations from flexible weather and time prompts', () => {
        expect(extractLocationFromMessage("What's the weather in Piscataway?", 'weather')).toBe('Piscataway');
        expect(extractLocationFromMessage('Will it rain tonight in Edison NJ?', 'weather')).toBe('Edison NJ');
        expect(extractLocationFromMessage('How hot will it be tomorrow in New Brunswick?', 'weather')).toBe('New Brunswick');
        expect(extractLocationFromMessage("What's the time in Kolkata India?", 'time')).toBe('Kolkata India');
        expect(extractLocationFromMessage('What day is it in Tokyo Japan?', 'time')).toBe('Tokyo Japan');
        expect(resolveKnownTimezone('Kolkata India').timezone).toBe('Asia/Kolkata');
        expect(resolveKnownTimezone('Tokyo Japan').timezone).toBe('Asia/Tokyo');
    });

    it('answers flexible weather prompts without undefined results', async () => {
        const prompts = [
            "What's the weather in Piscataway?",
            'Will it rain tonight in Edison NJ?',
            'Will it rain exactly at 7:13 PM in New Brunswick?'
        ];

        for (const prompt of prompts) {
            const weatherResult = await answerWithTools(prompt, 'silly', { fetchImpl: mockFetch });
            const toolResult = weatherResult.metadata.toolCalls[0].result;
            expect(weatherResult.text).toBeTruthy();
            expect(weatherResult.text).not.toContain('undefined');
            expect(toolResult.location).toBeTruthy();
        }
    });

    it('uses reconstruction for precise weather prompts beyond one hardcoded location', async () => {
        const weatherResult = await answerWithTools('Will it rain exactly at 7:13 PM in New Brunswick?', 'professional', { fetchImpl: mockFetch });
        const toolResult = weatherResult.metadata.toolCalls[0].result;

        expect(toolResult.location).toContain('New Brunswick');
        expect(toolResult.confidence.level).toBe('LOW');
        expect(toolResult.reconstruction).toBeTruthy();
        expect(weatherResult.text).not.toContain('undefined');
    });

    it('invokes reconstruction for low confidence weather timing requests', async () => {
        const weatherResult = await answerWithTools('Will it rain exactly at 7:13 PM in Piscataway?', 'silly', { fetchImpl: mockFetch });
        const toolResult = weatherResult.metadata.toolCalls[0].result;

        expect(toolResult.confidence.level).toBe('LOW');
        expect(toolResult.confidence.reasons.join(' ')).toContain('overly precise weather timing');
        expect(toolResult.reconstruction).toBeTruthy();
        expect(toolResult.reconstruction.trendSummary).toContain('reconstructed temperature signal');
        expect(weatherResult.text.toLowerCase()).toContain('trend');
        expect(weatherResult.text.toLowerCase()).toContain('refuses exact certainty');
        expect(weatherResult.metadata.reasoningSummary.join(' ')).toContain('Weather confidence was LOW, so the assistant invoked the weather signal reconstruction module.');
    });

    it('reconstructs temperature trend peak, low, and summary deterministically', () => {
        const trend = reconstructTemperatureTrend([
            { time: '2026-04-25T00:00', temperature: 60 },
            { time: '2026-04-25T01:00', temperature: 62 },
            { time: '2026-04-25T02:00', temperature: 66 },
            { time: '2026-04-25T03:00', temperature: 70 }
        ]);

        expect(trend.reconstructedPoints.length).toBe(4);
        expect(trend.peakTime).toBe('2026-04-25T03:00');
        expect(trend.lowTime).toBe('2026-04-25T00:00');
        expect(trend.overallTrend).toBe('rising');
        expect(trend.trendSummary).toContain('reconstructed temperature signal');
    });

    it('evaluates explicit confidence reasons for precise weather prompts', () => {
        const confidence = evaluateWeatherConfidence({
            userMessage: 'Will it rain exactly at 7:13 PM in Miami?',
            toolResult: { location: 'Miami', temperature: 82, condition: 'partly cloudy' },
            forecastData: { hourlySamples: [] }
        });

        expect(confidence.level).toBe('LOW');
        expect(confidence.reasons.join(' ')).toContain('overly precise weather timing');
        expect(confidence.reasons.join(' ')).toContain('sparse or missing');
    });

    it('shares the same reconstructed weather result across selected models', async () => {
        const replies = await generateReplies(
            ['google-gemini-2.0-flash', 'openai-gpt-4o-mini', 'anthropic-claude-3-5-haiku'],
            [{ type: 'user-bubble', text: 'Will it rain exactly at 7:13 PM in Piscataway?' }],
            { personaId: 'silly', toolOptions: { fetchImpl: mockFetch } }
        );
        const summaries = replies.map(reply => reply.metadata.toolCalls[0].result.reconstruction.trendSummary);

        expect(replies.length).toBe(3);
        expect(replies.every(reply => reply.metadata.toolCalls[0].result.confidence.level === 'LOW')).toBeTrue();
        expect(new Set(summaries).size).toBe(1);
        expect(replies.every(reply => /trend|scroll|confidence|certainty/i.test(reply.text))).toBeTrue();
    });

    it('calls the factual tool once and formats the same facts per selected model', async () => {
        let mathApiCalls = 0;
        const countingFetch = url => {
            if (String(url).includes('api.mathjs.org')) {
                mathApiCalls += 1;
            }
            return mockFetch(url);
        };

        const replies = await generateReplies(
            ['google-gemini-2.0-flash', 'openai-gpt-4o-mini', 'anthropic-claude-3-5-haiku'],
            [{ type: 'user-bubble', text: 'What is 4 * 8?' }],
            { personaId: 'professional', toolOptions: { fetchImpl: countingFetch } }
        );

        expect(mathApiCalls).toBe(1);
        expect(replies.length).toBe(3);
        expect(replies.every(reply => reply.text.includes('32'))).toBeTrue();
        expect(new Set(replies.map(reply => reply.text)).size).toBe(3);
        expect(replies.some(reply => reply.text.includes('grounded in the shared tool result'))).toBeFalse();
        expect(replies.every(reply => reply.metadata.toolCalls[0].apiProvider === 'mathjs')).toBeTrue();
    });

    it('answers derivative questions through math.js instead of echoing the prompt', async () => {
        const replies = await generateReplies(
            ['google-gemini-2.0-flash', 'openai-gpt-4o-mini', 'anthropic-claude-3-5-haiku'],
            [{ type: 'user-bubble', text: 'what is the derivative of 6x^7' }],
            { personaId: 'professional', toolOptions: { fetchImpl: mockFetch } }
        );

        expect(classifyIntent('what is the derivative of 6x^7')).toBe('math');
        expect(replies.length).toBe(3);
        expect(replies.every(reply => /42 \* x \^ 6|42/.test(reply.text))).toBeTrue();
        expect(replies.every(reply => reply.metadata.toolCalls[0].apiProvider === 'mathjs')).toBeTrue();
    });

    it('answers relative date and time questions from the TimeAPI result', async () => {
        let timeApiCalls = 0;
        const countingFetch = url => {
            if (String(url).includes('timeapi.io')) {
                timeApiCalls += 1;
            }
            return mockFetch(url);
        };

        const replies = await generateReplies(
            ['google-gemini-2.0-flash', 'openai-gpt-4o-mini', 'anthropic-claude-3-5-haiku'],
            [{ type: 'user-bubble', text: 'what will be the date and time 24 hours from now.' }],
            { personaId: 'sweetheart', toolOptions: { fetchImpl: countingFetch } }
        );

        expect(classifyIntent('what will be the date and time 24 hours from now.')).toBe('time');
        expect(timeApiCalls).toBe(1);
        expect(replies.every(reply => reply.text.includes('Sunday'))).toBeTrue();
        expect(replies.every(reply => /24 hours from now|In 24 hours|after 24 hours/i.test(reply.text))).toBeTrue();
        expect(replies.every(reply => reply.metadata.toolCalls[0].apiProvider === 'timeapi')).toBeTrue();
    });

    it('resolves time questions to the requested location timezone', async () => {
        const kolkata = await answerWithTools("What's the time in Kolkata India?", 'professional', { fetchImpl: mockFetch });
        const tokyo = await answerWithTools('What day is it in Tokyo Japan?', 'sweetheart', { fetchImpl: mockFetch });

        expect(kolkata.metadata.toolCalls[0].result.timezone).toBe('Asia/Kolkata');
        expect(kolkata.metadata.toolCalls[0].result.location).toBe('Kolkata, India');
        expect(kolkata.text).not.toContain('undefined');
        expect(tokyo.metadata.toolCalls[0].result.timezone).toBe('Asia/Tokyo');
        expect(tokyo.metadata.toolCalls[0].result.location).toBe('Tokyo, Japan');
        expect(tokyo.text).not.toContain('America/New_York');
    });

    it('falls back gracefully when a time location cannot be resolved', async () => {
        const result = await answerWithTools("What's the time in Atlantis?", 'professional', { fetchImpl: mockFetch });
        const toolResult = result.metadata.toolCalls[0].result;

        expect(result.text).toBeTruthy();
        expect(result.text).not.toContain('undefined');
        expect(toolResult.timezone).toBe('America/New_York');
        expect(toolResult.resolutionNote).toContain('Could not resolve');
    });

    it('keeps selected personality tone while formatting one shared time result per model', async () => {
        let timeApiCalls = 0;
        const countingFetch = url => {
            if (String(url).includes('timeapi.io')) {
                timeApiCalls += 1;
            }
            return mockFetch(url);
        };

        const replies = await generateReplies(
            ['google-gemini-2.0-flash', 'openai-gpt-4o-mini', 'anthropic-claude-3-5-haiku'],
            [{ type: 'user-bubble', text: "what's the date and time" }],
            { personaId: 'sweetheart', toolOptions: { fetchImpl: countingFetch } }
        );

        expect(timeApiCalls).toBe(1);
        expect(replies.every(reply => reply.text.includes('Saturday'))).toBeTrue();
        expect(replies.every(reply => /sweetheart|dear|helps/i.test(reply.text))).toBeTrue();
        expect(new Set(replies.map(reply => reply.text)).size).toBe(3);
        expect(replies.some(reply => reply.text.includes('grounded in the shared tool result'))).toBeFalse();
    });

    it('answers non-tool prompts with distinct persona-compliant model responses', async () => {
        const replies = await generateReplies(
            ['google-gemini-2.0-flash', 'openai-gpt-4o-mini', 'anthropic-claude-3-5-haiku'],
            [{ type: 'user-bubble', text: 'Tell me a story about a brave teacup.' }],
            { personaId: 'silly', toolOptions: { fetchImpl: mockFetch } }
        );

        expect(replies.length).toBe(3);
        expect(replies.every(reply => reply.status === 'ok')).toBeTrue();
        expect(replies.every(reply => reply.metadata.toolCalls.length === 0)).toBeTrue();
        expect(new Set(replies.map(reply => reply.text)).size).toBe(3);
        expect(replies.every(reply => /Lord Silly|Silly|royal|kingdom|teacup|biscuit|spoon|pancake/i.test(reply.text))).toBeTrue();
    });

    it('answers general prompts without undefined text', async () => {
        const replies = await generateReplies(
            ['google-gemini-2.0-flash', 'openai-gpt-4o-mini', 'anthropic-claude-3-5-haiku'],
            [{ type: 'user-bubble', text: 'Give me a kind productivity tip.' }],
            { personaId: 'sweetheart', toolOptions: { fetchImpl: mockFetch } }
        );

        expect(replies.length).toBe(3);
        expect(replies.every(reply => reply.text && !reply.text.includes('undefined'))).toBeTrue();
    });

    it('uses a generic quality validator for unrelated general prompts', async () => {
        const prompts = [
            'What is artificial intelligence?',
            'Explain the difference between a stack and a queue',
            'How does the internet work?',
            'Tell me a short story'
        ];

        prompts.forEach(prompt => {
            expect(isLowQualityResponse(prompt, prompt)).toBeTrue();
            expect(isLowQualityResponse(prompt, 'I would answer by identifying the goal and separating facts.')).toBeTrue();
            expect(isLowQualityResponse(prompt, 'A concise answer with concrete detail that adds information beyond the prompt and avoids meta reasoning.')).toBeFalse();
        });
    });

    it('answers how-it-works questions instead of echoing the input', async () => {
        const userText = 'can you explain how you work';
        const replies = await generateReplies(
            ['google-gemini-2.0-flash', 'openai-gpt-4o-mini', 'anthropic-claude-3-5-haiku'],
            [{ type: 'user-bubble', text: userText }],
            { personaId: 'professional', toolOptions: { fetchImpl: mockFetch } }
        );

        expect(classifyIntent(userText)).toBe('general');
        expect(replies.length).toBe(3);
        replies.forEach(reply => {
            expect(reply.text).toBeTruthy();
            expect(reply.text.toLowerCase()).not.toBe(userText);
            expect(reply.text.toLowerCase()).not.toContain(`response: ${userText}`);
            expect(isLowQualityResponse(userText, reply.text)).toBeFalse();
            expect(reply.metadata.toolCalls.length).toBe(0);
        });
    });

    it('keeps general answers non-echoed and persona-toned across unrelated prompts', async () => {
        const prompts = [
            'What is artificial intelligence?',
            'Explain the difference between a stack and a queue',
            'How does the internet work?',
            'Tell me a short story'
        ];

        for (const userText of prompts) {
            const replies = await generateReplies(
                ['google-gemini-2.0-flash', 'openai-gpt-4o-mini', 'anthropic-claude-3-5-haiku'],
                [{ type: 'user-bubble', text: userText }],
                { personaId: 'sweetheart', toolOptions: { fetchImpl: mockFetch } }
            );

            replies.forEach(reply => {
                expect(reply.text).toBeTruthy();
                expect(isLowQualityResponse(userText, reply.text)).toBeFalse();
                expect(reply.text).toMatch(/sweetheart|dear|absolutely|hope|gentle|kind/i);
                expect(reply.metadata.toolCalls.length).toBe(0);
            });
        }
    });

    it('uses personality as tone without replacing the requested story content', async () => {
        const replies = await generateReplies(
            ['google-gemini-2.0-flash', 'openai-gpt-4o-mini', 'anthropic-claude-3-5-haiku'],
            [{ type: 'user-bubble', text: 'Tell me a story about four dogs named pisco, nasco, peluchin, and lupo.' }],
            { personaId: 'sweetheart', toolOptions: { fetchImpl: mockFetch } }
        );
        const requiredNames = ['pisco', 'nasco', 'peluchin', 'lupo'];

        expect(replies.length).toBe(3);
        expect(replies.every(reply => reply.metadata.toolCalls.length === 0)).toBeTrue();
        expect(new Set(replies.map(reply => reply.text)).size).toBe(3);
        replies.forEach(reply => {
            const text = reply.text.toLowerCase();
            requiredNames.forEach(name => expect(text).toContain(name));
            expect(text).toContain('dog');
            expect(/sweetheart|dear|gentle|kind|warm/i.test(reply.text)).toBeTrue();
        });
    });
});
