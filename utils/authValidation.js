const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
    return (email || '').trim();
}

function isValidEmail(email) {
    return EMAIL_REGEX.test(normalizeEmail(email));
}

function isValidNewPassword(password) {
    return !!password && password.trim().length >= 8;
}

module.exports = {
    EMAIL_REGEX,
    normalizeEmail,
    isValidEmail,
    isValidNewPassword
};
