const express = require('express');
const { normalizeEmail, isValidEmail, isValidNewPassword } = require('../utils/authValidation');
const {
    findUserByEmail,
    createUser,
    validateUser,
    createResetToken,
    getResetToken,
    deleteResetToken,
    createSession,
    deleteSession
} = require('../utils/authStore');
const { getSessionFromRequest } = require('../utils/sessionUtils');

const router = express.Router();

router.post('/signup', (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address (example@domain.com).' });
    }

    const userExists = findUserByEmail(normalizedEmail);
    if (userExists) {
        return res.status(400).json({ error: 'An account with that email already exists.' });
    }

    createUser(normalizedEmail, password);
    console.log(`[Database] New user created: ${normalizedEmail}`);
    return res.json({ success: true });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address (example@domain.com).' });
    }

    const validUser = validateUser(normalizedEmail, password);

    if (!validUser) {
        return res.status(401).json({ error: 'Error: Invalid credentials. Please try again.' });
    }

    const sessionId = createSession(normalizedEmail);
    res.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly; Path=/; SameSite=Lax`);

    console.log(`[Auth] User logged in: ${normalizedEmail}`);
    return res.json({ success: true });
});

router.post('/logout', (req, res) => {
    const session = getSessionFromRequest(req);
    if (session) {
        deleteSession(session.sessionId);
    }

    res.setHeader('Set-Cookie', 'sessionId=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
    return res.json({ success: true });
});

router.get('/me', (req, res) => {
    const session = getSessionFromRequest(req);
    if (!session) {
        return res.status(401).json({ error: 'Not logged in.' });
    }

    return res.json({ email: session.email });
});

router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address (example@domain.com).' });
    }

    const user = findUserByEmail(normalizedEmail);
    if (!user) {
        return res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
    }

    const token = createResetToken(normalizedEmail);

    const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
    console.log(`[Auth] Password reset link for ${normalizedEmail}: ${resetLink}`);

    return res.json({
        success: true,
        message: 'Reset link generated. In production this would be emailed.',
        previewResetLink: resetLink
    });
});

router.post('/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
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

    user.password = newPassword.trim();
    deleteResetToken(token);
    console.log(`[Auth] Password reset completed for ${user.email}`);
    return res.json({ success: true, message: 'Password updated successfully.' });
});

module.exports = router;
