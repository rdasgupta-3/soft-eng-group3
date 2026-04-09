require('../support/world');
require('../support/serverLifecycle');
require('../support/chatCleanup');
const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { ensureUserExists } = require('../support/authTestUtils');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = '123456';

Given('I am on the login page', async function () {
  await ensureUserExists(TEST_EMAIL, TEST_PASSWORD);
  const page = await this.freshPage();
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await pause(800);
});

When('I enter a valid email and password', async function () {
  const page = await this.launch();
  await pause(300);
  await page.type('#email', TEST_EMAIL, { delay: 80 });
  await page.type('#password', TEST_PASSWORD, { delay: 80 });
});

When('I enter an invalid email and password', async function () {
  const page = await this.launch();
  await pause(300);
  await page.type('#email', 'wrong@test.com', { delay: 80 });
  await page.type('#password', 'wrongpassword', { delay: 80 });
});

When('I click the login button', async function () {
  const page = await this.launch();
  await pause(300);
  const button = await page.$('button[onclick="attemptLogin()"]');
  assert(button, 'Login button not found');
  await button.click();
  await pause(1200);
});

Then('I should go to the select page', async function () {
  const page = await this.launch();
  await pause(800);
  const url = page.url();
  if (!url.includes('/choose-player')) {
    throw new Error('Did not navigate to select page');
  }
});

Then('I should see an error message', async function () {
  const page = await this.launch();
  const content = await page.content();

  const hasError =
    content.includes('error') ||
    content.includes('invalid') ||
    content.includes('required') ||
    content.includes('Error');

  if (!hasError) {
    throw new Error('Expected an error message, but none was shown');
  }
});
