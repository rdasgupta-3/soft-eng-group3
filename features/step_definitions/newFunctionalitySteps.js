const { When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

// ─── Persona ──────────────────────────────────────────────────────────────────

When('I open the chat page with persona {string}', async function (persona) {
    const page = await this.launch();
    await page.goto(`${BASE_URL}/chat?persona=${persona}`, { waitUntil: 'domcontentloaded' });
    await pause(800);
});

When('I open the chat page with no persona', async function () {
    const page = await this.launch();
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
    await pause(800);
});

Then('I should see a persona badge in the chat header containing {string}', async function (label) {
    const page = await this.launch();
    const badgeText = await page.$eval(
        '#chat-persona-badge .persona-badge',
        el => el.textContent.trim()
    ).catch(() => null);
    assert(badgeText, 'Expected a persona badge element in #chat-persona-badge but none was found');
    assert(
        badgeText.includes(label),
        `Expected badge to contain "${label}", got "${badgeText}"`
    );
});

Then('I should not see a persona badge in the chat header', async function () {
    const page = await this.launch();
    const badge = await page.$('#chat-persona-badge .persona-badge');
    assert(!badge, 'Expected no persona badge, but one was rendered');
});

// ─── Settings panel ───────────────────────────────────────────────────────────

When('I click the Accessibility button', async function () {
    const page = await this.launch();
    const btn = await page.$('.settings-btn');
    assert(btn, 'Accessibility button (.settings-btn) not found');
    await btn.click();
    await pause(400);
});

When('I click the Close button in the settings panel', async function () {
    const page = await this.launch();
    const btn = await page.$('.settings-close-btn');
    assert(btn, 'Close button (.settings-close-btn) not found in settings panel');
    await btn.click();
    await pause(300);
});

When('I select the {string} font size option', async function (size) {
    const page = await this.launch();
    const radio = await page.$(`input[name="font-size"][value="${size}"]`);
    assert(radio, `Font size radio button for "${size}" not found`);
    await radio.click();
    await pause(300);
});

Then('the settings panel should be visible', async function () {
    const page = await this.launch();
    const display = await page.$eval('#settings-panel', el => el.style.display);
    assert(
        display !== 'none' && display !== '',
        `Expected settings panel to be visible, but display was "${display}"`
    );
});

Then('the settings panel should be hidden', async function () {
    const page = await this.launch();
    const display = await page.$eval('#settings-panel', el => el.style.display);
    assert.strictEqual(display, 'none', `Expected settings panel to be hidden, but display was "${display}"`);
});

Then('the page body should have the large font class', async function () {
    const page = await this.launch();
    const hasClass = await page.$eval('body', el => el.classList.contains('a11y-font-large'));
    assert(hasClass, 'Expected <body> to have class "a11y-font-large" after selecting large font');
});

// ─── Multi-model selector ─────────────────────────────────────────────────────

Then('the model selector strip should be visible', async function () {
    const page = await this.launch();
    // Wait up to 4 s for loadAvailableModels to resolve and show the strip
    await page.waitForFunction(
        () => document.getElementById('model-selector') &&
              document.getElementById('model-selector').style.display !== 'none',
        { timeout: 4000 }
    ).catch(() => null);

    const display = await page.$eval('#model-selector', el => el.style.display);
    assert(
        display !== 'none',
        'Expected #model-selector to be visible (Ollama must be running for this test)'
    );
});

Then('at least one model checkbox should be pre-checked', async function () {
    const page = await this.launch();
    await page.waitForFunction(
        () => document.querySelectorAll('#model-checkboxes input[type="checkbox"]').length > 0,
        { timeout: 4000 }
    ).catch(() => null);

    const checkedCount = await page.$$eval(
        '#model-checkboxes input[type="checkbox"]:checked',
        nodes => nodes.length
    );
    assert(checkedCount >= 1, `Expected at least one model checkbox to be pre-checked, found ${checkedCount}`);
});

When('I uncheck the only checked model checkbox', async function () {
    const page = await this.launch();
    await page.waitForFunction(
        () => document.querySelectorAll('#model-checkboxes input[type="checkbox"]').length > 0,
        { timeout: 4000 }
    ).catch(() => null);

    // Click all currently-checked checkboxes
    const checked = await page.$$('#model-checkboxes input[type="checkbox"]:checked');
    for (const cb of checked) {
        await cb.click();
        await pause(200);
    }
});
