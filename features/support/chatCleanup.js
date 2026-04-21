const { Before } = require('@cucumber/cucumber');
const {
  DEFAULT_TEST_PASSWORD,
  ensureUserExists,
  sendJsonRequestWithRetry
} = require('./authTestUtils');

const TEST_ACCOUNTS = [
  { email: 'test@test.com', password: DEFAULT_TEST_PASSWORD },
  { email: 'user@example.com', password: 'ValidPass123!' }
];

async function clearConversationsForAccount({ email, password }) {
  await ensureUserExists(email, password);
  const loginResponse = await sendJsonRequestWithRetry('POST', '/api/login', { email, password });

  if (loginResponse.status !== 200) {
    return;
  }

  const cookieHeader = (loginResponse.headers && loginResponse.headers['set-cookie'])
    ? loginResponse.headers['set-cookie'].map(entry => entry.split(';')[0]).join('; ')
    : '';

  if (!cookieHeader) {
    return;
  }

  const listResponse = await sendJsonRequestWithRetry('GET', '/api/conversations', null, { Cookie: cookieHeader });
  if (listResponse.status !== 200) {
    return;
  }

  let payload;
  try {
    payload = JSON.parse(listResponse.body || '{}');
  } catch (error) {
    return;
  }

  const conversations = Array.isArray(payload.conversations) ? payload.conversations : [];
  for (const conversation of conversations) {
    if (conversation && conversation.id) {
      await sendJsonRequestWithRetry('DELETE', `/api/conversations/${conversation.id}`, null, { Cookie: cookieHeader });
    }
  }
}

Before(async function () {
  for (const account of TEST_ACCOUNTS) {
    await clearConversationsForAccount(account);
  }
});
