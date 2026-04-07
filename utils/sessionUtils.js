const { getSession } = require('./authStore');

function parseCookies(cookieHeader) {
    if (!cookieHeader || typeof cookieHeader !== 'string') {
        return {};
    }

    const cookies = {};
    const parts = cookieHeader.split(';');

    parts.forEach(part => {
        const [rawKey, ...rawValue] = part.trim().split('=');
        if (!rawKey) {
            return;
        }
        cookies[rawKey] = decodeURIComponent(rawValue.join('='));
    });

    return cookies;
}

function getSessionFromRequest(req) {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionId = cookies.sessionId;
    const session = getSession(sessionId);
    if (!session) {
        return null;
    }

    return {
        sessionId,
        ...session
    };
}

module.exports = {
    parseCookies,
    getSessionFromRequest
};
