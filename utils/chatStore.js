const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname,'..', 'data');
const CONVO_FILE = path.join(dataDir,'conversations.json');

function defaultSelectedModels() {
    return ['llama3.2:1b', 'llama3.2:3b'];
}

function normalizeSelectedModels(models) {
    if (typeof models === 'string') {
        models = models.split(',');
    }

    if (!Array.isArray(models)) {
        return defaultSelectedModels();
    }

    const cleaned = [...new Set(
        models
            .map(model => typeof model === 'string' ? model.trim() : '')
            .filter(Boolean)
    )];

    return cleaned.length ? cleaned : defaultSelectedModels();
}

function normalizeConversation(conv = {}) {
    return {
        id: conv.id,
        title: typeof conv.title === 'string' && conv.title.trim() ? conv.title.trim() : 'New Conversation',
        pinned: Boolean(conv.pinned),
        updatedAt: typeof conv.updatedAt === 'number' ? conv.updatedAt : Date.now(),
        selectedModels: normalizeSelectedModels(conv.selectedModels),
        messages: Array.isArray(conv.messages)
            ? conv.messages.map(msg => ({
                type: msg && typeof msg.type === 'string' ? msg.type : 'user-bubble',
                text: msg && typeof msg.text === 'string' ? msg.text : '',
                at: msg && typeof msg.at === 'number' ? msg.at : Date.now(),
                ...(msg && msg.meta && typeof msg.meta === 'object' ? { meta: msg.meta } : {})
            }))
            : []
    };
}

function load(){
    if(!fs.existsSync(CONVO_FILE)) return {};
    const parsed = JSON.parse(fs.readFileSync(CONVO_FILE, 'utf8'));

    Object.keys(parsed).forEach(email => {
        parsed[email] = Array.isArray(parsed[email])
            ? parsed[email].map(normalizeConversation)
            : [];
    });

    return parsed;
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
        selectedModels: defaultSelectedModels(),
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

    if (typeof updates.selectedModels === 'string' || Array.isArray(updates.selectedModels)) {
        conv.selectedModels = normalizeSelectedModels(updates.selectedModels);
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

function appendMessage(conv, type, text, meta = undefined) {
    const validType = (type === 'user-bubble' || type === 'ai-bubble') ? type : 'user-bubble';
    const cleanText = text.trim();

    const nextMessage = {
        type: validType,
        text: cleanText,
        at: Date.now()
    };

    if (meta && typeof meta === 'object' && Object.keys(meta).length) {
        nextMessage.meta = meta;
    }

    conv.messages.push(nextMessage);

    if (conv.title === 'New Conversation' && validType === 'user-bubble') {
        conv.title = cleanText.length > 28 ? `${cleanText.slice(0, 28)}...` : cleanText;
    }
}

function addMessage(email, conversationId, type, text, meta) {
    const data = load();
    const conv = data[email]?.find(c => c.id === conversationId);

    if (!conv) {
        return { error: 'not-found' };
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
        return { error: 'invalid-text' };
    }

    appendMessage(conv, type, text, meta);

    conv.updatedAt = Date.now();
    save(data);
    return { conversation: conv };
}

function addMessages(email, conversationId, messages) {
    const data = load();
    const conv = data[email]?.find(c => c.id === conversationId);

    if (!conv) {
        return { error: 'not-found' };
    }

    if (!Array.isArray(messages) || !messages.length) {
        return { error: 'invalid-messages' };
    }

    for (const message of messages) {
        if (!message || typeof message.text !== 'string' || !message.text.trim()) {
            return { error: 'invalid-text' };
        }
    }

    messages.forEach(message => appendMessage(conv, message.type, message.text, message.meta));

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
    addMessage,
    addMessages,
    normalizeSelectedModels
};
