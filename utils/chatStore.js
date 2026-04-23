const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname,'..', 'data');
const CONVO_FILE = path.join(dataDir,'conversations.json');

function load(){
    if(!fs.existsSync(CONVO_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONVO_FILE));
}

function save(data){
    fs.writeFileSync(CONVO_FILE, JSON.stringify(data, null, 2));
}

function buildConversation() {
    const now = Date.now();
    return {
        id: `conv-${now}-${Math.floor(Math.random() * 10000)}`,
        title: 'New Conversation',
        pinned: false,
        updatedAt: now,
        selectedModel: null,
        messages: []
    };
}

function getUserConversations(email) {
    const data = load();
    if(!data[email]){
        data[email] = [];
        save(data);
    }
    return data[email];
}

function listConversations(email) {
    return getUserConversations(email);
}

function createConversation(email) {
    const data = load();
    if(!data[email]) data[email] = [];

    const created = buildConversation();
    data[email].push(created);

    save(data);
    return created;
}

function getConversation(email, conversationId) {
    const data = load();
    return data[email]?.find(c => c.id === conversationId) || null;
}

function updateConversation(email, conversationId, updates) {
    const data = load();
    const conv = data[email]?.find(c => c.id === conversationId);

    if (!conv) {
        return null;
    }

    if (typeof updates.pinned === 'boolean') {
        conv.pinned = updates.pinned;
    }

    if (typeof updates.title === 'string' && updates.title.trim()) {
        conv.title = updates.title.trim();
    }

    if (typeof updates.selectedModel === 'string' && updates.selectedModel) {
        conv.selectedModel = updates.selectedModel;
    }

    conv.updatedAt = Date.now();
    save(data);
    return conv;
}

function deleteConversation(email, conversationId) {
    const data = load();
    if(!data[email]) return null;

    const exists = data[email].some(c => c.id === conversationId);
    if (!exists) {
        return null;
    }

    data[email] = data[email].filter(c=> c.id !== conversationId);
    save(data);

    return data[email];
}

function addMessage(email, conversationId, type, text) {
    const data = load();
    const conv = data[email]?.find(c => c.id === conversationId);

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
    save(data);
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
