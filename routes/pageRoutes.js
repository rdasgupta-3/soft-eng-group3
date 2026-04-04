const express = require('express');
const path = require('path');

const router = express.Router();

router.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.html')));
router.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'signup.html')));
router.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'forgot-password.html')));
router.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'reset-password.html')));
router.get('/choose-player', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'players.html')));
router.get('/chat', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'chat.html')));

module.exports = router;
