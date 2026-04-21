const express = require('express');
const {
    listConversations,
    createConversation,
    getConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    addMessages,
    normalizeSelectedModels
} = require('../utils/chatStore');
const { getSessionFromRequest } = require('../utils/sessionUtils');
const {
    generateReplyFromOllama,
    generateRepliesFromOllama,
    getConfiguredModels
} = require('../utils/ollamaClient');

const router = express.Router();

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
    const conversation = createConversation(req.session.email);
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

    const requestedModels = normalizeSelectedModels(
        req.query?.model || req.body?.model || req.body?.models || conversation.selectedModels || getConfiguredModels()
    );

    if (requestedModels.length > 1) {
        const replies = await generateRepliesFromOllama(conversation.messages, requestedModels);
        const multiResult = addMessages(
            req.session.email,
            conversationId,
            replies.map(reply => ({
                type: 'ai-bubble',
                text: reply.text,
                meta: {
                    provider: reply.provider,
                    model: reply.model
                }
            }))
        );

        if (multiResult.error) {
            return res.status(500).json({ error: 'Failed to save AI replies.' });
        }

        return res.status(201).json({ conversation: multiResult.conversation, aiReplies: replies });
    }

    const aiText = await generateReplyFromOllama(conversation.messages, requestedModels[0]);
    const result = addMessage(req.session.email, conversationId, 'ai-bubble', aiText, {
        provider: 'ollama',
        model: requestedModels[0] || getConfiguredModels()[0]
    });

    if (result.error) {
        return res.status(500).json({ error: 'Failed to save AI reply.' });
    }

    return res.status(201).json({ conversation: result.conversation, aiReply: aiText });
});
module.exports = router;
