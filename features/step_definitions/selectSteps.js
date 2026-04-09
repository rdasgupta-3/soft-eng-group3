const { Given, When, Then, After } = require('@cucumber/cucumber');
const assert = require('assert');
const { ensureUserExists } = require('../support/authTestUtils');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

Given('I am on the AI model selector page as an authenticated user', async function () {
  await ensureUserExists('test@test.com', '123456');
  const page = await this.freshPage();
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await pause(600);
  await page.type('#email', 'test@test.com', { delay: 70 });
  await page.type('#password', '123456', { delay: 70 });
  const loginButton = await page.$('button[onclick="attemptLogin()"]');
  assert(loginButton, 'Login button not found');
  await loginButton.click();
  await pause(1200);
  const url = page.url();
  assert(url.includes('/choose-player'), `Expected to land on choose-player, got ${url}`);
});

Then('I should see at least 3 model options', async function () {
  const page = await this.launch();
  const count = await page.$$eval('.player-card', nodes => nodes.length);
  assert(count >= 3, `Expected at least 3 model options, found ${count}`);
});

Then('each model option should have a name and avatar', async function () {
  const page = await this.launch();
  const invalidCount = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.player-card')).filter(card => {
      const name = card.querySelector('h3, .player-name'); // Made selector more flexible
      const avatar = card.querySelector('.player-image, img');
      const description = card.querySelector('p');
      const hasName = Boolean(name && name.textContent.trim().length > 0);
      const hasAvatar = Boolean(avatar);
      return !(hasName && hasAvatar);
    }).length;
  });
  assert.strictEqual(invalidCount, 0, `${invalidCount} model option(s) are missing a name and avatar`);
});

When('I select the model {string}', async function (modelName) {
  const page = await this.launch();
  const cards = await page.$$('.player-card');
  let clicked = false;

  for (const card of cards) {
    const heading = await card.$eval('h3, .player-name', el => el.textContent.trim()).catch(() => '');
    const onclickText = await card.evaluate(el => el.getAttribute('onclick') || '');
    const isMatch = heading === modelName || onclickText.includes(modelName);

    if (isMatch) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const navigationDone = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 2000 }).catch(() => null);
      await card.click();
      await navigationDone;
      await new Promise(resolve => setTimeout(resolve, 1200));
      clicked = true;
      break;
    }
  }

  assert(clicked, `Could not find model option "${modelName}"`);
});

Then('exactly one model should be selected', async function () {
  const page = await this.launch();
  await page.waitForFunction(() => window.location.href.includes('persona='), { timeout: 4000 }).catch(() => null);
  const currentUrl = page.url();
  assert(currentUrl.includes('persona='), 'Expected the selected model to be passed in the URL');
});

Then('the selected model should be saved', async function () {
  const page = await this.launch();
  await page.waitForFunction(() => window.location.href.includes('persona='), { timeout: 4000 }).catch(() => null);
  const currentUrl = page.url();
  assert(currentUrl.includes('persona='), 'Expected the selected model to be saved in the URL parameters');
});

Then('I can continue to the AI chat page', async function () {
  const page = await this.launch();
  const url = page.url();
  if (!url.includes('/chat')) {
    throw new Error(`Expected chat page, got ${url}`);
  }
});
