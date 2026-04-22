const fs = require('fs');
const path = require('path');

const { TEST_DATA_DIR, resetTestData } = require('./helpers/testData');
const {
    createUser,
    findUserByEmail,
    validateUser,
    createResetToken,
    getResetToken,
    updateUserPassword,
    createSession,
    getSession,
    deleteSession
} = require('../utils/authStore');

describe('authStore', () => {
    beforeEach(() => {
        resetTestData();
    });

    it('stores hashed passwords instead of plaintext', () => {
        createUser('student@example.com', 'StudyPass123!');
        const storedUser = findUserByEmail('student@example.com');
        const usersFile = fs.readFileSync(path.join(TEST_DATA_DIR, 'users.json'), 'utf8');

        expect(storedUser.passwordHash).toBeDefined();
        expect(usersFile).not.toContain('StudyPass123!');
    });

    it('supports password-reset tokens and password updates', () => {
        createUser('student@example.com', 'StudyPass123!');
        const token = createResetToken('student@example.com');

        expect(getResetToken(token).email).toBe('student@example.com');

        updateUserPassword('student@example.com', 'NewPass123!');
        expect(validateUser('student@example.com', 'NewPass123!')).toEqual(jasmine.objectContaining({
            email: 'student@example.com'
        }));
    });

    it('creates and deletes sessions', () => {
        createUser('student@example.com', 'StudyPass123!');
        const sessionId = createSession('student@example.com');

        expect(getSession(sessionId)).toEqual(jasmine.objectContaining({
            email: 'student@example.com'
        }));

        deleteSession(sessionId);
        expect(getSession(sessionId)).toBeNull();
    });
});
