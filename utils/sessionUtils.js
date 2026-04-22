const { getSession } = require('./authStore');

function parseCookies(cookieHeader) {
    if (!cookieHeader || typeof cookieHeader !== 'string') {
        return {};
    }

    return cookieHeader.split(';').reduce((cookies, part) => {
        const [rawKey, ...rawValue] = part.trim().split('=');
        if (!rawKey) {
            return cookies;
        }

        cookies[rawKey] = decodeURIComponent(rawValue.join('='));
        return cookies;
    }, {});
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

function buildSessionCookie(sessionId) {
    return `sessionId=${sessionId}; HttpOnly; Path=/; SameSite=Lax`;
}

function buildExpiredSessionCookie() {
    return 'sessionId=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax';
}

module.exports = {
    parseCookies,
    getSessionFromRequest,
    buildSessionCookie,
    buildExpiredSessionCookie
};
