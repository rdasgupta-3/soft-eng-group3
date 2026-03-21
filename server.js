const express = require('express');
const app = express();
const path = require('path');
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

// Routing Table
app.get('/', (req, res) => res.sendFile(path.join(__currentDir, 'public/login.html')));
app.get('/choose-player', (req, res) => res.sendFile(path.join(__currentDir, 'public/players.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__currentDir, 'public/chat.html')));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));