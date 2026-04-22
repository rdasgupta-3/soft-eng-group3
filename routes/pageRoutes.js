const express = require('express');
const path = require('path');
const { createSession } = require('../utils/authStore');
const { getSessionFromRequest } = require('../utils/sessionUtils');
const { buildSessionCookie } = require('../utils/sessionUtils');

const router = express.Router();

function sendPage(res, fileName) {
    res.sendFile(path.join(__dirname, '..', 'public', fileName));
}

function applyTestAutologin(req, res) {
    if (process.env.TEST_MODE === '1' && typeof req.query.autologin === 'string' && req.query.autologin.trim()) {
        const sessionId = createSession(req.query.autologin.trim().toLowerCase());
        res.setHeader('Set-Cookie', buildSessionCookie(sessionId));
    }
}

function redirectAuthenticatedUsers(req, res, next) {
    if (getSessionFromRequest(req)) {
        return res.redirect('/choose-player');
    }

    return next();
}

function requirePageAuth(req, res, next) {
    applyTestAutologin(req, res);

    if (!getSessionFromRequest(req)) {
        return res.redirect('/');
    }

    return next();
}

router.get('/', redirectAuthenticatedUsers, (req, res) => {
    sendPage(res, 'login.html');
});

router.get('/signup', redirectAuthenticatedUsers, (req, res) => {
    sendPage(res, 'signup.html');
});

router.get('/forgot-password', (req, res) => {
    sendPage(res, 'forgot-password.html');
});

router.get('/reset-password', (req, res) => {
    sendPage(res, 'reset-password.html');
});

router.get('/choose-player', requirePageAuth, (req, res) => {
    sendPage(res, 'players.html');
});

router.get('/chat', requirePageAuth, (req, res) => {
    sendPage(res, 'chat.html');
});

module.exports = router;
