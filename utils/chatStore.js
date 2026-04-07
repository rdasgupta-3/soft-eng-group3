const chatByUser = new Map();

function buildConversation() {
    const now = Date.now();
    return {
        id: `conv-${now}-${Math.floor(Math.random() * 10000)}`,
        title: 'New Conversation',
        pinned: false,
        updatedAt: now,
        messages: []
    };
}

function getUserConversations(email) {
    if (!chatByUser.has(email)) {
        chatByUser.set(email, []);
    }

    return chatByUser.get(email);
}

function listConversations(email) {
    return getUserConversations(email);
}

function createConversation(email) {
    const conversations = getUserConversations(email);
    const created = buildConversation();
    conversations.push(created);
    return created;
}

function getConversation(email, conversationId) {
    const conversations = getUserConversations(email);
    return conversations.find(c => c.id === conversationId) || null;
}

function updateConversation(email, conversationId, updates) {
    const conversations = getUserConversations(email);
    const conv = conversations.find(c => c.id === conversationId);

    if (!conv) {
        return null;
    }

    if (typeof updates.pinned === 'boolean') {
        conv.pinned = updates.pinned;
    }

    if (typeof updates.title === 'string' && updates.title.trim()) {
        conv.title = updates.title.trim();
    }

    conv.updatedAt = Date.now();
    return conv;
}

function deleteConversation(email, conversationId) {
    const conversations = getUserConversations(email);
    const exists = conversations.some(c => c.id === conversationId);

    if (!exists) {
        return null;
    }

    const updated = conversations.filter(c => c.id !== conversationId);
    chatByUser.set(email, updated);
    return updated;
}

function addMessage(email, conversationId, type, text) {
    const conversations = getUserConversations(email);
    const conv = conversations.find(c => c.id === conversationId);

    if (!conv) {
        return { error: 'not-found' };
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
        return { error: 'invalid-text' };
    }

    const validType = (type === 'user-bubble' || type === 'ai-bubble') ? type : 'user-bubble';
    const cleanText = text.trim();

    conv.messages.push({
        type: validType,
        text: cleanText,
        at: Date.now()
    });

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
