const crypto = require('crypto');

const { readJson, writeJson } = require('./fileStore');

const USERS_FILE = 'users.json';
const SESSIONS_FILE = 'sessions.json';
const RESET_TOKENS_FILE = 'resetTokens.json';

function sanitizeUser(user) {
    if (!user) {
        return null;
    }

    return {
        email: user.email,
        createdAt: user.createdAt
    };
}

function findUserByEmail(email) {
    const users = readJson(USERS_FILE, {});
    return users[email] || null;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { passwordHash, passwordSalt: salt };
}

function verifyPassword(password, user) {
    if (!user) {
        return false;
    }

    const calculated = crypto.scryptSync(password, user.passwordSalt, 64);
    const stored = Buffer.from(user.passwordHash, 'hex');

    if (calculated.length !== stored.length) {
        return false;
    }

    return crypto.timingSafeEqual(calculated, stored);
}

function createUser(email, password) {
    const users = readJson(USERS_FILE, {});
    const createdAt = Date.now();
    const { passwordHash, passwordSalt } = hashPassword(password);

    users[email] = {
        email,
        passwordHash,
        passwordSalt,
        createdAt
    };

    writeJson(USERS_FILE, users);
    return sanitizeUser(users[email]);
}

function validateUser(email, password) {
    const user = findUserByEmail(email);
    return verifyPassword(password, user) ? sanitizeUser(user) : null;
}

function updateUserPassword(email, password) {
    const users = readJson(USERS_FILE, {});
    const user = users[email];

    if (!user) {
        return null;
    }

    const { passwordHash, passwordSalt } = hashPassword(password);

    user.passwordHash = passwordHash;
    user.passwordSalt = passwordSalt;
    user.passwordUpdatedAt = Date.now();

    writeJson(USERS_FILE, users);
    return sanitizeUser(user);
}

function createResetToken(email) {
    const tokens = readJson(RESET_TOKENS_FILE, {});
    const token = crypto.randomBytes(24).toString('hex');

    tokens[token] = {
        email,
        createdAt: Date.now(),
        expiresAt: Date.now() + (15 * 60 * 1000)
    };

    writeJson(RESET_TOKENS_FILE, tokens);
    return token;
}

function getResetToken(token) {
    if (!token) {
        return null;
    }

    const tokens = readJson(RESET_TOKENS_FILE, {});
    return tokens[token] || null;
}

function deleteResetToken(token) {
    if (!token) {
        return;
    }

    const tokens = readJson(RESET_TOKENS_FILE, {});
    delete tokens[token];
    writeJson(RESET_TOKENS_FILE, tokens);
}

function createSession(email) {
    const sessions = readJson(SESSIONS_FILE, {});
    const sessionId = crypto.randomBytes(24).toString('hex');

    sessions[sessionId] = {
        email,
        createdAt: Date.now()
    };

    writeJson(SESSIONS_FILE, sessions);
    return sessionId;
}

function getSession(sessionId) {
    if (!sessionId) {
        return null;
    }

    const sessions = readJson(SESSIONS_FILE, {});
    return sessions[sessionId] || null;
}

function deleteSession(sessionId) {
    if (!sessionId) {
        return;
    }

    const sessions = readJson(SESSIONS_FILE, {});
    delete sessions[sessionId];
    writeJson(SESSIONS_FILE, sessions);
}

module.exports = {
    findUserByEmail,
    createUser,
    validateUser,
    updateUserPassword,
    createResetToken,
    getResetToken,
    deleteResetToken,
    createSession,
    getSession,
    deleteSession
};
