const { loadPage } = require('./helpers/pageLoader');

describe('chat.html', () => {
    it('creates an initial empty draft conversation', () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
        const stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));

        expect(stored.length).toBe(1);
        expect(stored[0].messages.length).toBe(0);
        expect(win.document.getElementById('messages').children.length).toBe(1);
    });

    it('does not create another conversation when the active chat is empty', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat');

        win.createNewConversation();
        let stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        expect(stored.length).toBe(1);

        await win.addMessage('user-bubble', 'Hello world');
        win.createNewConversation();
        stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        expect(stored.length).toBe(2);

        const conversationId = stored.find(conversation => conversation.messages.length > 0).id;
        await win.togglePin(conversationId);
        stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        expect(stored.find(conversation => conversation.id === conversationId).pinned).toBeTrue();

        await win.deleteConversation(conversationId);
        stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        expect(stored.length).toBe(1);
    });

    it('renders yellow star controls and a STARRED section for pinned conversations', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat');

        await win.addMessage('user-bubble', 'Saved topic');

        let pinButton = win.document.querySelector('.history-pin-btn');
        expect(pinButton.textContent.trim()).toBe('☆');
        expect(pinButton.classList.contains('is-pinned')).toBeFalse();

        const stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        await win.togglePin(stored[0].id);

        pinButton = win.document.querySelector('.history-pin-btn');
        expect(pinButton.textContent.trim()).toBe('★');
        expect(pinButton.classList.contains('is-pinned')).toBeTrue();
        expect(win.document.querySelector('.history-separator').textContent.trim()).toBe('STARRED');
    });

    it('applies compact accessibility controls for font size, bold text, and high contrast mode', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat');

        win.document.getElementById('increase-text-btn').click();
        win.document.getElementById('bold-toggle').click();
        win.document.getElementById('high-contrast-toggle').click();
        await new Promise(resolve => win.setTimeout(resolve, 0));

        expect(win.document.getElementById('font-scale-value').textContent.trim()).toBe('110%');
        expect(win.document.body.style.getPropertyValue('--message-font-scale')).toBe('1.1');
        expect(win.document.body.classList.contains('bold-mode')).toBeTrue();
        expect(win.document.body.classList.contains('high-contrast-mode')).toBeTrue();

        const storedPreferences = JSON.parse(win.localStorage.getItem('llmChatPreferences'));
        expect(storedPreferences).toEqual({
            boldText: true,
            highContrast: true,
            fontScale: 1.1
        });
    });

    it('updates the active conversation persona, label, and URL when the persona is switched', async () => {
        const win = loadPage('chat.html', 'http://localhost/chat?persona=professional');

        await win.addMessage('user-bubble', 'Help me plan my study session');
        await win.applyPersonaSelection('sweetheart');

        const stored = JSON.parse(win.localStorage.getItem('llmChatConversations'));
        expect(stored[0].persona).toBe('sweetheart');
        expect(win.document.getElementById('persona-label').textContent.trim()).toBe('Miss Sweetheart');
        expect(win.location.search).toContain('persona=sweetheart');
    });
});
