const { readJson, writeJson } = require('./fileStore');

const PREFERENCES_FILE = 'preferences.json';
const DEFAULT_PREFERENCES = {
    boldText: false,
    highContrast: false,
    fontScale: 1
};

function clampFontScale(value) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
        return DEFAULT_PREFERENCES.fontScale;
    }

    return Math.min(1.6, Math.max(0.8, Math.round(numberValue * 100) / 100));
}

function normalizePreferences(input = {}) {
    return {
        boldText: Boolean(input.boldText),
        highContrast: Boolean(input.highContrast),
        fontScale: clampFontScale(input.fontScale)
    };
}

function getPreferences(email) {
    const data = readJson(PREFERENCES_FILE, {});
    return normalizePreferences(data[email] || DEFAULT_PREFERENCES);
}

function savePreferences(email, preferences) {
    const data = readJson(PREFERENCES_FILE, {});
    const normalized = normalizePreferences(preferences);

    data[email] = normalized;
    writeJson(PREFERENCES_FILE, data);

    return normalized;
}

module.exports = {
    DEFAULT_PREFERENCES,
    getPreferences,
    savePreferences,
    normalizePreferences
};
