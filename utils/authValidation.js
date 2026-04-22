const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
    return EMAIL_REGEX.test(normalizeEmail(email));
}

function isValidPassword(password) {
    return typeof password === 'string' && password.trim().length >= MIN_PASSWORD_LENGTH;
}

function isValidNewPassword(password) {
    return isValidPassword(password);
}

module.exports = {
    EMAIL_REGEX,
    MIN_PASSWORD_LENGTH,
    normalizeEmail,
    isValidEmail,
    isValidPassword,
    isValidNewPassword
};
