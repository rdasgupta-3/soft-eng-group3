const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// new file paths for users and sessions
const dataDir = path.join(__dirname, '..', 'data'); 
const USER_FILE = path.join(dataDir,'users.json');
const SESSIONS_FILE = path.join(dataDir, 'sessions.json');
const TOKENS_FILE = path.join(dataDir, 'resetTokens.json');

// making sure data folder exists, will create if not
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// helper functions 
function load(file){
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file));
}

function save(file, data){
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}


// user functions
function findUserByEmail(email) {
    const users = load(USER_FILE);
    return users[email] || null;
}

function createUser(email, password) {
    const users = load(USER_FILE);
    users[email] = {email,password};
    save(USER_FILE, users);
    return users[email];
}

function validateUser(email, password) {
    const users = load(USER_FILE);
    const user = users[email];
    return user && user.password === password ? user : null;
}

// reset token and sessionfunctions 
function createResetToken(email) {
    const tokens = load(TOKENS_FILE);
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + (15 * 60 * 1000);

    tokens[token] = {email, expiresAt};
    save(TOKENS_FILE, tokens);
    return token;
}

function getResetToken(token) {
    const tokens = load(TOKENS_FILE);
    return tokens[token] || null;
}

function deleteResetToken(token) {
    const tokens = load(TOKENS_FILE);
    delete tokens[token];
    save(TOKENS_FILE, tokens);
}

function createSession(email) {
    const sessions = load(SESSIONS_FILE);
    const sessionId = crypto.randomBytes(24).toString('hex');

    sessions[sessionId] = {email, createdAt: Date.now()};
    save(SESSIONS_FILE,sessions);

    return sessionId;
}

function getSession(sessionId) {
    const sessions = load(SESSIONS_FILE);
    return sessions[sessionId] || null;
}

function deleteSession(sessionId) {
    const sessions = load(SESSIONS_FILE);
    delete sessions[sessionId];
    save(SESSIONS_FILE, sessions);
}

// update password function for reset password method
function updateUserPassword(email,newPassword){
    const users = load(USER_FILE);
    if(!users[email]) return false;

    users[email].password = newPassword;
    save(USER_FILE, users);
    return true;
}

module.exports = {
    findUserByEmail,
    createUser,
    validateUser,
    createResetToken,
    getResetToken,
    deleteResetToken,
    createSession,
    getSession,
    deleteSession,
    updateUserPassword
};
