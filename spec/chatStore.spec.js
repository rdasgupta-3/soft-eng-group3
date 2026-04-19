const {
    listConversations,
    createConversation,
    getConversation,
    updateConversation,
    deleteConversation,
    addMessage
} = require('../utils/chatStore');

// Unique email per test to avoid cross-test state pollution
let emailCounter = 0;
function uniqueEmail() {
    return `chatuser${++emailCounter}@example.com`;
}

// ─── createConversation / getConversation ──────────────────────────────────────

describe('chatStore – createConversation', () => {
    it('creates a conversation with a unique ID', () => {
        const email = uniqueEmail();
        const conv = createConversation(email, null);
        expect(typeof conv.id).toBe('string');
        expect(conv.id.length).toBeGreaterThan(0);
    });

    it('stores the persona on the conversation', () => {
        const email = uniqueEmail();
        const conv = createConversation(email, 'sweetheart');
        expect(conv.persona).toBe('sweetheart');
    });
});

describe('chatStore – listConversations', () => {
    it('returns an empty array for a new user', () => {
        const email = uniqueEmail();
        expect(listConversations(email)).toEqual([]);
    });

    it('returns all conversations created for a user', () => {
        const email = uniqueEmail();
        createConversation(email, null);
        createConversation(email, null);
        expect(listConversations(email).length).toBe(2);
    });

    it('does not mix conversations between users', () => {
        const email1 = uniqueEmail();
        const email2 = uniqueEmail();
        createConversation(email1, null);
        expect(listConversations(email2).length).toBe(0);
    });
});

describe('chatStore – getConversation', () => {
    it('returns the correct conversation by ID', () => {
        const email = uniqueEmail();
        const conv = createConversation(email, 'professional');
        const found = getConversation(email, conv.id);
        expect(found).toBeTruthy();
        expect(found.id).toBe(conv.id);
    });

    it('returns null for an unknown conversation ID', () => {
        const email = uniqueEmail();
        expect(getConversation(email, 'nonexistent-id')).toBeNull();
    });
});

// ─── addMessage ────────────────────────────────────────────────────────────────

describe('chatStore – addMessage', () => {
    it('appends a user message to the conversation', () => {
        const email = uniqueEmail();
        const conv = createConversation(email, null);
        addMessage(email, conv.id, 'user-bubble', 'Hello there');
        const updated = getConversation(email, conv.id);
        expect(updated.messages.length).toBe(1);
        expect(updated.messages[0].text).toBe('Hello there');
        expect(updated.messages[0].type).toBe('user-bubble');
    });

    it('stores the model name on AI messages when provided', () => {
        const email = uniqueEmail();
        const conv = createConversation(email, null);
        addMessage(email, conv.id, 'ai-bubble', 'Response text', 'llama3.2:latest');
        const msg = getConversation(email, conv.id).messages[0];
        expect(msg.model).toBe('llama3.2:latest');
    });

    it('does not store a model field when model is not provided', () => {
        const email = uniqueEmail();
        const conv = createConversation(email, null);
        addMessage(email, conv.id, 'user-bubble', 'No model here');
        const msg = getConversation(email, conv.id).messages[0];
        expect(msg.model).toBeUndefined();
    });

    it('auto-titles the conversation from the first user message', () => {
        const email = uniqueEmail();
        const conv = createConversation(email, null);
        addMessage(email, conv.id, 'user-bubble', 'What is the weather like?');
        const updated = getConversation(email, conv.id);
        expect(updated.title).toBe('What is the weather like?');
    });

    it('truncates the auto-title to 28 characters with ellipsis', () => {
        const email = uniqueEmail();
        const conv = createConversation(email, null);
        addMessage(email, conv.id, 'user-bubble', 'This is a very long message that exceeds twenty-eight characters');
        const updated = getConversation(email, conv.id);
        // slice(0, 28) of the input ends with a space before 't'
        expect(updated.title).toBe('This is a very long message ...');
        expect(updated.title.length).toBe(31); // 28 chars + '...'
    });

    it('does not overwrite an already set title on subsequent messages', () => {
        const email = uniqueEmail();
        const conv = createConversation(email, null);
        addMessage(email, conv.id, 'user-bubble', 'First message');
        addMessage(email, conv.id, 'user-bubble', 'Second message');
        const updated = getConversation(email, conv.id);
        expect(updated.title).toBe('First message');
    });

    it('returns an error for an unknown conversation ID', () => {
        const email = uniqueEmail();
        const result = addMessage(email, 'bad-id', 'user-bubble', 'text');
        expect(result.error).toBe('not-found');
    });

    it('returns an error for empty text', () => {
        const email = uniqueEmail();
        const conv = createConversation(email, null);
        const result = addMessage(email, conv.id, 'user-bubble', '   ');
        expect(result.error).toBe('invalid-text');
    });
});

// ─── updateConversation ────────────────────────────────────────────────────────

describe('chatStore – updateConversation', () => {
    it('pins a conversation', () => {
        const email = uniqueEmail();
        const conv = createConversation(email, null);
        updateConversation(email, conv.id, { pinned: true });
        expect(getConversation(email, conv.id).pinned).toBeTrue();
    });

    it('updates the title', () => {
        const email = uniqueEmail();
        const conv = createConversation(email, null);
        updateConversation(email, conv.id, { title: 'My Renamed Chat' });
        expect(getConversation(email, conv.id).title).toBe('My Renamed Chat');
    });

    it('returns null for an unknown conversation ID', () => {
        const email = uniqueEmail();
        const result = updateConversation(email, 'no-such-id', { pinned: true });
        expect(result).toBeNull();
    });
});

// ─── deleteConversation ────────────────────────────────────────────────────────

describe('chatStore – deleteConversation', () => {
    it('removes the conversation from the list', () => {
        const email = uniqueEmail();
        const conv = createConversation(email, null);
        deleteConversation(email, conv.id);
        expect(getConversation(email, conv.id)).toBeNull();
    });

    it('returns the remaining conversations after deletion', () => {
        const email = uniqueEmail();
        const c1 = createConversation(email, null);
        const c2 = createConversation(email, null);
        const remaining = deleteConversation(email, c1.id);
        expect(Array.isArray(remaining)).toBeTrue();
        expect(remaining.length).toBe(1);
        expect(remaining[0].id).toBe(c2.id);
    });

    it('returns null for an unknown conversation ID', () => {
        const email = uniqueEmail();
        expect(deleteConversation(email, 'ghost-id')).toBeNull();
    });
});
