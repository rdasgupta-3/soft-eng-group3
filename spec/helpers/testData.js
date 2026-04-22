const fs = require('fs');
const path = require('path');

const TEST_DATA_DIR = path.join(__dirname, '..', '..', '.test-data', 'jasmine');
process.env.DATA_DIR = TEST_DATA_DIR;

function resetTestData() {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    const files = {
        'users.json': {},
        'sessions.json': {},
        'resetTokens.json': {},
        'preferences.json': {},
        'conversations.json': {}
    };

    Object.entries(files).forEach(([fileName, value]) => {
        fs.writeFileSync(path.join(TEST_DATA_DIR, fileName), JSON.stringify(value, null, 2), 'utf8');
    });
}

module.exports = {
    TEST_DATA_DIR,
    resetTestData
};
