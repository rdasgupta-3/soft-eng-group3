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

// ─── getPagePersona ────────────────────────────────────────────────────────────

describe('chat.html – getPagePersona', () => {
    it('returns null when no persona query param is present', () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
        expect(win.getPagePersona()).toBeNull();
    });

    it('returns sweetheart when ?persona=sweetheart', () => {
        const win = loadPage('chat.html', 'http://localhost/chat?persona=sweetheart');
        expect(win.getPagePersona()).toBe('sweetheart');
    });
});

// ─── initHeaderPersonaBadge ────────────────────────────────────────────────────

describe('chat.html – initHeaderPersonaBadge', () => {
    it('renders a badge in the header for a valid persona', () => {
        const win = loadPage('chat.html', 'http://localhost/chat?persona=sweetheart');
        win.initHeaderPersonaBadge();
        const badge = win.document.querySelector('#chat-persona-badge .persona-badge');
        expect(badge).toBeTruthy();
        expect(badge.textContent).toContain('Miss Sweetheart');
    });

    it('renders nothing when no persona is in the URL', () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
        win.initHeaderPersonaBadge();
        const badge = win.document.querySelector('#chat-persona-badge .persona-badge');
        expect(badge).toBeNull();
    });

    it('renders nothing for an unrecognised persona value', () => {
        const win = loadPage('chat.html', 'http://localhost/chat?persona=unknown');
        win.initHeaderPersonaBadge();
        const badge = win.document.querySelector('#chat-persona-badge .persona-badge');
        expect(badge).toBeNull();
    });
});

// ─── getSelectedModels ─────────────────────────────────────────────────────────

describe('chat.html – getSelectedModels', () => {
    it('returns an empty array when no checkboxes exist', () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
        expect(win.getSelectedModels()).toEqual([]);
    });

    it('returns the values of checked checkboxes', () => {
        const win = loadPage('chat.html', 'http://localhost/chat');
        const container = win.document.getElementById('model-checkboxes');

        // Manually add two checkboxes: one checked, one not
        const cb1 = win.document.createElement('input');
        cb1.type = 'checkbox';
        cb1.value = 'llama3.2:latest';
        cb1.checked = true;
        container.appendChild(cb1);

        const cb2 = win.document.createElement('input');
        cb2.type = 'checkbox';
        cb2.value = 'gemma3:1b';
        cb2.checked = false;
        container.appendChild(cb2);

        expect(win.getSelectedModels()).toEqual(['llama3.2:latest']);
    });
});

// ─── model selector — loadAvailableModels ─────────────────────────────────────
// Note: loadAvailableModels() guards on useServerApi which is false in JSDOM
// (JSDOM's user-agent contains 'jsdom'). The underlying getAvailableModels and
// the model checkbox rendering logic are covered by ollamaClient.spec.js and
// the getSelectedModels tests above.
