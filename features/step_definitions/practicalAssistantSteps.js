const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

Given('I open the practical assistant as {string}', async function (personaId) {
  const page = await this.launch();
  const models = 'ollama-llama3.2-1b,openai-gpt-4o-mini,google-gemini-2.0-flash';
  await page.goto(`${BASE_URL}/chat?persona=${encodeURIComponent(personaId)}&models=${models}`, { waitUntil: 'domcontentloaded' });
  await pause(1000);
});

async function sendPracticalMessage(world, message) {
  const page = await world.launch();
  await page.click('#userInput', { clickCount: 3 });
  await page.type('#userInput', message, { delay: 40 });
  await page.click('.input-area button');
}

When('I ask an equation question in the current conversation', async function () {
  await sendPracticalMessage(this, 'Could you work out 3x - 6 = 12 for me?');
});

When('I ask a weather question in the current conversation', async function () {
  await sendPracticalMessage(this, 'How is the weather looking for Boston?');
});

Given('I selected a backend model', async function () {
  const page = await this.launch();
  const selectedModels = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('llmSelectedModelIds') || '[]');
    } catch (error) {
      return [];
    }
  });
  assert(selectedModels.length >= 1, 'Expected at least one selected backend model.');
});

When('I ask {string}', async function (message) {
  await sendPracticalMessage(this, message);
});

Then('the practical assistant should answer with {string}', async function (expectedText) {
  const page = await this.launch();
  await page.waitForFunction(
    text => document.body.innerText.includes(text),
    { timeout: 8000 },
    expectedText
  );
  const bodyText = await page.evaluate(() => document.body.innerText);
  assert(bodyText.includes(expectedText), `Expected practical assistant answer to include "${expectedText}".`);
});

Then('the practical assistant should show an equation answer', async function () {
  const page = await this.launch();
  await page.waitForFunction(
    () => document.body.innerText.includes('x = 6') || document.body.innerText.includes('answer is 6'),
    { timeout: 8000 }
  );
});

Then('the practical assistant should show a weather prediction', async function () {
  const page = await this.launch();
  await page.waitForFunction(
    () => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('prediction for boston') || text.includes('forecast for boston') || text.includes('weather');
    },
    { timeout: 8000 }
  );
  const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
  assert(!bodyText.includes('demo'), 'Weather response should not use the word demo.');
});

Then('the assistant should provide a playful uncertainty-aware weather response', async function () {
  const page = await this.launch();
  await page.waitForFunction(
    () => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('royal') || text.includes('lord silly') || text.includes('sky council') || text.includes('weather caution');
    },
    { timeout: 12000 }
  );
  const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
  assert(bodyText.includes('weather'), 'Expected a weather response.');
});

Then('the response should mention a general trend rather than claiming exact certainty', async function () {
  const page = await this.launch();
  await page.waitForFunction(
    () => document.body.innerText.toLowerCase().includes('trend'),
    { timeout: 12000 }
  );
  const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
  assert(bodyText.includes('trend'), 'Expected the response to mention a trend.');
  assert(!bodyText.includes('will rain exactly at 7:13 pm'), 'Response should not claim exact minute-level certainty.');
});
