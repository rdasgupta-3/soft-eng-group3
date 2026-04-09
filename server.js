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

<<<<<<< HEAD
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
=======
// 1. Handle Account Creation
app.post('/api/signup', (req, res) => {
    const { email, password } = req.body;
    
    // Check if user already exists
    const userExists = users.find(u => u.email === email);
    if (userExists) {
        return res.status(400).json({ error: "An account with that email already exists." });
    }

    // Save the new user to our "database"
    users.push({ email, password });
    console.log(`[Database] New user created: ${email}`);
    res.json({ success: true });
});

// 2. Handle Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // Search the "database" for a matching email and password
    const validUser = users.find(u => u.email === email && u.password === password);
    
    if (validUser) {
        console.log(`[Auth] User logged in: ${email}`);
        res.json({ success: true });
    } else {
        res.status(401).json({ error: "Error: Invalid credentials. Please try again." });
    }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
>>>>>>> parent of 782b388 (Merge pull request #7 from rdasgupta-3/iter-2-tests)
