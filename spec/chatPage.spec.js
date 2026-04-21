const { loadPage } = require('./helpers/pageLoader');

describe('chat.html', () => {
    it('creates an initial empty conversation', () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
        const stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        const messagesEl = win.document.getElementById('messages');

        expect(stored.length).toBe(1);
        expect(stored[0].messages.length).toBe(0);
        expect(stored[0].selectedModels).toEqual(['llama3.2:1b', 'llama3.2:3b']);
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

    it('persists selected models for the active conversation', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
        const modelInput = win.document.getElementById('model-selection');

        modelInput.value = 'llama3.2:1b, mistral, llama3.2:1b';
        await win.saveModelSelection();

        const stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        expect(stored[0].selectedModels).toEqual(['llama3.2:1b', 'mistral']);
    });

    it('creates one local AI reply per selected model', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
        win.document.getElementById('model-selection').value = 'llama3.2:1b, llama3.2:3b';
        await win.saveModelSelection();

        win.document.getElementById('userInput').value = 'Compare answers';
        await win.sendMessage();
        await new Promise(resolve => setTimeout(resolve, 900));

        const aiBubbles = [...win.document.querySelectorAll('#messages .ai-bubble')];
        const badges = aiBubbles.map(node => {
            const badge = node.querySelector('.model-badge');
            const text = badge ? (badge.textContent || badge.innerText || '') : '';
            return text.trim();
        });

        expect(aiBubbles.length).toBe(2);
        expect(badges).toEqual(['llama3.2:1b', 'llama3.2:3b']);
    });
});
