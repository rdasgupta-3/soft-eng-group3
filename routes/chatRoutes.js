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
const { generateReplies, getConfiguredModelIds } = require('../utils/llmService');
const { getDefaultModelIds, listModelSummaries } = require('../utils/modelCatalog');
const { getPersona } = require('../utils/practicalAssistant');

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

router.get('/models', (req, res) => {
    res.json({
        models: listModelSummaries(),
        defaultModelIds: getDefaultModelIds()
    });
});

router.get('/conversations', (req, res) => {
    const conversations = listConversations(req.session.email);
    res.json({ conversations });
});

router.post('/conversations', (req, res) => {
    const conversation = createConversation(req.session.email, {
        selectedModelIds: req.body && req.body.selectedModelIds
    });
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
    const { type, text, metadata } = req.body;
    const result = addMessage(req.session.email, conversationId, type, text, metadata);

    if (result.error === 'not-found') {
        return res.status(404).json({ error: 'Conversation not found.' });
    }

    if (result.error === 'invalid-text') {
        return res.status(400).json({ error: 'Message text is required.' });
    }

    return res.status(201).json({ conversation: result.conversation });
});

router.post('/conversations/:conversationId/ai-reply', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const conversation = getConversation(req.session.email, conversationId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found.' });
        }

        const latestUserMessage = [...conversation.messages].reverse().find(msg => msg.type === 'user-bubble');
        if (!latestUserMessage) {
            return res.status(400).json({ error: 'No user message found to respond to.' });
        }

        const selectedModelIds = getConfiguredModelIds(
            req.body && Array.isArray(req.body.selectedModelIds)
                ? req.body.selectedModelIds
                : conversation.selectedModelIds
        );

        if (JSON.stringify(selectedModelIds) !== JSON.stringify(conversation.selectedModelIds || [])) {
            updateConversation(req.session.email, conversationId, { selectedModelIds });
        }

        const personaId = req.body && typeof req.body.personaId === 'string'
            ? req.body.personaId
            : 'professional';
        const persona = getPersona(personaId);
        const replies = await generateReplies(selectedModelIds, conversation.messages, { personaId });
        let latestConversation = conversation;

        for (const reply of replies) {
            const savedReply = addMessage(req.session.email, conversationId, 'ai-bubble', reply.text, {
                modelId: reply.modelId,
                modelName: reply.modelName,
                provider: reply.provider,
                status: reply.status,
                personaId: persona.id,
                personaName: persona.name,
                personaAvatar: {
                    professional: '/images/image_6.png',
                    sweetheart: '/images/image_4.png',
                    silly: '/images/image_5.png'
                }[persona.id],
                ...(reply.metadata || {})
            });

            if (savedReply.error) {
                return res.status(500).json({ error: 'Failed to save AI reply.' });
            }

            latestConversation = savedReply.conversation;
        }

        return res.status(201).json({
            conversation: latestConversation,
            aiReply: replies[0] ? replies[0].text : '',
            replies
        });
    } catch (error) {
        console.error('[Chat] AI reply failed:', error);
        return res.status(500).json({ error: error.message || 'Failed to generate AI reply.' });
    }
});

module.exports = router;
