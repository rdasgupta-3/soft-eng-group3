const { resetTestData } = require('./helpers/testData');
const {
    DEFAULT_PREFERENCES,
    getPreferences,
    savePreferences,
    normalizePreferences
} = require('../utils/preferencesStore');

describe('preferencesStore', () => {
    beforeEach(() => {
        resetTestData();
    });

    it('returns the default accessibility settings for a new user', () => {
        expect(getPreferences('student@example.com')).toEqual(DEFAULT_PREFERENCES);
    });

    it('normalizes bold text, high contrast, and bounded font scale values', () => {
        expect(normalizePreferences({
            boldText: 1,
            highContrast: 'yes',
            fontScale: 2.4
        })).toEqual({
            boldText: true,
            highContrast: true,
            fontScale: 1.6
        });

        expect(normalizePreferences({
            boldText: 0,
            highContrast: 0,
            fontScale: 0.2
        })).toEqual({
            boldText: false,
            highContrast: false,
            fontScale: 0.8
        });
    });

    it('saves and reloads accessibility preferences per user', () => {
        const saved = savePreferences('student@example.com', {
            boldText: true,
            highContrast: true,
            fontScale: 1.3
        });

        expect(saved).toEqual({
            boldText: true,
            highContrast: true,
            fontScale: 1.3
        });

        expect(getPreferences('student@example.com')).toEqual(saved);
    });
});
