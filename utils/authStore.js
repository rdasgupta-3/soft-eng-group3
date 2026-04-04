const crypto = require('crypto');

const users = [];
const resetTokens = new Map();
const sessions = new Map();

function findUserByEmail(email) {
    return users.find(u => u.email === email);
}

function createUser(email, password) {
    const user = { email, password };
    users.push(user);
    return user;
}

function validateUser(email, password) {
    return users.find(u => u.email === email && u.password === password) || null;
}

function createResetToken(email) {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + (15 * 60 * 1000);
    resetTokens.set(token, { email, expiresAt });
    return token;
}

function getResetToken(token) {
    return resetTokens.get(token) || null;
}

function deleteResetToken(token) {
    resetTokens.delete(token);
}

function createSession(email) {
    const sessionId = crypto.randomBytes(24).toString('hex');
    sessions.set(sessionId, {
        email,
        createdAt: Date.now()
    });
    return sessionId;
}

function getSession(sessionId) {
    if (!sessionId) {
        return null;
    }
    return sessions.get(sessionId) || null;
}

function deleteSession(sessionId) {
    if (!sessionId) {
        return;
    }
    sessions.delete(sessionId);
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
    deleteSession
};
