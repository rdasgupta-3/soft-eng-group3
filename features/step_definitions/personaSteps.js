const { Given, When, Then } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const assert = require('assert');

let browser;
let page;

Given('I am on the persona selection page', async function () {
    browser = await puppeteer.launch({
        headless: false,
        slowMo: 80,
        args: ['--start-maximized'],
        defaultViewport: null
    });

    page = await browser.newPage();
    await page.goto('http://localhost:3000/players.html');
});

When('I choose the {string} persona', async function (persona) {
    await page.click(`#persona-${persona}`);
    await page.waitForTimeout(800);
});

When('I enter the chat page', async function () {
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
});

Then('I should see the persona name {string} in the typing indicator', async function (expectedName) {
    await page.waitForSelector('.typing-bubble', { timeout: 5000 });

    const text = await page.$eval('.typing-bubble', el => el.textContent.trim());
    assert(text.includes(expectedName), `Expected typing bubble to contain ${expectedName}, got ${text}`);
})