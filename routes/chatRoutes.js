const express = require('express');
const {
    listConversations,
    createConversation,
    getConversation,
    updateConversation,
    deleteConversation,
    addMessage
} = require('../utils/chatStore');
const { getSessionFromRequest } = require('../utils/sessionUtils');
const { generateReplyFromOllama, getAvailableModels } = require('../utils/ollamaClient');

const router = express.Router();

router.get('/ollama-status', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const response = await fetch('http://127.0.0.1:11434/api/tags');
        if (!response.ok) throw new Error();
        return res.json({ ok: true });
    } catch (err) {
        return res.json({ ok: false });
    }
});

router.get('/warmup', async (req, res) => {
    try {
        await generateReplyFromOllama([{ type: 'user-bubble', text: 'hello' }]);
        return res.json({ warmed: true });
    } catch (err) {
        return res.json({ warmed: false });
    }
});

router.get('/ollama-models', async (req, res) => {
    const models = await getAvailableModels();
    return res.json({ models });
});

function requireAuth(req, res, next) {
    const session = getSessionFromRequest(req);
    if (!session) {
        return res.status(401).json({ error: 'Please log in to access chat history.' });
    }

    req.session = session;
    return next();
}

router.use(requireAuth);

router.get('/conversations', (req, res) => {
    const conversations = listConversations(req.session.email);
    res.json({ conversations });
});

router.post('/conversations', (req, res) => {
    const { persona } = req.body;
    const conversation = createConversation(req.session.email, persona || null);
    res.status(201).json({ conversation });
});

router.patch('/conversations/:conversationId', (req, res) => {
    const { conversationId } = req.params;
    const conversation = updateConversation(req.session.email, conversationId, req.body);

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
    const { type, text } = req.body;
    const result = addMessage(req.session.email, conversationId, type, text);

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

    const latestUserMessage = [...conversation.messages].reverse().find(msg => msg.type === 'user-bubble');
    if (!latestUserMessage) {
        return res.status(400).json({ error: 'No user message found to respond to.' });
    }

    const requestedModels = Array.isArray(req.body.models) && req.body.models.length > 0
        ? req.body.models.slice(0, 3)
        : null;

    if (requestedModels && requestedModels.length > 1) {
        const results = await Promise.all(
            requestedModels.map(async (model) => {
                try {
                    const text = await generateReplyFromOllama(conversation.messages, conversation.persona, model);
                    return { model, text };
                } catch {
                    return { model, text: `${model} failed to respond. Is it installed? Run: ollama pull ${model}` };
                }
            })
        );
        for (const r of results) {
            addMessage(req.session.email, conversationId, 'ai-bubble', r.text, r.model);
        }
        const updated = getConversation(req.session.email, conversationId);
        return res.status(201).json({ responses: results, conversation: updated });
    }

    const modelOverride = requestedModels ? requestedModels[0] : null;
    let aiText;
    try {
        aiText = await generateReplyFromOllama(conversation.messages, conversation.persona, modelOverride);
    } catch (err) {
        return res.status(503).json({ error: 'ollama-failed' });
    }
    const result = addMessage(req.session.email, conversationId, 'ai-bubble', aiText, modelOverride || undefined);

    if (result.error) {
        return res.status(500).json({ error: 'Failed to save AI reply.' });
    }

    return res.status(201).json({ conversation: result.conversation, aiReply: aiText });
});

module.exports = router;
