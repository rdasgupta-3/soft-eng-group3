const express = require('express');

const { normalizeEmail, isValidEmail, isValidPassword, isValidNewPassword } = require('../utils/authValidation');
const {
    findUserByEmail,
    createUser,
    validateUser,
    updateUserPassword,
    createResetToken,
    getResetToken,
    deleteResetToken,
    createSession,
    deleteSession
} = require('../utils/authStore');
const { getSessionFromRequest, buildSessionCookie, buildExpiredSessionCookie } = require('../utils/sessionUtils');

const router = express.Router();

router.post('/signup', (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address (example@domain.com).' });
    }

    if (!isValidPassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (findUserByEmail(email)) {
        return res.status(400).json({ error: 'An account with that email already exists.' });
    }

    const user = createUser(email, password);
    return res.status(201).json({ success: true, user });
});

router.post('/login', (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address (example@domain.com).' });
    }

    if (!isValidPassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const user = validateUser(email, password);
    if (!user) {
        return res.status(401).json({ error: 'Error: Invalid credentials. Please try again.' });
    }

    const sessionId = createSession(user.email);
    res.setHeader('Set-Cookie', buildSessionCookie(sessionId));
    return res.json({ success: true, user });
});

router.post('/logout', (req, res) => {
    const session = getSessionFromRequest(req);
    if (session) {
        deleteSession(session.sessionId);
    }

    res.setHeader('Set-Cookie', buildExpiredSessionCookie());
    return res.json({ success: true });
});

router.get('/session', (req, res) => {
    const session = getSessionFromRequest(req);
    if (!session) {
        return res.status(401).json({ error: 'You are not logged in.' });
    }

    return res.json({
        session: {
            email: session.email,
            createdAt: session.createdAt
        }
    });
});

router.post('/forgot-password', (req, res) => {
    const email = normalizeEmail(req.body.email);

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address (example@domain.com).' });
    }

    const user = findUserByEmail(email);
    if (!user) {
        return res.json({
            success: true,
            message: 'If this email exists, a reset link has been sent.'
        });
    }

    const token = createResetToken(email);
    const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;

    return res.json({
        success: true,
        message: 'Reset link generated. In production this would be emailed.',
        previewResetLink: resetLink
    });
});

router.post('/reset-password', (req, res) => {
    const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword.trim() : '';
    const tokenRecord = getResetToken(token);

    if (!tokenRecord) {
        return res.status(400).json({ error: 'Invalid reset token.' });
    }

    if (Date.now() > tokenRecord.expiresAt) {
        deleteResetToken(token);
        return res.status(400).json({ error: 'Reset token expired. Please request a new link.' });
    }

    if (!isValidNewPassword(newPassword)) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const user = findUserByEmail(tokenRecord.email);
    if (!user) {
        deleteResetToken(token);
        return res.status(400).json({ error: 'Account no longer exists.' });
    }

    updateUserPassword(tokenRecord.email, newPassword);
    deleteResetToken(token);

    return res.json({
        success: true,
        message: 'Password updated successfully.'
    });
});

module.exports = router;
