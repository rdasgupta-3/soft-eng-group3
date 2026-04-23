const { Given, When, Then, After } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');
const assert = require('assert');

let browser;
let page;
let initialTextSize = 16;

After(async function () {
    if (browser) {
        try {
            await browser.close();
        } catch (error) {}
    }
    browser = null;
    page = null;
    initialTextSize = 16;
});

Given('I am logged in', async function () {
    browser = await puppeteer.launch({
        headless: false,
        slowMo: 100,
        args: ['--start-maximized'],
        defaultViewport: null
    });
    page = await browser.newPage();
    this.browser = browser;  
    this.page = page;         

    await page.goto('http://localhost:3000/');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.type('#email', 'testuser@test.com', { delay: 20 });
    await page.type('#password', 'passwo1234567', { delay: 20 });
    await new Promise(resolve => setTimeout(resolve, 800));
    await page.click('button[onclick="attemptLogin()"]');
    await new Promise(resolve => setTimeout(resolve, 1500));
});

Given('I am on the chat page', async function () {
    this.page = this.page || page;
    await this.page.goto('http://localhost:3000/chat', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 1200));
});

Given('I have increased the text size', async function () {
    await page.click('#increaseTextBtn');
    await new Promise(resolve => setTimeout(resolve, 500));
});

Given('I enabled bold text', async function () {
    await page.click('#boldToggleBtn');
    await new Promise(resolve => setTimeout(resolve, 500));
});

Given('I increased the text size', async function () {
    await page.click('#increaseTextBtn');
    await new Promise(resolve => setTimeout(resolve, 500));
});

Given('there is a message in the chat', async function () {
    await page.type('#userInput', 'Test message', { delay: 10 });
    await new Promise(resolve => setTimeout(resolve, 300));
    await page.click('button[onclick="sendMessage()"]');
    await new Promise(resolve => setTimeout(resolve, 1000));
});

When('I click the {string} button', async function (buttonLabel) {
    if (buttonLabel === 'Bold') {
        await page.click('#boldToggleBtn');
    } else if (buttonLabel === 'A+') {
        await page.click('#increaseTextBtn');
    } else if (buttonLabel === 'A-') {
        await page.click('#decreaseTextBtn');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
});

When('I click {string}', async function (buttonLabel) {
    if (buttonLabel === 'A-') {
        await page.click('#decreaseTextBtn');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
});

When('I send a message {string}', async function (message) {
    await page.type('#userInput', message, { delay: 20 });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.click('button[onclick="sendMessage()"]');
    await new Promise(resolve => setTimeout(resolve, 1000));
});

Then('all chat messages should appear in bold', async function () {
    await page.waitForSelector('#messages .bubble', { timeout: 10000 });
    const allBold = await page.$$eval('#messages .bubble', bubbles =>
        bubbles.every(b => b.classList.contains('bold'))
    );
    assert(allBold, 'Expected all chat bubbles to have the bold class');
});

Then('the text size should increase', async function () {
    const fontSize = await page.$eval('#chat-window', el => el.style.fontSize);
    const size = parseInt(fontSize);
    assert(size > initialTextSize, `Expected font size > ${initialTextSize}px, got ${size}px`);
});

Then('the text size should decrease', async function () {
    const fontSize = await page.$eval('#chat-window', el => el.style.fontSize);
    const size = parseInt(fontSize);
    assert(size < 18, `Expected font size < 18px after decrease, got ${size}px`);
});

Then('the message should appear with bold formatting', async function () {

    await page.waitForSelector('#messages .bubble', { timeout: 10000 });
    
    const isBold = await page.evaluate(() => {
        const last = document.querySelector('#messages .bubble:last-child');
        return last ? last.classList.contains('bold') : false;
    });
    assert(isBold, 'Expected the last message bubble to have bold formatting');
});

Then('the message should appear with the increased text size', async function () {
    await page.waitForSelector('#messages .bubble', { timeout: 10000 });

    const containerSize = await page.$eval('#chat-window', el => el.style.fontSize);
    const bubbleSize = await page.$eval('#messages .bubble:last-child', el => el.style.fontSize);
    assert.strictEqual(bubbleSize, containerSize, `Expected bubble font size ${bubbleSize} to match container ${containerSize}`);
});

