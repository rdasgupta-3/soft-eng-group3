const express = require('express');
const pageRoutes = require('./routes/pageRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const { warmOllamaModel } = require('./utils/ollamaClient');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

app.use('/', pageRoutes);
app.use('/api', authRoutes);
app.use('/api', chatRoutes);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        warmOllamaModel().catch(error => {
            console.warn('[Ollama Warmup] Unexpected warmup failure:', error.message || error);
        });
    });
}

module.exports = { app };
