const { When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

When('I type the prompt {string} into the chat input', async function (promptText) {
    // Wait for the chatbox to be visible on the screen
    await this.page.waitForSelector('#userInput', { visible: true, timeout: 10000 });

    // Clear any existing text just in case, then type the new prompt
    await this.page.click('#userInput', { clickCount: 3 });
    await this.page.keyboard.press('Backspace');
    await this.page.type('#userInput', promptText);
});

When('I click the send message button', async function () {
    // The send button doesn't have an ID in your HTML, so we find it using its CSS class relationship
    await this.page.click('.input-area button');
});

Then('I should see my message {string} in the chat window', async function (expectedText) {
    // Wait for a user message bubble to appear
    await this.page.waitForSelector('.user-bubble', { visible: true, timeout: 5000 });

    // Grab all user bubbles and ensure at least one contains our text
    const userMessages = await this.page.$$eval('.user-bubble', bubbles => bubbles.map(b => b.textContent));
    const found = userMessages.some(text => text.includes(expectedText));

    assert.strictEqual(found, true, `Could not find the user message: "${expectedText}"`);
});

Then('the AI should generate a reply bubble', async function () {
    // The UI shows a typing indicator, so we must wait for the actual AI bubble to render.
    // We give it 15 seconds in case the backend LLM takes a moment to think.
    await this.page.waitForSelector('.ai-bubble', { visible: true, timeout: 15000 });

    // Verify the AI bubble actually has text inside it
    const aiResponseText = await this.page.$eval('.ai-bubble', el => el.textContent.trim());
    assert.ok(aiResponseText.length > 0, 'The AI reply bubble was completely empty!');
});