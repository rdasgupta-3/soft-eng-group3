const { Given, When, Then, After } = require('@cucumber/cucumber');
const assert = require('assert');
const { ensureUserExists } = require('../support/authTestUtils');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

Given('I am logged in as {string} with password {string}', async function (email, password) {
  await ensureUserExists(email, password);
  const page = await this.freshPage();
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await pause(600);
  await page.type('#email', email, { delay: 70 });
  await page.type('#password', password, { delay: 70 });
  const loginButton = await page.$('button[onclick="attemptLogin()"]');
  assert(loginButton, 'Login button not found');
  await loginButton.click();
  await pause(1200);
});

Given('I am on the AI chat page', async function () {
  const page = await this.launch();
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  await pause(1000);
});

When('I type a message into the chat input field', async function () {
  const page = await this.launch();
  await pause(400);
  await page.type('#userInput', 'Hello from Puppeteer', { delay: 80 });
});

When('I submit the message', async function () {
  const page = await this.launch();
  const selector = await page.$('.input-area button');
  assert(selector, 'Send button not found');
  this.aiBubbleCountBeforeSubmit = await page.$$eval('#messages .ai-bubble', nodes => nodes.length);
  await selector.click();
  await pause(1500);
});

Then('my message should be displayed in the chat history', async function () {
  const page = await this.launch();
  const messages = await page.$$eval('#messages .user-bubble', nodes =>
    nodes.map(n => n.textContent.trim())
  );
  assert(messages.includes('Hello from Puppeteer'), 'Sent message not found in chat history');
});

Then('an AI response should be returned in the chat', async function () {
  const page = await this.launch();
  await pause(1000);
  const responses = await page.$$eval('#messages .ai-bubble', nodes => nodes.length);
  assert(
    responses > (this.aiBubbleCountBeforeSubmit || 0),
    'Expected a new AI response after submit'
  );
});

When('I log out', async function () {
  const page = await this.launch();
  const button = await page.$('.logout-btn');
  assert(button, 'Logout button not found');
  await button.click();
  await pause(1200);
});

Then('I should be on the landing page', async function () {
  const page = await this.launch();
  const url = page.url();
  if (!url.endsWith('/') && !url.includes('login')) {
    throw new Error(`Expected landing page, got ${url}`);
  }
});
