const {
    checkOllamaStatus,
    warmupOllama,
    generateReplyFromOllama
} = require('../utils/ollamaClient');

describe('ollamaClient', () => {
    beforeEach(() => {
        process.env.TEST_MODE = '1';
    });

    afterEach(() => {
        delete process.env.TEST_MODE;
    });

    it('reports Ollama as online and warms up successfully in test mode', async () => {
        await expectAsync(checkOllamaStatus()).toBeResolvedTo(true);
        await expectAsync(warmupOllama()).toBeResolvedTo(true);
    });

    it('returns persona-specific mock replies in test mode', async () => {
        const text = await generateReplyFromOllama({
            provider: { id: 'claude', label: 'Claude' },
            prompt: 'Help me stay focused',
            persona: 'silly',
            conversationMessages: []
        });

        expect(text).toContain('Lord Silly The Ninth');
        expect(text).toContain('Help me stay focused');
    });
});
