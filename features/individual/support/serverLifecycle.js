const { BeforeAll, AfterAll } = require('@cucumber/cucumber');
const path = require('path');
const fs = require('fs');

const TEST_DATA_DIR = path.join(__dirname, '..', '..', '..', '.test-data', 'cucumber');
const TEST_PORT = process.env.TEST_PORT || '3210';
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.PORT = TEST_PORT;
process.env.TEST_BASE_URL = `http://localhost:${TEST_PORT}`;
process.env.TEST_MODE = '1';

const { createApp } = require('../../../server');

let server = null;

BeforeAll(async function () {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    const app = createApp();

    await new Promise((resolve, reject) => {
        server = app.listen(Number(TEST_PORT), error => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
});

AfterAll(async function () {
    if (!server) {
        return;
    }

    await new Promise(resolve => {
        server.close(() => resolve());
    });

    server = null;
});
