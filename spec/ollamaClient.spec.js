const { generateRepliesFromOllama } = require('../utils/ollamaClient');

describe('ollamaClient', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('requests one reply per selected model', async () => {
        global.fetch = jasmine.createSpy('fetch').and.callFake(async (url, options) => {
            const payload = JSON.parse(options.body);
            return {
                ok: true,
                json: async () => ({
                    message: {
                        content: `reply for ${payload.model}`
                    }
                })
            };
        });

        const replies = await generateRepliesFromOllama([
            { type: 'user-bubble', text: 'Compare this answer' }
        ], ['llama3.2:1b', 'llama3.2:3b']);

        expect(global.fetch.calls.count()).toBe(2);
        expect(replies.map(reply => reply.model)).toEqual(['llama3.2:1b', 'llama3.2:3b']);
        expect(replies.map(reply => reply.text)).toEqual([
            'reply for llama3.2:1b',
            'reply for llama3.2:3b'
        ]);
    });
});
