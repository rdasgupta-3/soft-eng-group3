const express = require('express');

const { requireAuth } = require('../utils/requireAuth');
const { getPreferences, savePreferences } = require('../utils/preferencesStore');
const {
    listConversations,
    createConversation,
    getConversation,
    updateConversation,
    deleteConversation,
    addMessage
} = require('../utils/chatStore');
const { generateModelResponses } = require('../utils/multiModelService');
const { checkOllamaStatus, warmupOllama } = require('../utils/ollamaClient');

const router = express.Router();

router.get('/ollama-status', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const ok = await checkOllamaStatus();
    return res.json({ ok });
});

router.get('/warmup', async (req, res) => {
    const warmed = await warmupOllama();
    return res.json({ warmed });
});

router.use(requireAuth);

router.get('/preferences', (req, res) => {
    return res.json({ preferences: getPreferences(req.session.email) });
});

router.put('/preferences', (req, res) => {
    const preferences = savePreferences(req.session.email, req.body.preferences || {});
    return res.json({ success: true, preferences });
});

router.get('/conversations', (req, res) => {
    return res.json({ conversations: listConversations(req.session.email) });
});

router.post('/conversations', (req, res) => {
    const persona = typeof req.body.persona === 'string' ? req.body.persona.trim() : 'professional';
    const conversation = createConversation(req.session.email, persona);
    return res.status(201).json({ conversation });
});

router.patch('/conversations/:conversationId', (req, res) => {
    const { conversationId } = req.params;
    const conversation = updateConversation(req.session.email, conversationId, req.body || {});

    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found.' });
    }

    return res.json({ conversation });
});

router.delete('/conversations/:conversationId', (req, res) => {
    const { conversationId } = req.params;
    const conversations = deleteConversation(req.session.email, conversationId);

    if (!conversations) {
        return res.status(404).json({ error: 'Conversation not found.' });
    }

    return res.json({ success: true, conversations });
});

router.post('/conversations/:conversationId/messages', (req, res) => {
    const { conversationId } = req.params;
    const type = req.body.type === 'user-bubble' ? 'user-bubble' : 'user-bubble';
    const text = typeof req.body.text === 'string' ? req.body.text : '';
    const result = addMessage(req.session.email, conversationId, type, { text });

    if (result.error === 'not-found') {
        return res.status(404).json({ error: 'Conversation not found.' });
    }

    if (result.error === 'invalid-text') {
        return res.status(400).json({ error: 'Message text is required.' });
    }

    return res.status(201).json({ conversation: result.conversation });
});

router.post('/conversations/:conversationId/ai-reply', async (req, res) => {
    const { conversationId } = req.params;
    const conversation = getConversation(req.session.email, conversationId);

    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found.' });
    }

    const latestUserMessage = [...conversation.messages].reverse().find(message => message.type === 'user-bubble');
    if (!latestUserMessage) {
        return res.status(400).json({ error: 'No user message found to respond to.' });
    }

    const persona = typeof req.body.persona === 'string' && req.body.persona.trim()
        ? req.body.persona.trim()
        : conversation.persona || 'professional';

    updateConversation(req.session.email, conversationId, { persona });

    const responses = await generateModelResponses(
        req.session.email,
        latestUserMessage.text,
        persona,
        conversation.messages
    );

    const result = addMessage(req.session.email, conversationId, 'model-group', { responses });

    if (result.error === 'not-found') {
        return res.status(404).json({ error: 'Conversation not found.' });
    }

    if (result.error) {
        return res.status(503).json({ error: 'ollama-failed' });
    }

    return res.status(201).json({
        conversation: result.conversation,
        responses
    });
});

module.exports = router;
