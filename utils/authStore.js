const crypto = require('crypto');

const users = [];
const resetTokens = new Map();
const sessions = new Map();

const SCRYPT_KEYLEN = 64;

function hashPassword(plainText) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(plainText, salt, SCRYPT_KEYLEN).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(plainText, stored) {
    const separatorIndex = stored.indexOf(':');
    if (separatorIndex === -1) return false;
    const salt = stored.slice(0, separatorIndex);
    const storedHash = stored.slice(separatorIndex + 1);
    const hash = crypto.scryptSync(plainText, salt, SCRYPT_KEYLEN).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

function findUserByEmail(email) {
    return users.find(u => u.email === email);
}

function createUser(email, password) {
    const user = { email, password: hashPassword(password) };
    users.push(user);
    return user;
}

function validateUser(email, password) {
    const user = users.find(u => u.email === email);
    if (!user) return null;
    return verifyPassword(password, user.password) ? user : null;
}

function setUserPassword(email, newPassword) {
    const user = users.find(u => u.email === email);
    if (user) user.password = hashPassword(newPassword);
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
    setUserPassword,
    createResetToken,
    getResetToken,
    deleteResetToken,
    createSession,
    getSession,
    deleteSession
};
