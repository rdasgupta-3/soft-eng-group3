const { Given, When, Then, After } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const assert = require('assert');

let browser;
let page;

After(async function () {
  if (browser) {
    try {
      await browser.close();
    } catch (error) {}
  }
  browser = null;
  page = null;
});

// ─── Shared setup ────────────────────────────────────────────────────────────

async function launchOnLoginPage() {
  browser = await puppeteer.launch({ headless: false });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// ─── Step definitions ─────────────────────────────────────────────────────────

When('I click the {string} link', async function (linkText) {
  await launchOnLoginPage();
  await new Promise(resolve => setTimeout(resolve, 800));
  const [link] = await page.$x(`//a[contains(text(), "${linkText}")]`);
  assert(link, `Could not find link with text: ${linkText}`);
  await link.click();
  await new Promise(resolve => setTimeout(resolve, 1200));
});

Then('I should be on the Forgot Password page', async function () {
  const url = page.url();
  assert(
    url.includes('forgot-password') || url.includes('forgot_password'),
    `Expected Forgot Password page, got ${url}`
  );
});

Then('I should see a {string} title', async function (titleText) {
  await new Promise(resolve => setTimeout(resolve, 500));
  const content = await page.evaluate(() => document.body.innerText);
  assert(
    content.includes(titleText),
    `Expected to find title "${titleText}" on page`
  );
});

Then('I should see an email input field', async function () {
  const emailInput = await page.$('input[type="email"], input[name="email"], input[id="email"]');
  assert(emailInput, 'Email input field not found on page');
});

Then('I should see a {string} button', async function (buttonText) {
  const [button] = await page.$x(`//button[contains(text(), "${buttonText}")]`);
  assert(button, `Expected to find button with text: ${buttonText}`);
});

Given('I am on the Forgot Password page', async function () {
  await launchOnLoginPage();
  await new Promise(resolve => setTimeout(resolve, 800));
  const [link] = await page.$x('//a[contains(text(), "Forgot Password")]');
  assert(link, 'Could not find Forgot Password link on login page');
  await link.click();
  await new Promise(resolve => setTimeout(resolve, 1200));
});

When('I enter my email {string}', async function (email) {
  const emailInput = await page.$('input[type="email"], input[name="email"], input[id="email"]');
  assert(emailInput, 'Email input field not found');
  await page.$eval('input[type="email"], input[name="email"], input[id="email"]', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, email);
});

When('I click {string}', async function (buttonText) {
  await new Promise(resolve => setTimeout(resolve, 500));
  const [button] = await page.$x(`//button[contains(text(), "${buttonText}")]`);
  assert(button, `Could not find button with text: ${buttonText}`);
  await button.click();
  await new Promise(resolve => setTimeout(resolve, 1200));
});

Then('I should see the message {string}', async function (expectedMessage) {
  await new Promise(resolve => setTimeout(resolve, 800));
  const content = await page.evaluate(() => document.body.innerText);
  assert(
    content.includes(expectedMessage),
    `Expected message "${expectedMessage}" not found on page`
  );
});

Then('I should be on the Login page', async function () {
  const url = page.url();
  const isLoginPage =
    url === 'http://localhost:3000/' ||
    url.includes('login') ||
    url.includes('index');
  assert(isLoginPage, `Expected Login page, got ${url}`);
  await browser.close();
});
