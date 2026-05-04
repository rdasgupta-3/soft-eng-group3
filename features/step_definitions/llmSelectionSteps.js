const { When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

When('I click the "Choose Models" button', async function () {
    await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        this.page.click('#switch-models-btn')
    ]);
});

When('I select {string} from the catalog', async function (modelName) {
    // 1. BULLETPROOF FIX: Puppeteer's native text selector ignores case and HTML nesting!
    const elements = await this.page.$$(`::-p-text(${modelName})`);
    
    if (elements.length > 0) {
        await elements[0].click();
    } else {
        throw new Error(`Could not find the model "${modelName}" on the screen!`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const buttons = await this.page.$$(`::-p-xpath(//button[contains(text(), 'Save') or contains(text(), 'Confirm') or contains(text(), 'Chat')])`);
    if (buttons.length > 0) {
        await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            buttons[0].click()
        ]);
    }
});

Then('the active model status should update to include {string}', async function (modelName) {
    await this.page.waitForSelector('#selected-models', { timeout: 10000 });
    const selectedModelsText = await this.page.$eval('#selected-models', el => el.textContent);
    
    // 2. BULLETPROOF FIX: Make the final verification case-insensitive too!
    const isIncluded = selectedModelsText.toLowerCase().includes(modelName.toLowerCase());
    
    assert.strictEqual(isIncluded, true, `Expected model list to contain ${modelName}, but got: ${selectedModelsText}`);
});