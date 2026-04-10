const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Our "In-Memory Database" with pre-loaded QA test users
const users = [
    { email: 'test@test.com', password: '123456' },
    { email: 'user@example.com', password: 'ValidPass123!' }
];

app.use(express.static('public'));
app.use(express.json());

// --- Routing Table (Pages) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public/signup.html')));
app.get('/choose-player', (req, res) => res.sendFile(path.join(__dirname, 'public/players.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'public/chat.html')));

// --- API Endpoints (Data) ---

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
