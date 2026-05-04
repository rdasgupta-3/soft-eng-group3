const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

let initialPersonaName = '';

Given('I am on the Triad.ai chat interface', async function () {
    // 1. Explicitly navigate to the chat page so the robot doesn't get lost!
    await this.page.goto('http://localhost:3000/chat', { waitUntil: 'domcontentloaded' });

    // 2. Give the app an extra second to finish rendering
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Explicitly wait for the UI element to exist
    await this.page.waitForSelector('#current-persona-name', { timeout: 10000 });

    // 4. Now it is safe to read the text
    initialPersonaName = await this.page.$eval('#current-persona-name', el => el.textContent.trim());
});

When('I click the "Switch Personality" button', async function () {
    // Click the exact button ID using 'this.page'
    await this.page.click('#switch-persona-btn');
});

Then('the displayed personality name should change to the next catalog option', async function () {
    // Grab the new name after the click using 'this.page'
    const newPersonaName = await this.page.$eval('#current-persona-name', el => el.textContent.trim());

    // Assert that the name actually changed!
    assert.notStrictEqual(initialPersonaName, newPersonaName, 'The personality name did not change after clicking the button!');
});
