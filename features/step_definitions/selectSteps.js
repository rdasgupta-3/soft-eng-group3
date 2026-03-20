const { Given, When, Then, After } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const assert = require('assert');

let browser;
let page;
let selectedModel;

After(async function () {
  if (browser) {
    try {
      await browser.close();
    } catch (error) {}
  }
  browser = null;
  page = null;
  selectedModel = null;
});

Given('I am on the AI model selector page as an authenticated user', async function () {
  browser = await puppeteer.launch({ headless: false });
  page = await browser.newPage();
  await page.goto(`file://${process.cwd()}/select.html`);
  selectedModel = null;
});

Then('I should see at least 3 model options', async function () {
  const count = await page.$$eval('.player-card', nodes => nodes.length);
  assert(count >= 3, `Expected at least 3 model options, found ${count}`);
});

Then('each model option should have a name, avatar, and description', async function () {
  const invalidCount = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.player-card')).filter(card => {
      const name = card.querySelector('h3');
      const avatar = card.querySelector('.player-image, img');
      const description = card.querySelector('p');
      const hasName = Boolean(name && name.textContent.trim().length > 0);
      const hasAvatar = Boolean(avatar);
      const hasDescription = Boolean(description && description.textContent.trim().length > 0);
      return !(hasName && hasAvatar && hasDescription);
    }).length;
  });
  assert.strictEqual(invalidCount, 0, `${invalidCount} model option(s) are missing a name, avatar, or description`);
});

When('I select the model {string}', async function (modelName) {
  selectedModel = modelName;
  const cards = await page.$$('.player-card');
  let clicked = false;

  for (const card of cards) {
    const heading = await card.$eval('h3', el => el.textContent.trim()).catch(() => '');
    const onclickText = await card.evaluate(el => el.getAttribute('onclick') || '');
    const isMatch = heading === modelName || onclickText.includes(modelName);

    if (isMatch) {
      const navigationDone = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 1500 }).catch(() => null);
      await card.click();
      await navigationDone;
      clicked = true;
      break;
    }
  }

  assert(clicked, `Could not find model option "${modelName}"`);
});

Then('exactly one model should be selected', async function () {
  const saved = await page.evaluate(() => localStorage.getItem('selectedPlayer'));
  assert(saved && saved.trim().length > 0, 'Expected exactly one selected model value to be stored');
  if (selectedModel) {
    assert.strictEqual(saved, selectedModel, `Expected selected model to be ${selectedModel}, got ${saved}`);
  }
});

Then('the selected model should be saved', async function () {
  const saved = await page.evaluate(() => localStorage.getItem('selectedPlayer'));
  if (selectedModel) {
    assert.strictEqual(saved, selectedModel, `Expected selected model to be ${selectedModel}, got ${saved}`);
    return;
  }
  assert(saved && saved.trim().length > 0, 'Expected selected model to be saved in localStorage');
});

Then('I can continue to the AI chat page', async function () {
  let url = page.url();

  if (!url.includes('chat')) {
    const button = await page.$('button#continue-btn, button.continue-btn, a.continue-btn, button[data-testid="continue"]');
    if (button) {
      const navigationDone = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 1500 }).catch(() => null);
      await button.click();
      await navigationDone;
      url = page.url();
    }
  }

  if (!url.includes('chat')) {
    throw new Error(`Expected chat page, got ${url}`);
  }
  await browser.close();
});