const http = require('http');

function getParsedBaseUrl() {
    return new URL(process.env.TEST_BASE_URL || 'http://localhost:3000');
}

function sendJsonRequest(method, routePath, body) {
    return new Promise((resolve, reject) => {
        const parsed = getParsedBaseUrl();
        const payload = body ? JSON.stringify(body) : null;

        const req = http.request({
            hostname: parsed.hostname,
            port: parsed.port,
            path: routePath,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload ? Buffer.byteLength(payload) : 0
            }
        }, res => {
            let data = '';
            res.on('data', chunk => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body: data ? JSON.parse(data) : {},
                    headers: res.headers
                });
            });
        });

        req.on('error', reject);

        if (payload) {
            req.write(payload);
        }

        req.end();
    });
}

async function createTestUser(email, password) {
    const response = await sendJsonRequest('POST', '/api/signup', { email, password });
    if (response.status !== 201) {
        throw new Error(`Failed to create test user: ${response.status}`);
    }
}

module.exports = {
    createTestUser
};
