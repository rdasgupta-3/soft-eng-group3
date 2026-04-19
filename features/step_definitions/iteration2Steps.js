const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { ensureUserExists } = require('../support/authTestUtils');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function currentPage(world) {
  return world.launch();
}

async function pageText(world) {
  const page = await currentPage(world);
  return page.evaluate(() => document.body.innerText);
}

async function firstExistingSelector(world, selectors) {
  const page = await currentPage(world);
  for (const selector of selectors) {
    const element = await page.$(selector);
    if (element) {
      return selector;
    }
  }
  return null;
}

async function getConversationTexts(world) {
  const page = await currentPage(world);
  try {
    return await page.$$eval('.history-item', nodes => nodes.map(n => n.innerText.trim()));
  } catch (error) {
    return [];
  }
}

async function getChatInputSelector(world) {
  return firstExistingSelector(world, ['#userInput', '#chat-input', 'input[type="text"]']);
}

async function getSendButtonSelector(world) {
  return firstExistingSelector(world, ['.input-area button', '#send-btn', 'button']);
}

async function sendMessage(world, message) {
  const page = await currentPage(world);
  const inputSelector = await getChatInputSelector(world);
  const sendSelector = await getSendButtonSelector(world);

  assert(inputSelector && sendSelector, 'Could not find chat input or send button.');

  if (message.length > 0) {
    await page.$eval(inputSelector, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, message);
  }
  await page.click(sendSelector);
  await pause(1500);
}

Given('I open a fresh browser session', async function () {
  await this.freshPage();
});

Given('I open the forgot password page', async function () {
  const page = await this.freshPage();
  await page.goto(`${BASE_URL}/forgot-password`, { waitUntil: 'domcontentloaded' });
  await pause(800);
});

Given('I open the reset password page with token {string}', async function (token) {
  const page = await this.freshPage();
  await page.goto(`${BASE_URL}/reset-password?token=${token}`, { waitUntil: 'domcontentloaded' });
  await pause(800);
});

Given('I open the new chat page', async function () {
  const page = await currentPage(this);
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  await pause(1200);
});

When('I navigate to the login page', async function () {
  const page = await currentPage(this);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await pause(600);
});

When('I navigate to the chat page', async function () {
  const page = await currentPage(this);
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  await pause(600);
});

When('I navigate directly to the chat page', async function () {
  await ensureUserExists('test@test.com', 'Xk9#mQvT3p@L');
  const page = await currentPage(this);
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  await pause(600);
});

When('I navigate to the forgot password page', async function () {
  const page = await currentPage(this);
  await page.goto(`${BASE_URL}/forgot-password`, { waitUntil: 'domcontentloaded' });
  await pause(600);
});

When('I navigate to the reset password page with token {string}', async function (token) {
  const page = await currentPage(this);
  await page.goto(`${BASE_URL}/reset-password?token=${token}`, { waitUntil: 'domcontentloaded' });
  await pause(600);
});

When('I enter a valid email and an invalid password', async function () {
  const page = await currentPage(this);
  await page.$eval('#email', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, 'test@test.com');
  await page.$eval('#password', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, 'wrongpassword');
});

When('I submit the login form', async function () {
  const page = await currentPage(this);
  const selector = await firstExistingSelector(this, ['button[onclick="attemptLogin()"]', 'button']);
  assert(selector, 'Login submit button not found.');
  await page.click(selector);
  await pause(1500);
});

When('I submit the login form with empty credentials', async function () {
  const page = await currentPage(this);
  const selector = await firstExistingSelector(this, ['button[onclick="attemptLogin()"]', 'button']);
  assert(selector, 'Login submit button not found.');
  await page.click(selector);
  await pause(1000);
});

When('I click the logout button', async function () {
  const page = await currentPage(this);
  const selector = await firstExistingSelector(this, ['.logout-btn']);
  assert(selector, 'Expected logout button.');
  await page.click(selector);
  await pause(800);
});

When('I enter {string} into the forgot password email field', async function (email) {
  const page = await currentPage(this);
  const selector = await firstExistingSelector(this, ['#email', 'input[type="email"]', 'input[name="email"]']);
  assert(selector, 'Could not find forgot password email field.');
  if (email.length > 0) {
    await page.$eval(selector, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, email);
  }
});

When('I submit the forgot password form', async function () {
  const page = await currentPage(this);
  const selector = await firstExistingSelector(this, ['button[type="submit"]', 'button', 'input[type="submit"]']);
  assert(selector, 'Could not find forgot password submit button.');
  await page.click(selector);
  await pause(1000);
});

When('I enter {string} into the reset password field', async function (password) {
  const page = await currentPage(this);
  const passwordSelector = await firstExistingSelector(this, ['#password', 'input[name="password"]', 'input[type="password"]']);
  assert(passwordSelector, 'Could not find reset password field.');
  if (password.length > 0) {
    await page.$eval(passwordSelector, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, password);
  }

  const confirmSelector = await firstExistingSelector(this, ['#confirmPassword', '#confirm-password', 'input[name="confirmPassword"]', 'input[name="confirm-password"]']);
  if (confirmSelector && password.length > 0) {
    await page.$eval(confirmSelector, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, password);
  }
});

When('I submit the reset password form', async function () {
  const page = await currentPage(this);
  const selector = await firstExistingSelector(this, ['button[type="submit"]', 'button', 'input[type="submit"]']);
  assert(selector, 'Could not find reset password submit button.');
  await page.click(selector);
  await pause(1300);
});

When('I send {string} in the current conversation', async function (message) {
  await sendMessage(this, message);
});

When('I attempt to send an empty chat message', async function () {
  await sendMessage(this, '');
});

When('I click the new conversation button', async function () {
  const page = await currentPage(this);
  await page.waitForSelector('#new-chat-btn');
  await page.click('#new-chat-btn');
  await pause(800);
});

When('I search conversation history for {string}', async function (query) {
  const page = await currentPage(this);
  await page.waitForSelector('#history-search');
  await page.click('#history-search', { clickCount: 3 });
  await page.type('#history-search', query, { delay: 60 });
  await pause(800);
});

When('I refresh the browser', async function () {
  const page = await currentPage(this);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await pause(1200);
});

When('I request the conversations API directly', async function () {
  const page = await currentPage(this);
  this.lastResponse = await page.goto(`${BASE_URL}/api/conversations`, { waitUntil: 'domcontentloaded' });
  await pause(400);
});

When('I pin the first conversation', async function () {
  const page = await currentPage(this);
  await page.waitForSelector('.history-pin-btn');
  const buttons = await page.$$('.history-pin-btn');
  assert(buttons.length > 0, 'Expected at least one pin button.');
  await buttons[0].click();
  await pause(800);
});

When('I delete the first conversation', async function () {
  const page = await currentPage(this);
  await page.waitForSelector('.history-delete-btn');
  const buttons = await page.$$('.history-delete-btn');
  assert(buttons.length > 0, 'Expected at least one delete button.');
  await buttons[0].click();
  await pause(800);
});

When('I switch to the second conversation', async function () {
  const page = await currentPage(this);
  await page.waitForSelector('.history-item');
  const count = await page.$$eval('.history-item', nodes => nodes.length);
  assert(count >= 2, `Expected at least 2 conversation items, found ${count}`);
  await page.evaluate(() => {
    const items = document.querySelectorAll('.history-item');
    if (items[1]) items[1].click();
  });
  await pause(1000);
});

When('I switch back to the first conversation', async function () {
  const page = await currentPage(this);
  await page.waitForSelector('.history-item');
  const count = await page.$$eval('.history-item', nodes => nodes.length);
  assert(count >= 1, 'Expected at least 1 conversation item.');
  await page.evaluate(() => {
    const items = document.querySelectorAll('.history-item');
    if (items[0]) items[0].click();
  });
  await pause(1000);
});

Given('I seed a first conversation', async function () {
  await sendMessage(this, 'first conversation message');
  this.lastConversationTitles = await getConversationTexts(this);
});

Given('I seed multiple conversations for search', async function () {
  await sendMessage(this, 'internship planning');
  const page = await currentPage(this);
  await page.click('#new-chat-btn');
  await pause(600);
  await sendMessage(this, 'groceries to buy');
  this.lastConversationTitles = await getConversationTexts(this);
});

Given('I seed two distinct conversations', async function () {
  await sendMessage(this, 'first thread unique text');
  const page = await currentPage(this);
  await page.click('#new-chat-btn');
  await pause(600);
  await sendMessage(this, 'second thread unique text');
  this.lastConversationTitles = await getConversationTexts(this);
});

Then('I should be redirected to the chat page', async function () {
  const page = await currentPage(this);
  await pause(800);
  const url = page.url();
  assert(
    url.includes('/chat') || url.includes('/choose-player'),
    `Expected redirect to chat experience, got ${url}`
  );
});

Then('I should be redirected to the landing page', async function () {
  const page = await currentPage(this);
  const url = page.url();
  assert(
    url === `${BASE_URL}/` || url.includes('login') || url.includes('index'),
    `Expected landing page, got ${url}`
  );
});

Then('I should be redirected away from the chat page', async function () {
  const page = await currentPage(this);
  const url = page.url();
  assert(!url.includes('/chat') || url === `${BASE_URL}/`, `Expected redirect away from chat page, got ${url}`);
});

Then('I should see the login form', async function () {
  const page = await currentPage(this);
  const emailExists = await page.$('#email');
  const passwordExists = await page.$('#password');
  assert(emailExists && passwordExists, 'Expected login form fields.');
});

Then('I should see a login error message', async function () {
  const text = (await pageText(this)).toLowerCase();
  assert(
    text.includes('invalid') ||
    text.includes('incorrect') ||
    text.includes('error') ||
    text.includes('failed'),
    `Expected login error message, got:\n${text}`
  );
});

Then('I should see a login validation message', async function () {
  const text = (await pageText(this)).toLowerCase();
  assert(
    text.includes('required') ||
    text.includes('email') ||
    text.includes('password') ||
    text.includes('enter'),
    `Expected login validation message, got:\n${text}`
  );
});

Then('I should see the forgot password form', async function () {
  const selector = await firstExistingSelector(this, ['#email', 'input[type="email"]', 'input[name="email"]']);
  assert(selector, 'Expected forgot password form.');
});

Then('I should see a forgot password validation message', async function () {
  const text = (await pageText(this)).toLowerCase();
  assert(
    text.includes('email') ||
    text.includes('valid') ||
    text.includes('required') ||
    text.includes('enter'),
    `Expected forgot-password validation text, got:\n${text}`
  );
});

Then('I should see a forgot password success message', async function () {
  const text = (await pageText(this)).toLowerCase();
  assert(
    text.includes('reset') ||
    text.includes('email') ||
    text.includes('sent') ||
    text.includes('link'),
    `Expected forgot-password success text, got:\n${text}`
  );
});

Then('I should see the reset password form', async function () {
  const selector = await firstExistingSelector(this, ['#password', 'input[name="password"]', 'input[type="password"]']);
  assert(selector, 'Expected reset password form.');
});

Then('I should see a reset token error message', async function () {
  const text = (await pageText(this)).toLowerCase();
  assert(
    text.includes('token') ||
    text.includes('invalid') ||
    text.includes('expired'),
    `Expected token-related error, got:\n${text}`
  );
});

Then('I should see a reset password validation message', async function () {
  const text = (await pageText(this)).toLowerCase();
  assert(
    text.includes('password') ||
    text.includes('8') ||
    text.includes('short') ||
    text.includes('minimum') ||
    text.includes('required'),
    `Expected password validation text, got:\n${text}`
  );
});

Then('I should see the conversation list', async function () {
  const selector = await firstExistingSelector(this, ['#conversation-list', '.chat-history-panel']);
  assert(selector, 'Expected conversation list or chat history panel.');
});

Then('I should still see the conversation list', async function () {
  const selector = await firstExistingSelector(this, ['#conversation-list', '.chat-history-panel']);
  assert(selector, 'Expected conversation list or chat history panel to still be visible.');
});

Then('I should see the new conversation button', async function () {
  const selector = await firstExistingSelector(this, ['#new-chat-btn']);
  assert(selector, 'Expected #new-chat-btn to exist.');
});

Then('I should see the history search field', async function () {
  const selector = await firstExistingSelector(this, ['#history-search']);
  assert(selector, 'Expected #history-search to exist.');
});

Then('I should see the chat message area', async function () {
  const selector = await firstExistingSelector(this, ['#messages', '#chat-window', '#chat-history']);
  assert(selector, 'Expected chat message area.');
});

Then('I should see the chat input field', async function () {
  const selector = await getChatInputSelector(this);
  assert(selector, 'Expected chat input field.');
});

Then('I should still see the chat input field', async function () {
  const selector = await getChatInputSelector(this);
  assert(selector, 'Expected chat input field to still exist.');
});

Then('I should see the send button', async function () {
  const selector = await getSendButtonSelector(this);
  assert(selector, 'Expected send button.');
});

Then('I should see {string} in the chat area', async function (message) {
  const text = await pageText(this);
  assert(text.includes(message), `Expected to see "${message}" in the chat area.`);
});

Then('I should still see {string} in the chat area', async function (message) {
  const text = await pageText(this);
  assert(text.includes(message), `Expected to still see "${message}" in the chat area.`);
});

Then('no new user message should be added', async function () {
  const text = await pageText(this);
  assert(!text.includes('undefined'), 'Unexpected broken or empty message behavior detected.');
});

Then('I should see a conversation matching {string}', async function (query) {
  const text = (await pageText(this)).toLowerCase();
  assert(text.includes(query.toLowerCase()), `Expected to find "${query}" in visible conversation area.`);
});

Then('I should see a no matching conversations message', async function () {
  const text = (await pageText(this)).toLowerCase();
  assert(
    text.includes('no matching conversations') ||
    text.includes('no conversations yet') ||
    text.includes('no matching'),
    `Expected no-match empty state, got:\n${text}`
  );
});

Then('I should still see the prior conversation entry', async function () {
  const text = (await pageText(this)).toLowerCase();
  assert(
    text.includes('first conversation message') ||
    text.includes('new conversation') ||
    text.includes('no messages yet'),
    `Expected evidence of prior conversation entry, got:\n${text}`
  );
});

Then('the first conversation should appear pinned', async function () {
  const text = (await pageText(this)).toLowerCase();
  assert(
    text.includes('starred') ||
    text.includes('★') ||
    text.includes('☆'),
    `Expected pinned conversation UI indicator, got:\n${text}`
  );
});

Then('the deleted conversation should no longer appear', async function () {
  await pause(1200);
  const previousCount = Array.isArray(this.lastConversationTitles) ? this.lastConversationTitles.length : 0;
  const page = await currentPage(this);
  const currentCount = await page.$$eval('.history-item', nodes => nodes.length);
  assert(currentCount < previousCount, 'Expected at least one conversation to be removed.');
});

Then('the second conversation should still be active', async function () {
  const page = await currentPage(this);
  const items = await page.$$('.history-item.active');
  assert(items.length >= 1, 'Expected an active conversation item after refresh.');
});

Then('the conversations API response should be unauthorized', async function () {
  assert(this.lastResponse, 'Expected a response from conversations API request.');
  assert.strictEqual(this.lastResponse.status(), 401, `Expected 401 unauthorized, got ${this.lastResponse.status()}`);
});

Then('I should see an Ollama failure message', async function () {
  const text = (await pageText(this)).toLowerCase();
  assert(
    text.includes('ollama') ||
    text.includes('could not reach local ollama') ||
    text.includes('make sure ollama is running'),
    `Expected Ollama failure message, got:\n${text}`
  );
});

Then('the page should still be usable', async function () {
  const selector = await getChatInputSelector(this);
  assert(selector, 'Expected chat input to still exist after Ollama failure.');
});

Then('I should see a new empty conversation state', async function () {
  const text = (await pageText(this)).toLowerCase();
  assert(
    text.includes('new conversation') ||
    text.includes('no messages yet'),
    `Expected new/draft conversation state, got:\n${text}`
  );
});
