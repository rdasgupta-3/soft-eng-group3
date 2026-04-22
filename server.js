const express = require('express');
const path = require('path');

const pageRoutes = require('./routes/pageRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const { ensureDataDir } = require('./utils/fileStore');
const { warmupOllama } = require('./utils/ollamaClient');

const PORT = Number(process.env.PORT || 3000);

function createApp() {
    ensureDataDir();

    const app = express();

    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.json());

    app.use('/', pageRoutes);
    app.use('/api', authRoutes);
    app.use('/api', chatRoutes);

    return app;
}

const app = createApp();

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        warmupOllama().catch(() => {});
    });
}

module.exports = {
    app,
    createApp
};
