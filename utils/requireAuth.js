const { getSessionFromRequest } = require('./sessionUtils');

function requireAuth(req, res, next) {
    const session = getSessionFromRequest(req);

    if (!session) {
        return res.status(401).json({ error: 'Please log in to continue.' });
    }

    req.session = session;
    return next();
}

module.exports = {
    requireAuth
};
