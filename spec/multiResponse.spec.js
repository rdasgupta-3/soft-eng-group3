const { loadPage } = require('./helpers/pageLoader');

describe('Multi-LLM Responses', () => {

    let win;

    beforeEach(() => {
        win = loadPage('chat.html', 'http://localhost/chat');
    });

    it('returns three model responses', async () => {
        const responses = await win.getResponsesFromModels("Explain kinetic energy");

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

        const reply = await win.generateReply("Hello");

        expect(reply.model).toBe('phi');
    });

});