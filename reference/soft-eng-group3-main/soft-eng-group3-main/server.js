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

module.exports = { app };