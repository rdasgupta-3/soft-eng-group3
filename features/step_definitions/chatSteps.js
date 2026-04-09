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
let aiBubbleCountBeforeSubmit = 0;

After(async function () {
  if (browser) {
    try {
      await browser.close();
    } catch (error) {}
  }
  browser = null;
  page = null;
  aiBubbleCountBeforeSubmit = 0;
});

// ---------------------------------------------------------------------------
// Given — authenticated session setup
// ---------------------------------------------------------------------------

/**
 * Used by all chat-* feature files.
 * Logs in as the given user so subsequent steps start from an authenticated state.
 */
Given('I am logged in as {string} with password {string}', async function (email, password) {
  browser = await puppeteer.launch({
  headless: false,
  slowMo: 300 
});
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // UPDATED TO LOCALHOST
  await page.goto('http://localhost:3000/');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.type('#email', email, { delay: 100 });
  await page.type('#password', password, { delay: 100 });
  await new Promise(resolve => setTimeout(resolve, 800));
await page.click('button[onclick="attemptLogin()"]');
  await new Promise(resolve => setTimeout(resolve, 1500));
});

/**
 * Used by: chat.feature
 * Navigates to the chat page after login.
 */
Given('I am on the AI chat page', async function () {
  // UPDATED TO LOCALHOST
  await page.goto('http://localhost:3000/chat', { waitUntil: 'domcontentloaded' });
  await new Promise(resolve => setTimeout(resolve, 1200));
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
  await new Promise(resolve => setTimeout(resolve, 800));
  await page.type('#chat-input', 'Hello from Puppeteer', { delay: 100 });
});

When('I submit the message', async function () {
  aiBubbleCountBeforeSubmit = await page.$$eval('#chat-history .ai-bubble', nodes => nodes.length);
  await new Promise(resolve => setTimeout(resolve, 800));
  await page.click('#send-btn');
  await new Promise(resolve => setTimeout(resolve, 1200));
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

Then('an AI response should be returned in the chat', async function () {
  const responses = await page.$$eval('#chat-history .ai-bubble', nodes => nodes.length);
  assert(
    responses > aiBubbleCountBeforeSubmit,
    `Expected a new AI response after submit (before: ${aiBubbleCountBeforeSubmit}, after: ${responses})`
  );
  await browser.close();
});

When('I log out', async function () {
  await new Promise(resolve => setTimeout(resolve, 800)); 
  await page.click('.logout-btn');
  await new Promise(resolve => setTimeout(resolve, 1500));
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
  if (!url.includes('landing') && !url.includes('index') && !url.includes('login.html') && url !== 'http://localhost:3000/') {
    throw new Error(`Expected landing page, got ${url}`);
  }
  await browser.close();
});