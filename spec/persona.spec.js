const { loadPage } = require('./helpers/pageLoader');

function makeFetch(overrides = {}) {
    return (url, opts) => {
        if (url.includes('ollama-status'))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
        
        for (const [key, val] of Object.entries(overrides)) {
            if (url.includes(key)) return val(url, opts);
        }
        if (url.includes('multi-reply'))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({
                phi: "ok", gemma: "ok", deepseek: "ok"
            })});
        if (url.includes('ai-reply'))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ aiReply: "Hello!", model: "phi" }) });
        if (url.includes('conversations'))
            return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ conversations: [] }) });
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    };
}

describe("Persona Selection", () => {
    let win;

    beforeEach(() => {
        win = loadPage("chat.html", "http://localhost/chat?persona=silly", makeFetch());
    });

    it("extracts persona from URL", () => {
        expect(win.getSelectedPersona()).toBe("silly");
    });

    it("sends persona in multi-reply request", async () => {
        const calls = [];
        win = loadPage("chat.html", "http://localhost/chat?persona=professional", makeFetch({
            'multi-reply': (url, opts) => {
                calls.push({ url, opts });
                console.log('multi-reply was called!', url);
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ phi: "ok", gemma: "ok", deepseek: "ok" })
                });
            }
        }));

        win.animateIntoElement = () => Promise.resolve();
        await win.getMultiModelReplies("123", "Hello");
        console.log('calls after getMultiModelReplies:', calls.length);

        const multiCall = calls.find(c => c.url.includes('multi-reply'));
        expect(multiCall).toBeDefined();
        const body = JSON.parse(multiCall.opts.body);
        expect(body.persona).toBe("professional");
    });

    it("shows persona name in typing bubble", () => {
        win = loadPage("chat.html", "http://localhost/chat?persona=sweetheart", makeFetch());

        const bubbleId = win.addTypingBubble("Sweetheart");
        const bubble = win.document.getElementById(bubbleId);

        expect(bubble).not.toBeNull();
        expect(bubble.textContent.toLowerCase()).toContain("sweetheart");
    });
});