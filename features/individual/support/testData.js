const { Before } = require('@cucumber/cucumber');
const fs = require('fs');
const path = require('path');

const TEST_DATA_DIR = path.join(__dirname, '..', '..', '..', '.test-data', 'cucumber');

Before(function () {
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
});
