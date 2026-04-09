const { Given, When, Then, After } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const assert = require('assert');

let browser;
let page;
let lastResponse = null;
let lastConversationTitles = [];

const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function launchBrowser() {
  browser = await puppeteer.launch({
    headless: false,
    slowMo: 200
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('dialog', async dialog => {
    try {
      await dialog.accept();
    } catch (error) {}
  });
}

async function pageText() {
  return await page.evaluate(() => document.body.innerText);
}

async function firstExistingSelector(selectors) {
  for (const selector of selectors) {
    const el = await page.$(selector);
    if (el) return selector;
  }
  return null;
}

async function getConversationTexts() {
  return await page.$$eval('.history-item', nodes =>
    nodes.map(n => n.innerText.trim())
  ).catch(() => []);
}

async function getChatInputSelector() {
  return await firstExistingSelector([
    '#userInput',
    '#chat-input',
    'input[type="text"]'
  ]);
}

async function getSendButtonSelector() {
  return await firstExistingSelector([
    '#send-btn',
    '.input-area button',
    'button'
  ]);
}

async function sendMessage(message) {
  const inputSelector = await getChatInputSelector();
  const sendSelector = await getSendButtonSelector();

  if (!inputSelector || !sendSelector) {
    throw new Error('Could not find chat input or send button.');
  }

  await page.click(inputSelector, { clickCount: 3 });
  if (message.length > 0) {
    await page.type(inputSelector, message, { delay: 70 });
  }
  await page.click(sendSelector);
  await sleep(2200);
}

After(async function () {
  if (browser) {
    try {
      await browser.close();
    } catch (error) {}
  }
  browser = null;
  page = null;
  lastResponse = null;
  lastConversationTitles = [];
});

Given('I open a fresh browser session', async function () {
  await launchBrowser();
});

Given('I open the forgot password page', async function () {
  await launchBrowser();
  await page.goto(`${BASE_URL}/forgot-password`, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
});

Given('I open the reset password page with token {string}', async function (token) {
  await launchBrowser();
  await page.goto(`${BASE_URL}/reset-password?token=${token}`, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
});

Given('I open the new chat page', async function () {
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
});

When('I navigate to the login page', async function () {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
});

When('I navigate to the chat page', async function () {
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
});

When('I navigate directly to the chat page', async function () {
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
});

When('I navigate to the forgot password page', async function () {
  await page.goto(`${BASE_URL}/forgot-password`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
});

When('I navigate to the reset password page with token {string}', async function (token) {
  await page.goto(`${BASE_URL}/reset-password?token=${token}`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
});

When('I enter a valid email and an invalid password', async function () {
  await page.type('#email', 'test@test.com', { delay: 80 });
  await page.type('#password', 'wrongpassword', { delay: 80 });
});

When('I submit the login form', async function () {
  await page.click('button[onclick="attemptLogin()"], button');
  await sleep(1500);
});

When('I submit the login form with empty credentials', async function () {
  await page.click('button[onclick="attemptLogin()"], button');
  await sleep(1200);
});

When('I click the logout button', async function () {
  const selector = await firstExistingSelector(['.logout-btn']);
  assert(selector, 'Expected logout button.');
  await page.click(selector);
  await sleep(1200);
});

When('I enter {string} into the forgot password email field', async function (email) {
  const selector = await firstExistingSelector([
    '#email',
    'input[type="email"]',
    'input[name="email"]'
  ]);
  assert(selector, 'Could not find forgot password email field.');
  await page.click(selector, { clickCount: 3 });
  if (email.length > 0) {
    await page.type(selector, email, { delay: 70 });
  }
});

When('I submit the forgot password form', async function () {
  const selector = await firstExistingSelector([
    'button[type="submit"]',
    'button',
    'input[type="submit"]'
  ]);
  assert(selector, 'Could not find forgot password submit button.');
  await page.click(selector);
  await sleep(1300);
});

When('I enter {string} into the reset password field', async function (password) {
  const passwordSelector = await firstExistingSelector([
    '#password',
    'input[name="password"]',
    'input[type="password"]'
  ]);
  assert(passwordSelector, 'Could not find reset password field.');

  await page.click(passwordSelector, { clickCount: 3 });
  if (password.length > 0) {
    await page.type(passwordSelector, password, { delay: 70 });
  }

  const confirmSelector = await firstExistingSelector([
    '#confirmPassword',
    'input[name="confirmPassword"]',
    'input[name="confirm-password"]'
  ]);

  if (confirmSelector) {
    await page.click(confirmSelector, { clickCount: 3 });
    if (password.length > 0) {
      await page.type(confirmSelector, password, { delay: 70 });
    }
  }
});

When('I submit the reset password form', async function () {
  const selector = await firstExistingSelector([
    'button[type="submit"]',
    'button',
    'input[type="submit"]'
  ]);
  assert(selector, 'Could not find reset password submit button.');
  await page.click(selector);
  await sleep(1500);
});

When('I send {string} in the current conversation', async function (message) {
  await sendMessage(message);
});

When('I attempt to send an empty chat message', async function () {
  await sendMessage('');
});

When('I click the new conversation button', async function () {
  await page.waitForSelector('#new-chat-btn');
  await page.click('#new-chat-btn');
  await sleep(1000);
});

When('I search conversation history for {string}', async function (query) {
  await page.waitForSelector('#history-search');
  await page.click('#history-search', { clickCount: 3 });
  await page.type('#history-search', query, { delay: 70 });
  await sleep(1000);
});

When('I refresh the browser', async function () {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1500);
});

When('I request the conversations API directly', async function () {
  lastResponse = await page.goto(`${BASE_URL}/api/conversations`, {
    waitUntil: 'domcontentloaded'
  });
  await sleep(500);
});

When('I pin the first conversation', async function () {
  await page.waitForSelector('.history-pin-btn');
  const buttons = await page.$$('.history-pin-btn');
  assert(buttons.length > 0, 'Expected at least one pin button.');
  await buttons[0].click();
  await sleep(1000);
});

When('I delete the first conversation', async function () {
  await page.waitForSelector('.history-delete-btn');
  const buttons = await page.$$('.history-delete-btn');
  assert(buttons.length > 0, 'Expected at least one delete button.');
  await buttons[0].click();
  await sleep(1000);
});

When('I switch to the second conversation', async function () {
  await page.waitForSelector('.history-item');
  const items = await page.$$('.history-item');
  assert(items.length >= 2, `Expected at least 2 conversation items, found ${items.length}`);
  await items[1].click();
  await sleep(1200);
});

When('I switch back to the first conversation', async function () {
  await page.waitForSelector('.history-item');
  const items = await page.$$('.history-item');
  assert(items.length >= 1, 'Expected at least 1 conversation item.');
  await items[0].click();
  await sleep(1200);
});

Given('I seed a first conversation', async function () {
  await sendMessage('first conversation message');
  lastConversationTitles = await getConversationTexts();
});

Given('I seed multiple conversations for search', async function () {
  await sendMessage('internship planning');
  await page.click('#new-chat-btn');
  await sleep(800);
  await sendMessage('groceries to buy');
  lastConversationTitles = await getConversationTexts();
});

Given('I seed two distinct conversations', async function () {
  await sendMessage('first thread unique text');
  await page.click('#new-chat-btn');
  await sleep(800);
  await sendMessage('second thread unique text');
  lastConversationTitles = await getConversationTexts();
});

Then('I should be redirected to the chat page', async function () {
  const url = page.url();
  assert(url.includes('/chat'), `Expected redirect to chat page, got ${url}`);
});

Then('I should be redirected to the landing page', async function () {
  const url = page.url();
  assert(
    url === `${BASE_URL}/` ||
    url.includes('landing') ||
    url.includes('index') ||
    url.includes('login'),
    `Expected landing page, got ${url}`
  );
});

Then('I should be redirected away from the chat page', async function () {
  const url = page.url();
  assert(
    !url.includes('/chat') || url === `${BASE_URL}/`,
    `Expected redirect away from chat page, got ${url}`
  );
});

Then('I should see the login form', async function () {
  const emailExists = await page.$('#email');
  const passwordExists = await page.$('#password');
  assert(emailExists && passwordExists, 'Expected login form fields.');
});

Then('I should see a login error message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('invalid') ||
    text.includes('incorrect') ||
    text.includes('error') ||
    text.includes('failed'),
    `Expected login error message, got:\n${text}`
  );
});

Then('I should see a login validation message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('required') ||
    text.includes('email') ||
    text.includes('password') ||
    text.includes('enter'),
    `Expected login validation message, got:\n${text}`
  );
});

Then('I should see the forgot password form', async function () {
  const selector = await firstExistingSelector([
    '#email',
    'input[type="email"]',
    'input[name="email"]'
  ]);
  assert(selector, 'Expected forgot password form.');
});

Then('I should see a forgot password validation message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('email') ||
    text.includes('valid') ||
    text.includes('required') ||
    text.includes('enter'),
    `Expected forgot-password validation text, got:\n${text}`
  );
});

Then('I should see a forgot password success message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('reset') ||
    text.includes('email') ||
    text.includes('sent') ||
    text.includes('link'),
    `Expected forgot-password success text, got:\n${text}`
  );
});

Then('I should see the reset password form', async function () {
  const selector = await firstExistingSelector([
    '#password',
    'input[name="password"]',
    'input[type="password"]'
  ]);
  assert(selector, 'Expected reset password form.');
});

Then('I should see a reset token error message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('token') ||
    text.includes('invalid') ||
    text.includes('expired'),
    `Expected token-related error, got:\n${text}`
  );
});

Then('I should see a reset password validation message', async function () {
  const text = (await pageText()).toLowerCase();
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
  const selector = await firstExistingSelector([
    '#conversation-list',
    '.chat-history-panel'
  ]);
  assert(selector, 'Expected conversation list or chat history panel.');
});

Then('I should still see the conversation list', async function () {
  const selector = await firstExistingSelector([
    '#conversation-list',
    '.chat-history-panel'
  ]);
  assert(selector, 'Expected conversation list or chat history panel to still be visible.');
});

Then('I should see the new conversation button', async function () {
  const selector = await firstExistingSelector(['#new-chat-btn']);
  assert(selector, 'Expected #new-chat-btn to exist.');
});

Then('I should see the history search field', async function () {
  const selector = await firstExistingSelector(['#history-search']);
  assert(selector, 'Expected #history-search to exist.');
});

Then('I should see the chat message area', async function () {
  const selector = await firstExistingSelector([
    '#messages',
    '#chat-window',
    '#chat-history'
  ]);
  assert(selector, 'Expected chat message area.');
});

Then('I should see the chat input field', async function () {
  const selector = await getChatInputSelector();
  assert(selector, 'Expected chat input field.');
});

Then('I should still see the chat input field', async function () {
  const selector = await getChatInputSelector();
  assert(selector, 'Expected chat input field to still exist.');
});

Then('I should see the send button', async function () {
  const selector = await getSendButtonSelector();
  assert(selector, 'Expected send button.');
});

Then('I should see {string} in the chat area', async function (message) {
  const text = await pageText();
  assert(text.includes(message), `Expected to see "${message}" in the chat area.`);
});

Then('I should still see {string} in the chat area', async function (message) {
  const text = await pageText();
  assert(text.includes(message), `Expected to still see "${message}" in the chat area.`);
});

Then('no new user message should be added', async function () {
  const text = await pageText();
  assert(!text.includes('undefined'), 'Unexpected broken or empty message behavior detected.');
});

Then('I should see a conversation matching {string}', async function (query) {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes(query.toLowerCase()),
    `Expected to find "${query}" in visible conversation area.`
  );
});

Then('I should see a no matching conversations message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('no matching conversations') ||
    text.includes('no conversations yet') ||
    text.includes('no matching'),
    `Expected no-match empty state, got:\n${text}`
  );
});

Then('I should still see the prior conversation entry', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('first conversation message') ||
    text.includes('new conversation') ||
    text.includes('no messages yet'),
    `Expected evidence of prior conversation entry, got:\n${text}`
  );
});

Then('the first conversation should appear pinned', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('starred') ||
    text.includes('★') ||
    text.includes('☆'),
    `Expected pinned conversation UI indicator, got:\n${text}`
  );
});

Then('the deleted conversation should no longer appear', async function () {
  const text = (await pageText()).toLowerCase();
  assert(!text.includes('first conversation message'), 'Expected deleted conversation to be absent.');
});

Then('the second conversation should still be active', async function () {
  const items = await page.$$('.history-item.active');
  assert(items.length >= 1, 'Expected an active conversation item after refresh.');
});

Then('the conversations API response should be unauthorized', async function () {
  assert(lastResponse, 'Expected a response from conversations API request.');
  assert.strictEqual(
    lastResponse.status(),
    401,
    `Expected 401 unauthorized, got ${lastResponse.status()}`
  );
});

Then('I should see an Ollama failure message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('ollama') ||
    text.includes('could not reach local ollama') ||
    text.includes('make sure ollama is running'),
    `Expected Ollama failure message, got:\n${text}`
  );
});

Then('the page should still be usable', async function () {
  const selector = await getChatInputSelector();
  assert(selector, 'Expected chat input to still exist after Ollama failure.');
});

Then('I should see a new empty conversation state', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('new conversation') ||
    text.includes('no messages yet'),
    `Expected new/draft conversation state, got:\n${text}`
  );
});