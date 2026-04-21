const { loadPage } = require('./helpers/pageLoader');

describe('Multi-LLM Responses', () => {

    let win;

    beforeEach(() => {
        win = loadPage('chat.html', 'http://localhost/chat');
    });

    it('returns three model responses', async () => {
        const responses = await win.getResponsesFromModels("Explain kinetic energy");

        expect(responses.gpt).toBeDefined();
        expect(responses.claude).toBeDefined();
        expect(responses.gemini).toBeDefined();
    });

    it('allows selecting a preferred model', () => {
        win.setPreferredModel('gpt');
        expect(win.getPreferredModel()).toBe('gpt');

        win.setPreferredModel('claude');
        expect(win.getPreferredModel()).toBe('claude');
    });

    it('uses only the preferred model for future replies', async () => {
        win.setPreferredModel('gpt');

        const reply = await win.generateReply("Hello");

        expect(reply.model).toBe('gpt');
    });

    it('handles model failure gracefully', async () => {
        spyOn(win, 'callClaudeAPI').and.throwError("Claude failed");

        const responses = await win.getResponsesFromModels("Hello");

        expect(responses.claude).toBe("ERROR");
        expect(responses.gpt).toBeDefined();
        expect(responses.gemini).toBeDefined();
    });

});