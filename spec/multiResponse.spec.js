const { loadPage } = require('./helpers/pageLoader');

function makeFetch(overrides = {}) {
    return (url, opts) => {
        if (url.includes('ollama-status'))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
        if (url.includes('multi-reply'))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({
                phi: "Phi response", gemma: "Gemma response", deepseek: "DeepSeek response"
            })});
        if (url.includes('ai-reply'))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ aiReply: "Hello!", model: "phi" }) });
        if (url.includes('conversations'))
            return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ conversations: [] }) });
        for (const [key, val] of Object.entries(overrides)) {
            if (url.includes(key)) return val(url, opts);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    };
}

describe('Multi-LLM Responses', () => {
    let win;

    beforeEach(() => {
        win = loadPage('chat.html', 'http://localhost/chat', makeFetch());

        win.animateIntoElement = () => Promise.resolve();
    });

    it('returns three model responses', async () => {
    const responses = await win.getResponsesFromModels("Explain kinetic energy");
    console.log('responses:', responses);
    expect(responses).toBeDefined();
    expect(responses.phi).toBeDefined();
    expect(responses.deepseek).toBeDefined();
    expect(responses.gemma).toBeDefined();
});

    it('allows selecting a preferred model', () => {
        win.setPreferredModel('phi');
        expect(win.getPreferredModel()).toBe('phi');

        win.setPreferredModel('deepseek');
        expect(win.getPreferredModel()).toBe('deepseek');
    });

    it('uses only the preferred model for future replies', async () => {
        win.setPreferredModel('phi');

        win.fetch = (url, opts) => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ aiReply: "Hello!", model: "phi" })
        });

        const reply = await win.generateReply("Hello");
        expect(reply.model).toBe('phi');
    });
});