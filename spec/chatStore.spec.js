const fs = require('fs');
const path = require('path');
const {
    createConversation,
    updateConversation,
    addMessages,
    getConversation
} = require('../utils/chatStore');

describe('chatStore', () => {
    const dataFile = path.join(__dirname, '..', 'data', 'conversations.json');
    let originalData;

    beforeEach(() => {
        originalData = fs.existsSync(dataFile) ? fs.readFileSync(dataFile, 'utf8') : null;
        fs.writeFileSync(dataFile, '{}');
    });

    afterEach(() => {
        if (originalData === null) {
            fs.unlinkSync(dataFile);
            return;
        }

        fs.writeFileSync(dataFile, originalData);
    });

    it('stores normalized selected models on a conversation', () => {
        const created = createConversation('student@example.com');
        const updated = updateConversation('student@example.com', created.id, {
            selectedModels: ['llama3.2:1b', ' mistral ', 'llama3.2:1b']
        });

        expect(updated.selectedModels).toEqual(['llama3.2:1b', 'mistral']);
    });

    it('stores multiple AI replies with model metadata', () => {
        const created = createConversation('student@example.com');
        addMessages('student@example.com', created.id, [
            {
                type: 'ai-bubble',
                text: 'Reply from model A',
                meta: { provider: 'ollama', model: 'llama3.2:1b' }
            },
            {
                type: 'ai-bubble',
                text: 'Reply from model B',
                meta: { provider: 'ollama', model: 'llama3.2:3b' }
            }
        ]);

        const stored = getConversation('student@example.com', created.id);
        expect(stored.messages.length).toBe(2);
        expect(stored.messages[0].meta.model).toBe('llama3.2:1b');
        expect(stored.messages[1].meta.model).toBe('llama3.2:3b');
    });
});
