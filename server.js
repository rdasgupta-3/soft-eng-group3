const express = require('express');
const pageRoutes = require('./routes/pageRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const { generateReplyFromOllama, RECOMMENDED_MODELS } = require('./utils/ollamaClient');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

app.use('/', pageRoutes);
app.use('/api', authRoutes);
app.use('/api', chatRoutes);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    setTimeout(async () => {
        console.log(`[LLM] Warming up ${RECOMMENDED_MODELS.length} models: ${RECOMMENDED_MODELS.join(', ')}`);
        await Promise.all(RECOMMENDED_MODELS.map(async (model) => {
            try {
                await generateReplyFromOllama([{ type: 'user-bubble', text: 'hello' }], null, model);
                console.log(`[LLM] Warm-up OK: ${model}`);
            } catch {
                console.log(`[LLM] Warm-up skipped (not installed): ${model}`);
            }
        }));
    }, 1000);
});

module.exports = { app };