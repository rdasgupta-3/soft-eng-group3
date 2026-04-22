const { resetTestData } = require('./helpers/testData');
const {
    createConversation,
    addMessage,
    listConversations,
    updateConversation
} = require('../utils/chatStore');

describe('chatStore', () => {
    beforeEach(() => {
        resetTestData();
    });

    it('creates conversations and stores user prompts with model-group responses', () => {
        const conversation = createConversation('student@example.com', 'professional');
        addMessage('student@example.com', conversation.id, 'user-bubble', { text: 'How do I study testing?' });
        addMessage('student@example.com', conversation.id, 'model-group', {
            responses: [
                { providerId: 'openai', providerLabel: 'GPT', mode: 'demo-mode', text: 'Use a checklist.' },
                { providerId: 'gemini', providerLabel: 'Gemini', mode: 'demo-mode', text: 'Compare strategies.' },
                { providerId: 'claude', providerLabel: 'Claude', mode: 'demo-mode', text: 'Start with one habit.' }
            ]
        });

        const stored = listConversations('student@example.com');
        expect(stored.length).toBe(1);
        expect(stored[0].messages.length).toBe(2);
        expect(stored[0].title).toContain('How do I study testing?'.slice(0, 28));
    });

    it('updates pinned state for an existing conversation', () => {
        const conversation = createConversation('student@example.com', 'professional');
        const updated = updateConversation('student@example.com', conversation.id, { pinned: true });

        expect(updated.pinned).toBeTrue();
    });

    it('persists pinned conversations and persona metadata across repeated reads', () => {
        const conversation = createConversation('student@example.com', 'silly');
        addMessage('student@example.com', conversation.id, 'user-bubble', { text: 'Persistent planning note' });
        updateConversation('student@example.com', conversation.id, {
            pinned: true,
            persona: 'sweetheart'
        });

        const firstRead = listConversations('student@example.com');
        const secondRead = listConversations('student@example.com');

        expect(firstRead[0].pinned).toBeTrue();
        expect(secondRead[0].persona).toBe('sweetheart');
        expect(secondRead[0].title).toBe('Persistent planning note');
    });
});
