const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SECRET = process.env.APP_SECRET || 'individual-iteration-1-dev-secret';

function deriveKey() {
    return crypto.scryptSync(SECRET, 'multi-llm-vault', KEY_LENGTH);
}

function encryptSecret(plainText) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        algorithm: ALGORITHM,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        ciphertext: encrypted.toString('hex')
    };
}

function decryptSecret(record) {
    const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(), Buffer.from(record.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(record.authTag, 'hex'));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(record.ciphertext, 'hex')),
        decipher.final()
    ]);

    return decrypted.toString('utf8');
}

function maskSecret(secret) {
    const value = String(secret || '').trim();
    if (!value) {
        return 'Not saved';
    }

    if (value.length <= 8) {
        return `${value.slice(0, 1)}${'*'.repeat(Math.max(1, value.length - 2))}${value.slice(-1)}`;
    }

    return `${value.slice(0, 4)}${'*'.repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}

module.exports = {
    encryptSecret,
    decryptSecret,
    maskSecret
};
