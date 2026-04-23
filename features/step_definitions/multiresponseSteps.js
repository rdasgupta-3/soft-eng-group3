const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

When('I enter {string} into the message box', async function (text) {
    await page.type('#userInput', text, { delay: 20 });
});

When('I press "Send"', async function () {
    await page.click('.input-area button');
    await page.waitForTimeout(1500);
});

Then('I should see three distinct responses', async function () {
    await page.waitForSelector('#multi-model-container', { timeout: 8000 });

    const phi = await page.$('#multi-bubble-phi');
    const gemma = await page.$('#multi-bubble-gemma');
    const deepseek = await page.$('#multi-bubble-deepseek');

    assert(phi, 'Missing Phi response');
    assert(gemma, 'Missing Gemma response');
    assert(deepseek, 'Missing DeepSeek response');
});

Then('each response should indicate which model produced it', async function () {
    const labels = await page.$$eval('.multi-model-label', els => els.map(e => e.textContent.trim()));

    assert(labels.includes('Phi'));
    assert(labels.includes('Gemma'));
    assert(labels.includes('DeepSeek'));
});

Given('I have received responses from multiple models', async function () {
    await page.type('#userInput', 'Hello', { delay: 20 });
    await page.click('.input-area button');
    await page.waitForSelector('#multi-model-container', { timeout: 8000 });
});

When('I choose one of the models as my preferred model', async function () {
    await page.click('#multi-btn-phi');
    await page.waitForTimeout(800);
});

Then('future replies should come only from that model', async function () {
    await page.type('#userInput', 'Test follow-up', { delay: 20 });
    await page.click('.input-area button');

    await page.waitForSelector('.ai-bubble', { timeout: 8000 });

    const text = await page.$eval('.ai-bubble:last-child', el => el.textContent);
    assert(text.length > 0);
});

When('I send a prompt', async function () {
    await page.type('#userInput', 'Hello', { delay: 20 });
    await page.click('.input-area button');
});

Then('I should see an error message for that model', async function () {
    const text = await page.$eval('#multi-model-container', el => el.textContent);
    assert(text.includes('failed'), 'Expected failure message');
});

Then('I should still see responses from the other models', async function () {
    const phi = await page.$('#multi-bubble-phi');
    const gemma = await page.$('#multi-bubble-gemma');
    const deepseek = await page.$('#multi-bubble-deepseek');

    assert(phi || gemma || deepseek, 'Expected at least one working model');
});