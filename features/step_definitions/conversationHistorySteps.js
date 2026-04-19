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

async function launchOnChatPage() {
  browser = await puppeteer.launch({ headless: false });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/chat', { waitUntil: 'domcontentloaded' });
  await new Promise(resolve => setTimeout(resolve, 1200));
}

// ─── Step definitions ─────────────────────────────────────────────────────────

When('I open the conversation history sidebar', async function () {
  await launchOnChatPage();
  await new Promise(resolve => setTimeout(resolve, 800));
  const sidebarToggle = await page.$('.sidebar-toggle, #sidebar-toggle, [aria-label="Open sidebar"]');
  if (sidebarToggle) {
    await sidebarToggle.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
});

Then('every conversation entry should display a star icon', async function () {
  const entries = await page.$$('.conversation-entry, .history-item, [data-conversation]');
  assert(entries.length > 0, 'No conversation entries found in sidebar');

  for (const entry of entries) {
    const starIcon = await entry.$('.star-icon, [aria-label="Star"], .star-btn, button.star');
    assert(starIcon, 'A conversation entry is missing a star icon');
  }
  await browser.close();
});

When('I click the star icon on conversation {string}', async function (conversationName) {
  await launchOnChatPage();
  await new Promise(resolve => setTimeout(resolve, 800));

  const sidebarToggle = await page.$('.sidebar-toggle, #sidebar-toggle, [aria-label="Open sidebar"]');
  if (sidebarToggle) {
    await sidebarToggle.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const entries = await page.$$('.conversation-entry, .history-item, [data-conversation]');
  let targetEntry = null;
  for (const entry of entries) {
    const text = await entry.evaluate(el => el.innerText);
    if (text.includes(conversationName)) {
      targetEntry = entry;
      break;
    }
  }

  assert(targetEntry, `Could not find conversation entry: ${conversationName}`);
  const starIcon = await targetEntry.$('.star-icon, [aria-label="Star"], .star-btn, button.star');
  assert(starIcon, `Star icon not found on conversation: ${conversationName}`);
  await starIcon.click();
  await new Promise(resolve => setTimeout(resolve, 800));
});

Then('the star icon should appear filled', async function () {
  await new Promise(resolve => setTimeout(resolve, 500));
  const filledStar = await page.$('.star-icon.filled, .star-icon.active, [aria-label="Unstar"], .star-btn.filled');
  assert(filledStar, 'Expected the star icon to appear filled after clicking');
});

Then('{string} should move to the Starred section within 2 seconds', async function (conversationName) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  const starredSection = await page.$('.starred-section, #starred-conversations, [data-section="starred"]');
  assert(starredSection, 'Starred section not found in sidebar');

  const starredText = await starredSection.evaluate(el => el.innerText);
  assert(
    starredText.includes(conversationName),
    `Expected "${conversationName}" to appear in the Starred section`
  );
  await browser.close();
});

Given('{string} is starred', async function (conversationName) {
  await launchOnChatPage();
  await new Promise(resolve => setTimeout(resolve, 800));

  const sidebarToggle = await page.$('.sidebar-toggle, #sidebar-toggle, [aria-label="Open sidebar"]');
  if (sidebarToggle) {
    await sidebarToggle.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const entries = await page.$$('.conversation-entry, .history-item, [data-conversation]');
  let targetEntry = null;
  for (const entry of entries) {
    const text = await entry.evaluate(el => el.innerText);
    if (text.includes(conversationName)) {
      targetEntry = entry;
      break;
    }
  }

  assert(targetEntry, `Could not find conversation entry: ${conversationName}`);

  const alreadyStarred = await targetEntry.$('.star-icon.filled, .star-icon.active, [aria-label="Unstar"]');
  if (!alreadyStarred) {
    const starIcon = await targetEntry.$('.star-icon, [aria-label="Star"], .star-btn, button.star');
    assert(starIcon, `Star icon not found on conversation: ${conversationName}`);
    await starIcon.click();
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
});

When('I click the filled star icon on {string}', async function (conversationName) {
  const starredSection = await page.$('.starred-section, #starred-conversations, [data-section="starred"]');
  const searchArea = starredSection || page;

  const entries = await searchArea.$$('.conversation-entry, .history-item, [data-conversation]');
  let targetEntry = null;
  for (const entry of entries) {
    const text = await entry.evaluate(el => el.innerText);
    if (text.includes(conversationName)) {
      targetEntry = entry;
      break;
    }
  }

  assert(targetEntry, `Could not find starred conversation entry: ${conversationName}`);
  const filledStar = await targetEntry.$('.star-icon.filled, .star-icon.active, [aria-label="Unstar"], .star-btn.filled');
  assert(filledStar, `Filled star icon not found on conversation: ${conversationName}`);
  await filledStar.click();
  await new Promise(resolve => setTimeout(resolve, 800));
});

Then('the icon should revert to an outline', async function () {
  await new Promise(resolve => setTimeout(resolve, 500));
  const outlineStar = await page.$('.star-icon:not(.filled):not(.active), [aria-label="Star"]');
  assert(outlineStar, 'Expected the star icon to revert to an outline after unstarring');
});

Then('{string} should return to the chronological history section', async function (conversationName) {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const historySection = await page.$('.history-section, #conversation-history, [data-section="history"]');
  assert(historySection, 'Chronological history section not found in sidebar');

  const historyText = await historySection.evaluate(el => el.innerText);
  assert(
    historyText.includes(conversationName),
    `Expected "${conversationName}" to return to the chronological history section`
  );
  await browser.close();
});
