const {
    checkOllamaHealth,
    describeOllamaError,
    DEFAULT_WARMUP_MODELS,
    generateReplyFromOllama,
    getAvailableModels,
    toOllamaMessages,
    warmOllamaModel
} = require('../utils/ollamaClient');

function makeResponse(body, ok = true, status = 200) {
    return {
        ok,
        status,
        json: async () => body,
        text: async () => typeof body === 'string' ? body : JSON.stringify(body)
    };
}

describe('ollamaClient', () => {
    it('keeps system prompts in Ollama chat messages', () => {
        const messages = toOllamaMessages([{ type: 'user-bubble', text: 'hello' }], 'system rules');

        expect(messages[0]).toEqual({ role: 'system', content: 'system rules' });
        expect(messages[1]).toEqual({ role: 'user', content: 'hello' });
    });

    it('lists installed models through the /api/tags health endpoint', async () => {
        const models = await getAvailableModels({
            fetchImpl: url => {
                expect(String(url)).toContain('/api/tags');
                return Promise.resolve(makeResponse({
                    models: [{ name: 'gemma3:1b' }, { name: 'phi3:mini' }]
                }));
            }
        });

        expect(models).toEqual(['gemma3:1b', 'phi3:mini']);
    });

    it('reports Ollama health without throwing when tags are reachable', async () => {
        const health = await checkOllamaHealth({
            fetchImpl: () => Promise.resolve(makeResponse({
                models: [{ name: 'qwen2.5:3b' }]
            }))
        });

        expect(health.reachable).toBeTrue();
        expect(health.installedModels).toEqual(['qwen2.5:3b']);
    });

    it('sends the correct /api/chat payload for the selected runtime model', async () => {
        const seen = [];
        const text = await generateReplyFromOllama([{ type: 'user-bubble', text: 'What is cache?' }], {
            runtimeModel: 'gemma3:1b',
            fetchImpl: (url, options = {}) => {
                seen.push(String(url));
                if (String(url).includes('/api/tags')) {
                    return Promise.resolve(makeResponse({
                        models: [{ name: 'gemma3:1b' }]
                    }));
                }

                const payload = JSON.parse(options.body);
                expect(String(url)).toContain('/api/chat');
                expect(payload).toEqual({
                    model: 'gemma3:1b',
                    stream: false,
                    messages: [{ role: 'user', content: 'What is cache?' }]
                });
                expect(options.signal).toBeTruthy();

                return Promise.resolve(makeResponse({
                    message: { content: 'A real local model response.' }
                }));
            }
        });

        expect(seen.some(url => url.includes('/api/tags'))).toBeTrue();
        expect(seen.some(url => url.includes('/api/chat'))).toBeTrue();
        expect(text).toBe('A real local model response.');
    });

    it('returns a clear final fallback when the selected model is not installed', async () => {
        const text = await generateReplyFromOllama([{ type: 'user-bubble', text: 'hello' }], {
            runtimeModel: 'missing-model:latest',
            fetchImpl: url => {
                expect(String(url)).toContain('/api/tags');
                return Promise.resolve(makeResponse({
                    models: [{ name: 'gemma3:1b' }]
                }));
            }
        });

        expect(text).toContain('missing-model:latest');
        expect(text).toContain('model not installed');
        expect(text).toContain('ollama pull missing-model:latest');
    });

    it('labels aborts as timeout failures', () => {
        const error = new Error('This operation was aborted');
        error.name = 'AbortError';

        expect(describeOllamaError(error)).toContain('timeout');
    });

    it('warms Gemma first with the Ollama chat API keep-alive payload', async () => {
        const payloads = [];
        const result = await warmOllamaModel({
            fetchImpl: (url, options = {}) => {
                if (String(url).includes('/api/tags')) {
                    return Promise.resolve(makeResponse({
                        models: [{ name: 'gemma3:1b' }, { name: 'phi3:mini' }]
                    }));
                }

                payloads.push(JSON.parse(options.body));
                return Promise.resolve(makeResponse({
                    message: { content: 'Ready' }
                }));
            }
        });

        expect(DEFAULT_WARMUP_MODELS).toEqual(['gemma3:1b', 'phi3:mini', 'llama3.2:1b']);
        expect(result.warmed).toBeTrue();
        expect(result.model).toBe('gemma3:1b');
        expect(payloads[0]).toEqual({
            model: 'gemma3:1b',
            stream: false,
            keep_alive: '10m',
            messages: [{ role: 'user', content: 'Hi. Reply with one word.' }]
        });
    });

    it('skips missing warmup models and tries the backup hierarchy', async () => {
        const warmed = [];
        const result = await warmOllamaModel({
            fetchImpl: (url, options = {}) => {
                if (String(url).includes('/api/tags')) {
                    return Promise.resolve(makeResponse({
                        models: [{ name: 'phi3:mini' }]
                    }));
                }

                const payload = JSON.parse(options.body);
                warmed.push(payload.model);
                return Promise.resolve(makeResponse({
                    message: { content: 'Ready' }
                }));
            }
        });

        expect(result.warmed).toBeTrue();
        expect(result.model).toBe('phi3:mini');
        expect(result.skipped[0].model).toBe('gemma3:1b');
        expect(result.skipped[0].reason).toContain('ollama pull gemma3:1b');
        expect(warmed).toEqual(['phi3:mini']);
    });

    it('does not throw when Ollama warmup cannot reach the tags endpoint', async () => {
        const result = await warmOllamaModel({
            fetchImpl: () => Promise.reject(new Error('ECONNREFUSED'))
        });

        expect(result.warmed).toBeFalse();
        expect(result.reason).toContain('connection error');
    });
});
