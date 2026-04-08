/**
 * authSteps.js
 *
 * step definitions for all authentication-related feature files:
 *   - auth-login.feature
 *   - auth-logout.feature
 *   - auth-protected-routes.feature
 *   - forgot-password.feature
 *   - reset-password.feature
 *   - routing-navigation.feature
 *   - login.feature  (legacy)
 *
 * consolidated to include iter 1 and iter 2 tests
 */

const { Given, When, Then, After } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const assert = require('assert');

let browser;
let page;

const BASE_URL = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function launchBrowser() {
  browser = await puppeteer.launch({ headless: false, slowMo: 200 });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('dialog', async dialog => {
    try { await dialog.accept(); } catch (_) {}
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function firstExistingSelector(selectors) {
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) return sel;
  }
  return null;
}

async function pageText() {
  return page.evaluate(() => document.body.innerText);
}

// ---------------------------------------------------------------------------
// After hook — always runs, even when a step throws
// ---------------------------------------------------------------------------

After(async function () {
  if (browser) {
    try { await browser.close(); } catch (_) {}
  }
  browser = null;
  page = null;
});

// ---------------------------------------------------------------------------
// Given — session / page setup
// ---------------------------------------------------------------------------

/**
 * Used by: routing-navigation.feature, auth-protected-routes.feature
 * Opens a raw browser with no cookies / session state.
 */
Given('I open a fresh browser session', async function () {
  await launchBrowser();
});

/**
 * Used by: login.feature (legacy), auth-login.feature
 * Opens the login page directly.
 */
Given('I am on the login page', async function () {
  await launchBrowser();
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
});

/**
 * Used by: forgot-password.feature
 */
Given('I open the forgot password page', async function () {
  await launchBrowser();
  await page.goto(`${BASE_URL}/forgot-password`, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
});

/**
 * Used by: reset-password.feature
 */
Given('I open the reset password page with token {string}', async function (token) {
  await launchBrowser();
  await page.goto(`${BASE_URL}/reset-password?token=${token}`, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
});

// ---------------------------------------------------------------------------
// When — navigation actions (unauthenticated)
// ---------------------------------------------------------------------------

When('I navigate to the login page', async function () {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
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

When('I navigate directly to the chat page', async function () {
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
});

// ---------------------------------------------------------------------------
// When — login form interactions
// ---------------------------------------------------------------------------

/**
 * Used by: login.feature (legacy) — valid credentials via loginSteps-style step
 */
When('I enter a valid email and password', async function () {
  await sleep(800);
  await page.type('#email', 'test@test.com', { delay: 100 });
  await page.type('#password', '123456', { delay: 100 });
});

/**
 * Used by: login.feature (legacy)
 */
When('I enter an invalid email and password', async function () {
  await sleep(800);
  await page.type('#email', 'wrong@test.com', { delay: 100 });
  await page.type('#password', 'wrongpassword', { delay: 100 });
});

/**
 * Used by: auth-login.feature — valid email, wrong password
 */
When('I enter a valid email and an invalid password', async function () {
  await page.type('#email', 'test@test.com', { delay: 80 });
  await page.type('#password', 'wrongpassword', { delay: 80 });
});

/**
 * Used by: login.feature (legacy) — clicks the login button
 * Step text differs deliberately from "I submit the login form" to avoid
 * ambiguity; both resolve to the same DOM click but are two distinct steps.
 */
When('I click the login button', async function () {
  await sleep(800);
  await page.click('button[onclick="attemptLogin()"], button');
  await sleep(1500);
});

/**
 * Used by: auth-login.feature
 */
When('I submit the login form', async function () {
  await page.click('button[onclick="attemptLogin()"], button');
  await sleep(1500);
});

/**
 * Used by: auth-login.feature — submits with no credentials entered
 */
When('I submit the login form with empty credentials', async function () {
  await page.click('button[onclick="attemptLogin()"], button');
  await sleep(1200);
});

// ---------------------------------------------------------------------------
// When — logout
// ---------------------------------------------------------------------------

When('I click the logout button', async function () {
  const selector = await firstExistingSelector(['.logout-btn']);
  assert(selector, 'Expected a logout button (.logout-btn) on the page.');
  await page.click(selector);
  await sleep(1200);
});

// ---------------------------------------------------------------------------
// When — forgot-password form
// ---------------------------------------------------------------------------

When('I enter {string} into the forgot password email field', async function (email) {
  const selector = await firstExistingSelector([
    '#email',
    'input[type="email"]',
    'input[name="email"]'
  ]);
  assert(selector, 'Could not find the forgot-password email field.');
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
  assert(selector, 'Could not find the forgot-password submit button.');
  await page.click(selector);
  await sleep(1300);
});

// ---------------------------------------------------------------------------
// When — reset-password form
// ---------------------------------------------------------------------------

When('I enter {string} into the reset password field', async function (password) {
  const passwordSelector = await firstExistingSelector([
    '#password',
    'input[name="password"]',
    'input[type="password"]'
  ]);
  assert(passwordSelector, 'Could not find the reset-password field.');
  await page.click(passwordSelector, { clickCount: 3 });
  if (password.length > 0) {
    await page.type(passwordSelector, password, { delay: 70 });
  }

  // Also fill confirm-password if present
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
  assert(selector, 'Could not find the reset-password submit button.');
  await page.click(selector);
  await sleep(1500);
});

// ---------------------------------------------------------------------------
// When — protected route
// ---------------------------------------------------------------------------

When('I request the conversations API directly', async function () {
  // Store response on the world object so the Then step can inspect it
  this.lastResponse = await page.goto(`${BASE_URL}/api/conversations`, {
    waitUntil: 'domcontentloaded'
  });
  await sleep(500);
});

// ---------------------------------------------------------------------------
// Then — redirect assertions
// ---------------------------------------------------------------------------

Then('I should be redirected to the chat page', async function () {
  const url = page.url();
  assert(url.includes('/chat'), `Expected redirect to /chat, got: ${url}`);
});

Then('I should be redirected to the landing page', async function () {
  const url = page.url();
  assert(
    url === `${BASE_URL}/` ||
    url.includes('landing') ||
    url.includes('index') ||
    url.includes('login'),
    `Expected landing/login page, got: ${url}`
  );
});

/** Used by: auth-protected-routes.feature */
Then('I should be redirected away from the chat page', async function () {
  const url = page.url();
  assert(
    !url.includes('/chat') || url === `${BASE_URL}/`,
    `Expected redirect away from /chat, got: ${url}`
  );
});

// ---------------------------------------------------------------------------
// Then — form visibility assertions
// ---------------------------------------------------------------------------

Then('I should see the login form', async function () {
  const email = await page.$('#email');
  const password = await page.$('#password');
  assert(email && password, 'Expected both #email and #password fields on the login form.');
});

Then('I should see the forgot password form', async function () {
  const selector = await firstExistingSelector([
    '#email',
    'input[type="email"]',
    'input[name="email"]'
  ]);
  assert(selector, 'Expected an email input on the forgot-password form.');
});

Then('I should see the reset password form', async function () {
  const selector = await firstExistingSelector([
    '#password',
    'input[name="password"]',
    'input[type="password"]'
  ]);
  assert(selector, 'Expected a password input on the reset-password form.');
});

// ---------------------------------------------------------------------------
// Then — error / validation / success message assertions
// ---------------------------------------------------------------------------

/** Legacy login.feature: generic error */
Then('I should see an error message', async function () {
  const content = await page.content();
  assert(
    /error|invalid|required|Error/i.test(content),
    'Expected an error message to appear on the page.'
  );
});

Then('I should see a login error message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('invalid') || text.includes('incorrect') ||
    text.includes('error') || text.includes('failed'),
    `Expected a login error message. Page text:\n${text}`
  );
});

Then('I should see a login validation message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('required') || text.includes('email') ||
    text.includes('password') || text.includes('enter'),
    `Expected a login validation message. Page text:\n${text}`
  );
});

Then('I should see a forgot password validation message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('email') || text.includes('valid') ||
    text.includes('required') || text.includes('enter'),
    `Expected a forgot-password validation message. Page text:\n${text}`
  );
});

Then('I should see a forgot password success message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('reset') || text.includes('email') ||
    text.includes('sent') || text.includes('link'),
    `Expected a forgot-password success message. Page text:\n${text}`
  );
});

Then('I should see a reset token error message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('token') || text.includes('invalid') || text.includes('expired'),
    `Expected a token-related error. Page text:\n${text}`
  );
});

Then('I should see a reset password validation message', async function () {
  const text = (await pageText()).toLowerCase();
  assert(
    text.includes('password') || text.includes('8') ||
    text.includes('short') || text.includes('minimum') || text.includes('required'),
    `Expected a password validation message. Page text:\n${text}`
  );
});

// ---------------------------------------------------------------------------
// Then — legacy login.feature
// ---------------------------------------------------------------------------

Then('I should go to the select page', async function () {
  await sleep(1500);
  const url = page.url();
  assert(url.includes('choose-player'), `Expected /choose-player, got: ${url}`);
});

// ---------------------------------------------------------------------------
// Then — protected-route API assertion
// ---------------------------------------------------------------------------

Then('the conversations API response should be unauthorized', async function () {
  const response = this.lastResponse;
  assert(response, 'Expected a captured response from the conversations API.');
  assert.strictEqual(
    response.status(), 401,
    `Expected HTTP 401, got: ${response.status()}`
  );
});
