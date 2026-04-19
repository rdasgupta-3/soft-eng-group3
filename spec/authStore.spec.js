const {
    findUserByEmail,
    createUser,
    validateUser,
    setUserPassword,
    createResetToken,
    getResetToken,
    deleteResetToken,
    createSession,
    getSession,
    deleteSession
} = require('../utils/authStore');

// Use unique emails per test so the shared in-memory store does not leak state
let emailCounter = 0;
function uniqueEmail() {
    return `testuser${++emailCounter}@example.com`;
}

// ─── createUser / validateUser ────────────────────────────────────────────────

describe('authStore – createUser and validateUser', () => {
    it('stores a user that can be found by email', () => {
        const email = uniqueEmail();
        createUser(email, 'Password1!');
        expect(findUserByEmail(email)).toBeTruthy();
    });

    it('does NOT store the password as plain text', () => {
        const email = uniqueEmail();
        createUser(email, 'MySecret99');
        const user = findUserByEmail(email);
        expect(user.password).not.toBe('MySecret99');
        // scrypt output is stored as salt:hash — should contain a colon
        expect(user.password).toContain(':');
    });

    it('validates a user with the correct password', () => {
        const email = uniqueEmail();
        createUser(email, 'CorrectPass1');
        const result = validateUser(email, 'CorrectPass1');
        expect(result).toBeTruthy();
        expect(result.email).toBe(email);
    });

    it('returns null for a wrong password', () => {
        const email = uniqueEmail();
        createUser(email, 'RightPassword1');
        const result = validateUser(email, 'WrongPassword1');
        expect(result).toBeNull();
    });

    it('returns null for an email that does not exist', () => {
        const result = validateUser('nobody@nowhere.com', 'SomePass1');
        expect(result).toBeNull();
    });

    it('two users with the same password produce different stored hashes', () => {
        const email1 = uniqueEmail();
        const email2 = uniqueEmail();
        createUser(email1, 'SharedPass1');
        createUser(email2, 'SharedPass1');
        const hash1 = findUserByEmail(email1).password;
        const hash2 = findUserByEmail(email2).password;
        // Salts are random so the full stored strings must differ
        expect(hash1).not.toBe(hash2);
    });
});

// ─── setUserPassword ──────────────────────────────────────────────────────────

describe('authStore – setUserPassword', () => {
    it('allows login with the new password after a reset', () => {
        const email = uniqueEmail();
        createUser(email, 'OldPass1');
        setUserPassword(email, 'NewPass1');
        expect(validateUser(email, 'NewPass1')).toBeTruthy();
    });

    it('rejects the old password after a reset', () => {
        const email = uniqueEmail();
        createUser(email, 'OldPass2');
        setUserPassword(email, 'NewPass2');
        expect(validateUser(email, 'OldPass2')).toBeNull();
    });
});

// ─── reset tokens ─────────────────────────────────────────────────────────────

describe('authStore – password reset tokens', () => {
    it('createResetToken returns a non-empty string', () => {
        const token = createResetToken('reset@example.com');
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
    });

    it('getResetToken returns the record for a valid token', () => {
        const email = uniqueEmail();
        const token = createResetToken(email);
        const record = getResetToken(token);
        expect(record).toBeTruthy();
        expect(record.email).toBe(email);
        expect(record.expiresAt).toBeGreaterThan(Date.now());
    });

    it('getResetToken returns null for an unknown token', () => {
        expect(getResetToken('completely-made-up-token')).toBeNull();
    });

    it('deleteResetToken removes the token', () => {
        const email = uniqueEmail();
        const token = createResetToken(email);
        deleteResetToken(token);
        expect(getResetToken(token)).toBeNull();
    });
});

// ─── sessions ─────────────────────────────────────────────────────────────────

describe('authStore – sessions', () => {
    it('getSession returns the session record for a valid ID', () => {
        const email = uniqueEmail();
        const sessionId = createSession(email);
        const session = getSession(sessionId);
        expect(session).toBeTruthy();
        expect(session.email).toBe(email);
    });

    it('getSession returns null for an unknown session ID', () => {
        expect(getSession('fake-session-id')).toBeNull();
    });

    it('getSession returns null when called with null or undefined', () => {
        expect(getSession(null)).toBeNull();
        expect(getSession(undefined)).toBeNull();
    });

    it('deleteSession removes the session', () => {
        const email = uniqueEmail();
        const sessionId = createSession(email);
        deleteSession(sessionId);
        expect(getSession(sessionId)).toBeNull();
    });
});
