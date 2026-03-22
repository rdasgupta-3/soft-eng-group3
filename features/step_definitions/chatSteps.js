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

Given('I am logged in as {string} with password {string}', async function (email, password) {
  browser = await puppeteer.launch({
  headless: false,
  slowMo: 300 
});
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(`file://${process.cwd()}/public/login.html`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.type('#email', email, { delay: 100 });
  await page.type('#password', password, { delay: 100 });
  await new Promise(resolve => setTimeout(resolve, 800));
  await page.click('button.primary-btn');
  await new Promise(resolve => setTimeout(resolve, 1500));
});

Given('I am on the AI chat page', async function () {
  await page.goto(`file://${process.cwd()}/public/chat.html`, { waitUntil: 'domcontentloaded' });
  await new Promise(resolve => setTimeout(resolve, 1200));
});

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

Then('my message should be displayed in the chat history', async function () {
  const messages = await page.$$eval('#chat-history .user-bubble', nodes =>
    nodes.map(n => n.textContent.trim())
  );
  assert(messages.includes('Hello from Puppeteer'), 'Sent message not found in chat history');
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

Then('I should be on the landing page', async function () {
  const url = page.url();
  if (!url.includes('landing') && !url.includes('index') && !url.includes('login.html')) {
    throw new Error(`Expected landing page, got ${url}`);
  }
  await browser.close();
});