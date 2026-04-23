const { Given, When, Then, After } = require('@cucumber/cucumber');
const assert = require('assert');

After(async function () {
});

Given('I am on the persona selection page', async function () {
    await this.page.goto('http://localhost:3000/players.html', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 500));
});

When('I choose the {string} persona', async function (persona) {
    await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        this.page.click(`#persona-${persona}`)
    ]);
    await new Promise(r => setTimeout(r, 1000));
});

When('I enter the chat page', async function () {
    await new Promise(r => setTimeout(r, 500));
});

When('I click the back button', async function () {
    await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
        this.page.click('.back-btn')
    ]);
});

Then('I should see the persona name {string} in the typing indicator', async function (expectedName) {
    await this.page.waitForSelector('#userInput', { timeout: 5000 });
    await this.page.type('#userInput', 'Hello', { delay: 20 });

    await Promise.all([
        this.page.waitForSelector('.typing', { timeout: 8000 }),
        this.page.click('button[onclick="sendMessage()"]')
    ]);

    const text = await this.page.$eval('.typing span', el => el.textContent.trim());
    assert(text.includes(expectedName), `Expected "${expectedName}", got "${text}"`);
});

Then('I should be on the persona selection page', async function () {
    const url = this.page.url();
    assert(
        url.includes('players'),
        `Expected to be on persona selection page, got ${url}`
    );
});