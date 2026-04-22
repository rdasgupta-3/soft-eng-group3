const { loadPage } = require('./helpers/pageLoader');

describe('chat.html', () => {
    it('creates an initial empty conversation', () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
        const stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        const messagesEl = win.document.getElementById('messages');

        expect(stored.length).toBe(1);
        expect(stored[0].messages.length).toBe(0);
        expect(messagesEl.children.length).toBe(0);
    });

    it('does not create another conversation when active chat is empty', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
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
});
