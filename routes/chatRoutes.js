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
const { generateReplyFromSpecificModel } = require('../utils/ollamaClient');

const MODEL_MAP = {
    phi: "phi3:3.8b",
    gemma: "gemma2:2b",
    deepseek: "deepseek-r1:1.5b"
};

const personaPrompts = {
    sweetheart: "You are a friendly, sweet assistant who explains things warmly and politely.",
    professional: "You are a formal, concise assistant who gives structured, polished answers.",
    silly: "You are witty, trickster assistant who responds with humor and lies."
};

const router = express.Router();

// checking if ollama is available and running
router.get('/ollama-status', async(req,res) =>{
    res.set('Cache-Control', 'no-store');
    try {
        const response = await fetch('http://127.0.0.1:11434/api/tags');
        if(!response.ok) throw new Error();
        return res.json({ok:true});
    } catch(err){
        return res.json({ok:false});
    }
});

/* warm up ollama when frontent detects its online, trying to help with initial reply speed 
router.get('/warmup', async(req,res) =>{
    try {
        await generateReplyFromOllama([{ type: "user-bubble", text: "hello" }]);
        return res.json({warmed:true});
    } catch(err){
        return res.json({warmed: false});
    }
});

*/

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

    const latestUserMessage = [...conversation.messages]
        .reverse()
        .find(msg => msg.type === 'user-bubble');

    if (!latestUserMessage) {
        return res.status(400).json({ error: 'No user message found to respond to.' });
    }


    if (!conversation.selectedModel) {
        return res.status(400).json({ error: 'No model selected for this conversation.' });
    }

    const model = MODEL_MAP[conversation.selectedModel];
    let aiText = null;

    try {
        aiText = await generateReplyFromSpecificModel(model, conversation.messages);
    } catch (err) {
        console.warn(`[AI-Reply] Error generating reply from ${model}:`, err.message);
    }

    if (!aiText || typeof aiText !== "string" || aiText.trim() === "") {
        aiText = "Sorry, I'm having trouble responding right now.";
    }

    const result = addMessage(req.session.email, conversationId, 'ai-bubble', aiText);

    if (result.error) {
        return res.status(500).json({ error: 'Failed to save AI reply.' });
    }

    return res.status(201).json({
        conversation: result.conversation,
        aiReply: aiText
    });
});

router.post('/conversations/:conversationId/multi-reply', async (req, res) => {
    const { conversationId } = req.params;
    const conversation = getConversation(req.session.email, conversationId);

    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found.' });
    }

    const persona = req.body.persona || "sweetheart";
    const systemPrompt = personaPrompts[persona];

    const personaMessage = {
        role: "system",
        content: systemPrompt
    };

    const messagesWithPersona = [personaMessage, ...conversation.messages];

    try {
        const tagsRes = await fetch('http://127.0.0.1:11434/api/tags');
        const tagsData = await tagsRes.json();
        const installedModels = (tagsData.models || []).map(m => m.name);
        console.log('[multi-reply] Installed models:', installedModels);

        const requiredModels = Object.values(MODEL_MAP);
        const missing = requiredModels.filter(m => !installedModels.includes(m));
        if (missing.length) {
            console.warn('[multi-reply] Missing models:', missing);
        }
    } catch (e) {
        console.warn('[multi-reply] Could not check installed models:', e.message);
    }

    const [phi, gemma, deepseek] = await Promise.all([
    generateReplyFromSpecificModel(MODEL_MAP.phi, messagesWithPersona)
        .catch(() => null),
    generateReplyFromSpecificModel(MODEL_MAP.gemma, messagesWithPersona)
        .catch(() => null),
    generateReplyFromSpecificModel(MODEL_MAP.deepseek, messagesWithPersona)
        .catch(() => null),
    
    ]);

    return res.json({
        phi: phi || "Phi failed to respond.",
        gemma: gemma || "Gemma failed to respond.",
        deepseek: deepseek || "DeepSeek failed to respond."
    });
});

router.post('/conversations/:conversationId/select-model', (req,res) => {
    const { conversationId } = req.params;
    const { modelKey} = req.body;

    if(!MODEL_MAP[modelKey]){
        return res.status(400).json({error: 'Invalid model key'});
    }

    const conversation = getConversation(req.session.email, conversationId)

    if(!conversation){
        return res.status(404).json({error: 'Conversation not found.'});
    }

    conversation.selectedModel = modelKey;
    updateConversation(req.session.email, conversationId, conversation);

    return res.json({ok: true});
});

module.exports = router;
