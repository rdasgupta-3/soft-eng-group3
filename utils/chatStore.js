// conversations stored in memory: { [email]: [ conversation, ... ] }
const store = {};

function buildConversation(persona) {
    const now = Date.now();
    return {
        id: `conv-${now}-${Math.floor(Math.random() * 10000)}`,
        title: 'New Conversation',
        pinned: false,
        persona: persona || null,
        updatedAt: now,
        messages: []
    };
}

function getUserConversations(email) {
    if (!store[email]) store[email] = [];
    return store[email];
}

function listConversations(email) {
    return getUserConversations(email);
}

function createConversation(email, persona) {
    const list = getUserConversations(email);
    const created = buildConversation(persona);
    list.push(created);
    return created;
}

function getConversation(email, conversationId) {
    return getUserConversations(email).find(c => c.id === conversationId) || null;
}

function updateConversation(email, conversationId, updates) {
    const conv = getConversation(email, conversationId);
    if (!conv) return null;

    if (typeof updates.pinned === 'boolean') conv.pinned = updates.pinned;
    if (typeof updates.title === 'string' && updates.title.trim()) conv.title = updates.title.trim();

    conv.updatedAt = Date.now();
    return conv;
}

function deleteConversation(email, conversationId) {
    const list = getUserConversations(email);
    const exists = list.some(c => c.id === conversationId);
    if (!exists) return null;

    store[email] = list.filter(c => c.id !== conversationId);
    return store[email];
}

function addMessage(email, conversationId, type, text, model) {
    const conv = getConversation(email, conversationId);
    if (!conv) return { error: 'not-found' };

    if (!text || typeof text !== 'string' || !text.trim()) return { error: 'invalid-text' };

    const validType = (type === 'user-bubble' || type === 'ai-bubble') ? type : 'user-bubble';
    const cleanText = text.trim();

    const msg = { type: validType, text: cleanText, at: Date.now() };
    if (model && typeof model === 'string') msg.model = model;

    conv.messages.push(msg);

    if (conv.title === 'New Conversation' && validType === 'user-bubble') {
        conv.title = cleanText.length > 28 ? `${cleanText.slice(0, 28)}...` : cleanText;
    }

    conv.updatedAt = Date.now();
    return { conversation: conv };
}

module.exports = {
    listConversations,
    createConversation,
    getConversation,
    updateConversation,
    deleteConversation,
    addMessage
};

