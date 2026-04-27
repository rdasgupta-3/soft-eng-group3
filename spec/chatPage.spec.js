const { loadPage } = require('./helpers/pageLoader');

describe('chat.html', () => {
    it('creates an initial empty conversation', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
        await new Promise(resolve => setTimeout(resolve, 0));
        const stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        const messagesEl = win.document.getElementById('messages');

        expect(stored.length).toBe(1);
        expect(stored[0].messages.length).toBe(0);
        expect(stored[0].selectedModelIds).toEqual([
            'ollama-llama3.2-1b',
            'openai-gpt-4o-mini',
            'google-gemini-2.0-flash'
        ]);
        expect(messagesEl.children.length).toBe(0);
    });

    it('does not create another conversation when active chat is empty', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
        await new Promise(resolve => setTimeout(resolve, 0));
        win.confirm = () => true;

        win.createNewConversation();
        let stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        expect(stored.length).toBe(1);

        await win.addMessage('user-bubble', 'Hello world');
        win.createNewConversation();
        stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        expect(stored.length).toBe(2);

        const idToPin = stored[0].id;
        win.togglePin(idToPin);
        win.renderConversationList();

        stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        const pinnedConversation = stored.find(c => c.id === idToPin);
        expect(pinnedConversation.pinned).toBeTrue();

        win.deleteConversation(idToPin);
        stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        expect(stored.length).toBe(1);
    });

    it('renders selected model pills without the latest-response panel', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat?models=ollama-llama3.2-1b,anthropic-claude-3-5-haiku');
        await new Promise(resolve => setTimeout(resolve, 0));
        const selectedPills = win.document.querySelectorAll('#selected-models .selected-model-pill');

        expect(win.document.querySelector('.latest-responses-wrap')).toBeNull();
        expect(selectedPills.length).toBe(2);
        expect(selectedPills[0].textContent).toContain('Local Llama 3.2 1B');
        expect(selectedPills[1].textContent).toContain('Claude 3.5 Haiku');
    });
});
