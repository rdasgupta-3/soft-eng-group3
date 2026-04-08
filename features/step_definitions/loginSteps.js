// const { Given, When, Then } = require('@cucumber/cucumber');
// const puppeteer = require('puppeteer');
// const assert = require('assert');

// let browser;
// let page;

// Given('I am on the login page', async function () {
//   browser = await puppeteer.launch({
//     headless: false,
//     slowMo: 300
//   });

//   page = await browser.newPage();
//   await page.setViewport({ width: 1280, height: 800 });

//   // UPDATED TO LOCALHOST
//   await page.goto('http://localhost:3000/');
//   await new Promise(resolve => setTimeout(resolve, 1200));
// });

// When('I enter a valid email and password', async function () {
//   await new Promise(resolve => setTimeout(resolve, 800));
//   await page.type('#email', 'test@test.com', { delay: 100 });
//   await page.type('#password', '123456', {delay: 100});
// });

// When('I enter an invalid email and password', async function () {
//   await new Promise(resolve => setTimeout(resolve, 800));
//   await page.type('#email', 'wrong@test.com', { delay: 100 });
//   await page.type('#password', 'wrongpassword', { delay: 100 });
// });

// When('I click the login button', async function () {
//   await new Promise(resolve => setTimeout(resolve, 800));
//   await page.click('button');
// });

// Then('I should go to the select page', async function () {
//   await new Promise(resolve => setTimeout(resolve, 1500));

//   const url = page.url();

//   // UPDATED TO MATCH EXPRESS ROUTE
//   if (!url.includes('choose-player')) {
//     throw new Error('Did not navigate to select page');
//   }

//   await browser.close();
// });

// Then('I should see an error message', async function () {
//   const content = await page.content();

//   const hasError =
//     content.includes('error') ||
//     content.includes('invalid') ||
//     content.includes('required') ||
//     content.includes('Error'); // Catch our specific error text

//   if (!hasError) {
//     throw new Error('Expected an error message, but none was shown');
//   }
// });