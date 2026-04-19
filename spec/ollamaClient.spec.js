const { RECOMMENDED_MODELS, getAvailableModels, generateReplyFromOllama } = require('../utils/ollamaClient');

// ─── RECOMMENDED_MODELS constant ──────────────────────────────────────────────

describe('ollamaClient – RECOMMENDED_MODELS', () => {
    it('contains exactly 4 models', () => {
        expect(RECOMMENDED_MODELS.length).toBe(4);
    });

    it('has llama3.2:latest as the first (default) model', () => {
        expect(RECOMMENDED_MODELS[0]).toBe('llama3.2:latest');
    });
});

// ─── getAvailableModels ────────────────────────────────────────────────────────

describe('ollamaClient – getAvailableModels', () => {
    afterEach(() => {
        // restore global fetch after each test
        delete global.fetch;
    });

    it('returns an empty array when fetch throws', async () => {
        global.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('Network error'));
        const models = await getAvailableModels();
        expect(models).toEqual([]);
    });

    it('returns model names from the Ollama /api/tags response', async () => {
        global.fetch = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({
                models: [
                    { name: 'llama3.2:latest' },
                    { name: 'gemma3:1b' }
                ]
            })
        });
        const models = await getAvailableModels();
        expect(models).toContain('llama3.2:latest');
        expect(models).toContain('gemma3:1b');
    });

    it('sorts recommended models before unknown models', async () => {
        global.fetch = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({
                models: [
                    { name: 'some-random-model:latest' },
                    { name: 'qwen2.5:3b' },
                    { name: 'llama3.2:latest' }
                ]
            })
        });
        const models = await getAvailableModels();
        expect(models[0]).toBe('llama3.2:latest');
        expect(models[1]).toBe('qwen2.5:3b');
        expect(models[models.length - 1]).toBe('some-random-model:latest');
    });

    it('returns an empty array when the response has no models field', async () => {
        global.fetch = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({})
        });
        const models = await getAvailableModels();
        expect(models).toEqual([]);
    });
});

// ─── generateReplyFromOllama ──────────────────────────────────────────────────

describe('ollamaClient – generateReplyFromOllama', () => {
    afterEach(() => {
        delete global.fetch;
    });

    it('throws with message "ollama-failed" when Ollama is unreachable', async () => {
        global.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('Connection refused'));
        await expectAsync(
            generateReplyFromOllama([{ type: 'user-bubble', text: 'hello' }])
        ).toBeRejectedWithError('ollama-failed');
    });

    it('throws with message "ollama-failed" when Ollama returns a non-ok status', async () => {
        global.fetch = jasmine.createSpy('fetch').and.resolveTo({ ok: false, status: 500 });
        await expectAsync(
            generateReplyFromOllama([{ type: 'user-bubble', text: 'hello' }])
        ).toBeRejectedWithError('ollama-failed');
    });

    it('returns the reply content on success', async () => {
        global.fetch = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({ message: { content: 'Hello from the AI!' } })
        });
        const reply = await generateReplyFromOllama([{ type: 'user-bubble', text: 'hi' }]);
        expect(reply).toBe('Hello from the AI!');
    });

    it('sends the modelOverride to Ollama instead of the default model', async () => {
        const fetchSpy = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({ message: { content: 'response' } })
        });
        global.fetch = fetchSpy;

        await generateReplyFromOllama(
            [{ type: 'user-bubble', text: 'test' }],
            null,
            'phi3:mini'
        );

        const body = JSON.parse(fetchSpy.calls.mostRecent().args[1].body);
        expect(body.model).toBe('phi3:mini');
    });

    it('prepends a system message when a valid persona is given', async () => {
        const fetchSpy = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({ message: { content: 'response' } })
        });
        global.fetch = fetchSpy;

        await generateReplyFromOllama(
            [{ type: 'user-bubble', text: 'hello' }],
            'sweetheart'
        );

        const body = JSON.parse(fetchSpy.calls.mostRecent().args[1].body);
        expect(body.messages[0].role).toBe('system');
        expect(body.messages[0].content).toContain('Miss Sweetheart');
    });

    it('throws with message "ollama-failed" when Ollama returns empty content', async () => {
        global.fetch = jasmine.createSpy('fetch').and.resolveTo({
            ok: true,
            json: async () => ({ message: { content: '   ' } })
        });
        await expectAsync(
            generateReplyFromOllama([{ type: 'user-bubble', text: 'hi' }])
        ).toBeRejectedWithError('ollama-failed');
    });
});
