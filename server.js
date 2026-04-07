const express = require('express');
const pageRoutes = require('./routes/pageRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

app.use('/', pageRoutes);
app.use('/api', authRoutes);
app.use('/api', chatRoutes);

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

// start up ollama immediately to warm it up for first chat request
const { generateReplyFromOllama } = require('./utils/ollamaClient');

setTimeout(async () => {
    console.log("[LLM] Warming up Ollama model...");
    try {
        await generateReplyFromOllama([{ type: "user-bubble", text: "hello" }]);
        console.log("[LLM] Warm-up complete.");
    } catch (err) {
        console.log("[LLM] Warm-up failed (Ollama may not be running yet).");
    }
}, 1000);

module.exports = { app };