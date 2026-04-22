const { readJson, writeJson } = require('./fileStore');

const CONVERSATIONS_FILE = 'conversations.json';

function buildConversation(persona = 'professional') {
    const now = Date.now();

    return {
        id: `conv-${now}-${Math.floor(Math.random() * 10000)}`,
        title: 'New Conversation',
        persona,
        pinned: false,
        updatedAt: now,
        messages: []
    };
}

function getUserConversations(data, email) {
    if (!Array.isArray(data[email])) {
        data[email] = [];
    }

    return data[email];
}

function listConversations(email) {
    const data = readJson(CONVERSATIONS_FILE, {});
    return getUserConversations(data, email);
}

function createConversation(email, persona = 'professional') {
    const data = readJson(CONVERSATIONS_FILE, {});
    const conversations = getUserConversations(data, email);
    const conversation = buildConversation(persona);

    conversations.push(conversation);
    writeJson(CONVERSATIONS_FILE, data);

    return conversation;
}

function getConversation(email, conversationId) {
    const data = readJson(CONVERSATIONS_FILE, {});
    return getUserConversations(data, email).find(conversation => conversation.id === conversationId) || null;
}

function updateConversation(email, conversationId, updates = {}) {
    const data = readJson(CONVERSATIONS_FILE, {});
    const conversation = getUserConversations(data, email).find(item => item.id === conversationId);

    if (!conversation) {
        return null;
    }

    if (typeof updates.pinned === 'boolean') {
        conversation.pinned = updates.pinned;
    }

    if (typeof updates.title === 'string' && updates.title.trim()) {
        conversation.title = updates.title.trim();
    }

    if (typeof updates.persona === 'string' && updates.persona.trim()) {
        conversation.persona = updates.persona.trim();
    }

    conversation.updatedAt = Date.now();
    writeJson(CONVERSATIONS_FILE, data);
    return conversation;
}

function deleteConversation(email, conversationId) {
    const data = readJson(CONVERSATIONS_FILE, {});
    const conversations = getUserConversations(data, email);
    const exists = conversations.some(conversation => conversation.id === conversationId);

    if (!exists) {
        return null;
    }

    data[email] = conversations.filter(conversation => conversation.id !== conversationId);
    writeJson(CONVERSATIONS_FILE, data);
    return data[email];
}

function buildStoredMessage(type, payload) {
    const at = Date.now();

    if (type === 'model-group') {
        return {
            type,
            responses: payload.responses.map(response => ({
                providerId: response.providerId,
                providerLabel: response.providerLabel,
                mode: response.mode,
                text: response.text
            })),
            at
        };
    }

    return {
        type,
        text: payload.text.trim(),
        at
    };
}

function addMessage(email, conversationId, type, payload) {
    const data = readJson(CONVERSATIONS_FILE, {});
    const conversation = getUserConversations(data, email).find(item => item.id === conversationId);

    if (!conversation) {
        return { error: 'not-found' };
    }

    if (type === 'model-group') {
        if (!payload || !Array.isArray(payload.responses) || payload.responses.length === 0) {
            return { error: 'invalid-responses' };
        }
    } else {
        if (!payload || typeof payload.text !== 'string' || !payload.text.trim()) {
            return { error: 'invalid-text' };
        }
    }

    const validType = type === 'user-bubble' || type === 'model-group' ? type : 'user-bubble';
    const message = buildStoredMessage(validType, payload);
    conversation.messages.push(message);

    if (conversation.title === 'New Conversation' && validType === 'user-bubble') {
        conversation.title = message.text.length > 28 ? `${message.text.slice(0, 28)}...` : message.text;
    }

    conversation.updatedAt = Date.now();
    writeJson(CONVERSATIONS_FILE, data);
    return { conversation };
}

module.exports = {
    listConversations,
    createConversation,
    getConversation,
    updateConversation,
    deleteConversation,
    addMessage
};
