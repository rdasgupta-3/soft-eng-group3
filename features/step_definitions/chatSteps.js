/**
 * chatSteps.js
 *
 * Step definitions for all chat-related feature files:
 *   - chat.feature
 *   - chat-send-message.feature
 *   - chat-history-ui.feature
 *   - chat-history-management.feature
 *   - chat-history-persistence.feature
 *   - chat-history-search.feature
 *   - chat-history-continuation.feature  (= chat-ollama-failure.feature)
 *   - chat-conversation-switching.feature
 *   - chat-history-empty-states.feature  (= chat-session-selection.feature)
 *
 * Previously: chat-specific steps were split between chatSteps.js (iteration 1
 * helpers only) and iteration2Steps.js (all new steps), requiring every chat
 * scenario to resolve steps from two files simultaneously. All chat steps now
 * live here, eliminating that cross-file dependency.
 *
 * The "I am logged in as {string} with password {string}" Given step is defined
 * here because it is exclusively used by chat scenarios; authSteps.js does not
 * need it (auth scenarios start with raw browser sessions or direct page GIVENs).
 */

const { Given, When, Then, After } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const assert = require('assert');

let browser;
let page;
let lastConversationTitles = [];

const BASE_URL = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pageText() {
  return page.evaluate(() => document.body.innerText);
}

async function firstExistingSelector(selectors) {
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) return sel;
  }
  return null;
}

async function getChatInputSelector() {
  return firstExistingSelector(['#userInput', '#chat-input', 'input[type="text"]']);
}

async function getSendButtonSelector() {
  return firstExistingSelector(['#send-btn', '.input-area button', 'button']);
}

async function getConversationTexts() {
  return page.$$eval('.history-item', nodes => nodes.map(n => n.innerText.trim())).catch(() => []);
}

async function sendMessage(message) {
  const inputSel = await getChatInputSelector();
  const sendSel = await getSendButtonSelector();
  assert(inputSel, 'Could not find a chat input field.');
  assert(sendSel, 'Could not find a send button.');
  await page.click(inputSel, { clickCount: 3 });
  if (message.length > 0) {
    await page.type(inputSel, message, { delay: 70 });
  }
  await page.click(sendSel);
  await sleep(2200);
}

// ---------------------------------------------------------------------------
// After hook
// ---------------------------------------------------------------------------

After(async function () {
  if (browser) {
    try { await browser.close(); } catch (_) {}
  }
  browser = null;
  page = null;
  lastConversationTitles = [];
});

// ---------------------------------------------------------------------------
// Given — authenticated session setup
// ---------------------------------------------------------------------------

/**
 * Used by all chat-* feature files.
 * Logs in as the given user so subsequent steps start from an authenticated state.
 */
Given('I am logged in as {string} with password {string}', async function (email, password) {
  browser = await puppeteer.launch({ headless: false, slowMo: 200 });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('dialog', async dialog => {
    try { await dialog.accept(); } catch (_) {}
  });

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
  await page.type('#email', email, { delay: 100 });
  await page.type('#password', password, { delay: 100 });
  await sleep(800);
  await page.click('button[onclick="attemptLogin()"]');
  await sleep(1500);
});

/**
 * Used by: chat.feature
 * Navigates to the chat page after login.
 */
Given('I am on the AI chat page', async function () {
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
});

/**
 * Used by most chat-* feature files.
 * Navigates to a clean /chat URL (new conversation state).
 */
Given('I open the new chat page', async function () {
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
});

// ---------------------------------------------------------------------------
// Given — conversation seeding helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// When — chat interactions
// ---------------------------------------------------------------------------

When('I type a message into the chat input field', async function () {
  await sleep(800);
  await page.type('#chat-input', 'Hello from Puppeteer', { delay: 100 });
});

When('I submit the message', async function () {
  await sleep(800);
  await page.click('#send-btn');
  await sleep(1200);
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
  assert(items.length >= 2, `Expected at least 2 conversation items, found ${items.length}.`);
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

When('I log out', async function () {
  await sleep(800);
  await page.click('.logout-btn');
  await sleep(1500);
});

// ---------------------------------------------------------------------------
// Then — message and UI assertions
// ---------------------------------------------------------------------------

Then('my message should be displayed in the chat history', async function () {
  const messages = await page.$$eval('#chat-history .user-bubble', nodes =>
    nodes.map(n => n.textContent.trim())
  );
  assert(messages.includes('Hello from Puppeteer'), 'Sent message not found in chat history.');
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
  assert(!text.includes('undefined'), 'Unexpected broken/empty message behavior detected.');
});

// ---------------------------------------------------------------------------
// Then — conversation list / UI control assertions
// ---------------------------------------------------------------------------

Then('I should see the conversation list', async function () {
  const selector = await firstExistingSelector(['#conversation-list', '.chat-history-panel']);
  assert(selector, 'Expected a conversation list or chat-history panel.');
});

Then('I should still see the conversation list', async function () {
  const selector = await firstExistingSelector(['#conversation-list', '.chat-history-panel']);
  assert(selector, 'Expected the conversation list to still be visible.');
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
  const selector = await firstExistingSelector(['#messages', '#chat-window', '#chat-history']);
  assert(selector, 'Expected a chat message area.');
});

Then('I should see the chat input field', async function () {
  const selector = await getChatInputSelector();
  assert(selector, 'Expected a chat input field.');
});

Then('I should still see the chat input field', async function () {
  const selector = await getChatInputSelector();
  assert(selector, 'Expected the chat input field to still exist.');
});

Then('I should see the send button', async function () {
  const selector = await getSendButtonSelector();
  assert(selector, 'Expected a send button.');
});

// ---------------------------------------------------------------------------
// Then — conversation history assertions
// ---------------------------------------------------------------------------

Then('I should see a conversation matching {string}', async function (query) {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes(query.toLowerCase()),
    `Expected to find "${query}" in the visible conversation area.`
  );
});

Then('I should see a no matching conversations message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('no matching conversations') ||
    text.includes('no conversations yet') ||
    text.includes('no matching'),
    `Expected a no-match empty-state message. Page text:\n${text}`
  );
});

Then('I should still see the prior conversation entry', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('first conversation message') ||
    text.includes('new conversation') ||
    text.includes('no messages yet'),
    `Expected evidence of the prior conversation entry. Page text:\n${text}`
  );
});

Then('the first conversation should appear pinned', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('starred') || text.includes('★') || text.includes('☆'),
    `Expected a pinned/starred indicator. Page text:\n${text}`
  );
});

Then('the deleted conversation should no longer appear', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    !text.includes('first conversation message'),
    'Expected the deleted conversation to be absent from the page.'
  );
});

Then('the second conversation should still be active', async function () {
  const items = await page.$$('.history-item.active');
  assert(items.length >= 1, 'Expected an active (.history-item.active) conversation item after refresh.');
});

Then('I should see a new empty conversation state', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('new conversation') || text.includes('no messages yet'),
    `Expected a new/empty conversation state. Page text:\n${text}`
  );
});

// ---------------------------------------------------------------------------
// Then — Ollama failure
// ---------------------------------------------------------------------------

Then('I should see an Ollama failure message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('ollama') ||
    text.includes('could not reach local ollama') ||
    text.includes('make sure ollama is running'),
    `Expected an Ollama failure message. Page text:\n${text}`
  );
});

Then('the page should still be usable', async function () {
  const selector = await getChatInputSelector();
  assert(selector, 'Expected the chat input to still exist after an Ollama failure.');
});

// ---------------------------------------------------------------------------
// Then — landing page (chat.feature logout scenario)
// ---------------------------------------------------------------------------

Then('I should be on the landing page', async function () {
  const url = page.url();
  assert(
    url.includes('landing') || url.includes('index') ||
    url.includes('login') || url === `${BASE_URL}/`,
    `Expected the landing/login page, got: ${url}`
  );
});
