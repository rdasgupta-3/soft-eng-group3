const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

const { createTestUser } = require('../support/authTestUtils');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function launchPage(world, path = '/') {
    const page = await world.launch();
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'load' });
    return page;
}

async function loginThroughUi(world, persona) {
    const page = await launchPage(world, '/');
    await page.waitForSelector('#email');
    await page.type('#email', world.credentials.email);
    await page.type('#password', world.credentials.password);
    await Promise.allSettled([
        page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
        page.click('#login-btn')
    ]);

    try {
        await page.waitForSelector(`.player-card[data-persona="${persona}"]`, { timeout: 15000 });
    } catch (error) {
        const url = page.url();
        const message = await page.$eval('#error-message', node => node.textContent.trim()).catch(() => '');
        const body = await page.$eval('body', node => node.innerText.slice(0, 400)).catch(() => '');
        throw new Error(`Failed to reach persona selection. URL=${url} Error="${message}" Body="${body}"`);
    }

    await Promise.allSettled([
        page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
        page.click(`.player-card[data-persona="${persona}"]`)
    ]);

    await page.waitForSelector('#chat-input', { timeout: 15000 });
    await page.waitForFunction(() => !document.getElementById('chat-input').disabled);
}

async function loginToPersonaSelection(world) {
    const page = await launchPage(world, '/');
    await page.waitForSelector('#email');
    await page.type('#email', world.credentials.email);
    await page.type('#password', world.credentials.password);
    await Promise.allSettled([
        page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
        page.click('#login-btn')
    ]);

    await page.waitForSelector('.player-card', { timeout: 15000 });
    return page;
}

async function waitForLatestResponseGroup(page) {
    await page.waitForFunction(() => {
        const status = document.getElementById('workspace-status');
        if (!status || !status.textContent.includes('Three responses generated successfully.')) {
            return false;
        }

        const groups = document.querySelectorAll('.response-group');
        if (!groups.length) {
            return false;
        }

        const latest = groups[groups.length - 1];
        const cards = latest.querySelectorAll('.response-card');
        if (cards.length !== 3) {
            return false;
        }

        return [...cards].every(card => {
            const text = card.querySelector('.response-text');
            return text && text.textContent.trim().length > 20;
        });
    }, { timeout: 45000 });
}

async function registerRequestInterceptor(page, matcher, resolver) {
    if (!page.__codexRequestInterceptors) {
        page.__codexRequestInterceptors = [];
        await page.setRequestInterception(true);

        page.on('request', async request => {
            for (const interceptor of page.__codexRequestInterceptors) {
                if (interceptor.matcher.test(request.url())) {
                    await interceptor.resolver(request);
                    return;
                }
            }

            if (!request.isInterceptResolutionHandled()) {
                await request.continue();
            }
        });
    }

    page.__codexRequestInterceptors.push({ matcher, resolver });
}

async function clickHistoryAction(page, titleText, buttonClass) {
    const clicked = await page.evaluate((title, className) => {
        const items = [...document.querySelectorAll('.history-item')];
        const match = items.find(item => {
            const titleNode = item.querySelector('.history-title');
            return titleNode && titleNode.textContent.includes(title);
        });

        if (!match) {
            return false;
        }

        const button = match.querySelector(className);
        if (!button) {
            return false;
        }

        button.click();
        return true;
    }, titleText, buttonClass);

    assert(clicked, `Unable to find history action ${buttonClass} for "${titleText}"`);
}

Given('I have a registered solo iteration account', async function () {
    const unique = Date.now();
    this.credentials = {
        email: `student${unique}@example.com`,
        password: 'StudyPass123!'
    };

    await createTestUser(this.credentials.email, this.credentials.password);
});

Given('I am on the forgot-password page', async function () {
    await launchPage(this, '/forgot-password');
});

Given('I am on the login page', async function () {
    await launchPage(this, '/');
});

Given('I am on the signup page', async function () {
    await launchPage(this, '/signup');
});

Given('I am on the persona selection page with my account', async function () {
    await loginToPersonaSelection(this);
});

Given('I am logged in on the chat page with the {string} persona', async function (persona) {
    await loginThroughUi(this, persona);
});

When('I enable bold text', async function () {
    await this.page.click('#bold-toggle');
});

When('I enable high contrast mode', async function () {
    await this.page.click('#high-contrast-toggle');
});

When('I increase the text size {int} times', async function (count) {
    for (let index = 0; index < count; index += 1) {
        await this.page.click('#increase-text-btn');
    }
});

When('I increase the text size {int} time', async function (count) {
    for (let index = 0; index < count; index += 1) {
        await this.page.click('#increase-text-btn');
    }
});

When('I decrease the text size {int} times', async function (count) {
    for (let index = 0; index < count; index += 1) {
        await this.page.click('#decrease-text-btn');
    }
});

When('I decrease the text size {int} time', async function (count) {
    for (let index = 0; index < count; index += 1) {
        await this.page.click('#decrease-text-btn');
    }
});

When('I send the prompt {string}', async function (prompt) {
    await this.page.click('#chat-input');
    await this.page.type('#chat-input', prompt);
    await this.page.click('#send-btn');
    await waitForLatestResponseGroup(this.page);
});

When('I send the prompt {string} without waiting', async function (prompt) {
    await this.page.click('#chat-input');
    await this.page.type('#chat-input', prompt);
    await this.page.click('#send-btn');
});

When('I request a password reset for my account', async function () {
    await this.page.type('#email', this.credentials.email);
    await this.page.click('#forgot-password-btn');
    try {
        await this.page.waitForSelector('#preview-link a', { timeout: 15000 });
    } catch (error) {
        const message = await this.page.$eval('#error-message', node => node.textContent.trim()).catch(() => '');
        const body = await this.page.$eval('body', node => node.innerText.slice(0, 400)).catch(() => '');
        throw new Error(`Failed to generate reset link. Error="${message}" Body="${body}"`);
    }
});

When('I open the forgot password page from login', async function () {
    await Promise.allSettled([
        this.page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
        this.page.click('a[href="/forgot-password"]')
    ]);

    await this.page.waitForSelector('#forgot-password-btn', { timeout: 15000 });
});

When('I open the preview reset link', async function () {
    this.resetLink = await this.page.$eval('#preview-link a', link => link.href);
    await this.page.goto(this.resetLink, { waitUntil: 'load' });
    await this.page.waitForSelector('#new-password');
});

When('I reset my password to {string}', async function (newPassword) {
    await this.page.type('#new-password', newPassword);
    await this.page.type('#confirm-password', newPassword);

    const [response] = await Promise.all([
        this.page.waitForResponse(
            networkResponse => networkResponse.url().includes('/api/reset-password') &&
                networkResponse.request().method() === 'POST',
            { timeout: 15000 }
        ),
        this.page.click('#reset-password-btn')
    ]);

    const payload = await response.json().catch(() => ({}));
    assert(
        response.ok(),
        `Expected password reset request to succeed, received ${response.status()} ${payload.error || ''}`.trim()
    );

    const outcome = await Promise.race([
        this.page.waitForFunction(
            () => {
                const success = document.getElementById('success-message');
                return Boolean(success && success.textContent.includes('Password reset complete'));
            },
            { polling: 'mutation', timeout: 5000 }
        ).then(() => 'success-message'),
        this.page.waitForFunction(
            () => window.location.pathname === '/',
            { polling: 'mutation', timeout: 5000 }
        ).then(() => 'redirected')
    ]).catch(async () => {
        const errorMessage = await this.page.$eval('#error-message', node => node.textContent.trim()).catch(() => '');
        const currentUrl = this.page.url();
        throw new Error(`Password reset completed on the network, but the UI never showed success or redirected. URL=${currentUrl} Error="${errorMessage}"`);
    });

    assert(
        outcome === 'success-message' || outcome === 'redirected',
        `Unexpected password reset outcome: ${outcome}`
    );

    this.credentials.password = newPassword;
});

When('I create a solo iteration account through the signup form', async function () {
    const unique = Date.now();
    this.credentials = {
        email: `solo${unique}@example.com`,
        password: 'StudyPass123!'
    };

    await this.page.type('#new-email', this.credentials.email);
    await this.page.type('#new-password', this.credentials.password);
    await this.page.click('#signup-btn');
});

When('I log in with the newly created account', async function () {
    await this.page.waitForSelector('#email', { timeout: 15000 });
    await this.page.type('#email', this.credentials.email);
    await this.page.type('#password', this.credentials.password);
    await Promise.allSettled([
        this.page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
        this.page.click('#login-btn')
    ]);
});

When('I choose the {string} persona from the selection page', async function (persona) {
    await this.page.waitForSelector(`.player-card[data-persona="${persona}"]`, { timeout: 15000 });
    await Promise.allSettled([
        this.page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
        this.page.click(`.player-card[data-persona="${persona}"]`)
    ]);

    await this.page.waitForSelector('#chat-input', { timeout: 15000 });
});

When('I open the change persona page', async function () {
    await Promise.allSettled([
        this.page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
        this.page.click('a.header-link[href="/choose-player"]')
    ]);

    await this.page.waitForSelector('.player-card', { timeout: 15000 });
});

When('I choose the {string} persona', async function (persona) {
    await Promise.allSettled([
        this.page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
        this.page.click(`.player-card[data-persona="${persona}"]`)
    ]);

    await this.page.waitForSelector('#chat-input', { timeout: 15000 });
    await this.page.waitForFunction(() => !document.getElementById('chat-input').disabled);
});

When('I create a new chat', async function () {
    await this.page.click('#new-chat-btn');
});

When('I open the conversation titled {string}', async function (titleText) {
    const opened = await this.page.evaluate(title => {
        const items = [...document.querySelectorAll('.history-item')];
        const match = items.find(item => {
            const titleNode = item.querySelector('.history-title');
            return titleNode && titleNode.textContent.includes(title);
        });

        if (!match) {
            return false;
        }

        match.click();
        return true;
    }, titleText);

    assert(opened, `Unable to open conversation "${titleText}"`);
});

When('I pin the conversation titled {string}', async function (titleText) {
    await clickHistoryAction(this.page, titleText, '.history-pin-btn');
});

When('I search conversation history for {string}', async function (query) {
    await this.page.click('#history-search');
    await this.page.type('#history-search', query);
});

When('I clear the conversation history search', async function () {
    await this.page.$eval('#history-search', input => {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
});

When('I delete the conversation titled {string}', async function (titleText) {
    await clickHistoryAction(this.page, titleText, '.history-delete-btn');
});

When('I log out from the chat workspace', async function () {
    await Promise.allSettled([
        this.page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
        this.page.click('#logout-btn')
    ]);
});

When('I log back in with my existing account', async function () {
    await this.page.waitForSelector('#email', { timeout: 15000 });
    await this.page.type('#email', this.credentials.email);
    await this.page.type('#password', this.credentials.password);
    await Promise.allSettled([
        this.page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
        this.page.click('#login-btn')
    ]);

    await this.page.waitForSelector('.player-card', { timeout: 15000 });
});

When('I track Ollama warmup requests', async function () {
    this.ollamaWarmupCount = 0;

    await registerRequestInterceptor(this.page, /\/api\/warmup$/, async request => {
        this.ollamaWarmupCount += 1;
        await request.respond({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            contentType: 'application/json',
            body: JSON.stringify({ warmed: true })
        });
    });
});

When('I simulate a delayed AI reply', async function () {
    await registerRequestInterceptor(this.page, /\/api\/conversations\/.+\/ai-reply$/, async request => {
        await this.wait(450);
        await request.continue();
    });
});

When('I simulate Ollama being offline', async function () {
    await registerRequestInterceptor(this.page, /\/api\/ollama-status$/, async request => {
        await request.respond({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            contentType: 'application/json',
            body: JSON.stringify({ ok: false })
        });
    });

    await registerRequestInterceptor(this.page, /\/api\/warmup$/, async request => {
        await request.respond({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            contentType: 'application/json',
            body: JSON.stringify({ warmed: false })
        });
    });
});

Then('the prompt composer should use bold text', async function () {
    const weight = await this.page.$eval('#chat-input', element => getComputedStyle(element).fontWeight);
    assert(Number(weight) >= 700, `Expected bold prompt input, received font weight ${weight}`);
});

Then('the latest response cards should use bold text', async function () {
    const weight = await this.page.evaluate(() => {
        const groups = document.querySelectorAll('.response-group');
        const latest = groups[groups.length - 1];
        return getComputedStyle(latest.querySelector('.response-text')).fontWeight;
    });

    assert(Number(weight) >= 700, `Expected bold response text, received font weight ${weight}`);
});

Then('the text size indicator should show {string}', async function (label) {
    const value = await this.page.$eval('#font-scale-value', node => node.textContent.trim());
    assert.strictEqual(value, label);
});

Then('the prompt composer should use a larger font size', async function () {
    const result = await this.page.evaluate(() => {
        const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const expectedBase = 0.95 * rootFontSize;
        const actual = parseFloat(getComputedStyle(document.getElementById('chat-input')).fontSize);

        return { expectedBase, actual };
    });

    assert(
        result.actual > result.expectedBase,
        `Expected larger prompt font size than ${result.expectedBase}, received ${result.actual}`
    );
});

Then('the latest response cards should use a larger font size', async function () {
    const result = await this.page.evaluate(() => {
        const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const expectedBase = 0.95 * rootFontSize;
        const groups = document.querySelectorAll('.response-group');
        const latest = groups[groups.length - 1];
        const actual = parseFloat(getComputedStyle(latest.querySelector('.response-text')).fontSize);

        return { expectedBase, actual };
    });

    assert(
        result.actual > result.expectedBase,
        `Expected larger response font size than ${result.expectedBase}, received ${result.actual}`
    );
});

Then('I should see a response card for {string}', async function (providerLabel) {
    const labels = await this.page.evaluate(() => {
        const groups = document.querySelectorAll('.response-group');
        const latest = groups[groups.length - 1];
        return [...latest.querySelectorAll('.response-card__label')].map(node => node.textContent.trim());
    });

    assert(labels.includes(providerLabel), `Expected provider label ${providerLabel}, received ${labels.join(', ')}`);
});

Then('each latest response card should contain generated text', async function () {
    const texts = await this.page.evaluate(() => {
        const groups = document.querySelectorAll('.response-group');
        const latest = groups[groups.length - 1];
        return [...latest.querySelectorAll('.response-text')].map(node => node.textContent.trim());
    });

    assert.strictEqual(texts.length, 3, `Expected 3 response texts, received ${texts.length}`);
    texts.forEach(text => {
        assert(text.length > 20, `Expected generated text in response card, received "${text}"`);
    });
});

Then('the workspace should use high contrast mode', async function () {
    const result = await this.page.evaluate(() => {
        const shell = getComputedStyle(document.querySelector('.chat-shell'));
        const response = getComputedStyle(document.querySelector('.response-card'));

        return {
            enabled: document.body.classList.contains('high-contrast-mode'),
            shellBackground: shell.backgroundColor,
            responseBackground: response.backgroundColor,
            responseColor: response.color
        };
    });

    assert(result.enabled, 'Expected the high-contrast body class to be active.');
    assert.strictEqual(result.shellBackground, 'rgb(17, 17, 17)');
    assert.strictEqual(result.responseBackground, 'rgb(0, 0, 0)');
    assert.strictEqual(result.responseColor, 'rgb(255, 255, 255)');
});

Then('the chat workspace should be ready for prompts', async function () {
    await this.page.waitForSelector('#chat-input', { timeout: 15000 });
    const disabled = await this.page.$eval('#chat-input', input => input.disabled);
    assert.strictEqual(disabled, false);
});

Then('a warmup request should have been made', async function () {
    await this.wait(250);
    assert(
        Number(this.ollamaWarmupCount) > 0,
        `Expected at least one warmup request, received ${this.ollamaWarmupCount || 0}`
    );
});

Then('I should see the thinking indicator while waiting for responses', async function () {
    await this.page.waitForSelector('.typing', { visible: true, timeout: 5000 });
    const text = await this.page.$eval('.typing span', node => node.textContent.trim());
    assert(text.includes('is thinking'), `Expected thinking indicator text, received "${text}"`);
});

Then('the latest response cards should animate into view', async function () {
    await this.page.waitForFunction(() => {
        const textNode = document.querySelector('.response-text[data-full-text]');
        if (!textNode) {
            return false;
        }

        const fullText = textNode.dataset.fullText || '';
        const rendered = textNode.textContent || '';
        return rendered.length > 0 && rendered.length < fullText.length;
    }, { timeout: 8000 });

    await waitForLatestResponseGroup(this.page);
});

Then('I should see the Ollama offline warning', async function () {
    await this.page.waitForFunction(() => {
        const warning = document.getElementById('ollama-warning');
        const input = document.getElementById('chat-input');
        return warning && input &&
            getComputedStyle(warning).display !== 'none' &&
            input.disabled;
    }, { timeout: 5000 });

    const result = await this.page.evaluate(() => {
        const warning = document.getElementById('ollama-warning');
        const status = document.getElementById('workspace-status');
        return {
            warningVisible: getComputedStyle(warning).display !== 'none',
            statusText: status.textContent.trim()
        };
    });

    assert(result.warningVisible, 'Expected the Ollama warning banner to be visible.');
    assert(
        result.statusText.includes('offline'),
        `Expected offline status message, received "${result.statusText}"`
    );
});

Then('the chat input should be disabled', async function () {
    const state = await this.page.evaluate(() => ({
        inputDisabled: document.getElementById('chat-input').disabled,
        sendDisabled: document.getElementById('send-btn').disabled
    }));

    assert.strictEqual(state.inputDisabled, true);
    assert.strictEqual(state.sendDisabled, true);
});

Then('I should see a preview reset link', async function () {
    const href = await this.page.$eval('#preview-link a', link => link.href);
    assert(href.includes('/reset-password?token='), `Expected reset preview link, received "${href}"`);
});

Then('the chat workspace should show the {string} persona', async function (personaName) {
    const label = await this.page.$eval('#persona-label', node => node.textContent.trim());
    assert.strictEqual(label, personaName);
});

Then('the URL should include {string}', async function (fragment) {
    assert(
        this.page.url().includes(fragment),
        `Expected URL to include "${fragment}", received "${this.page.url()}"`
    );
});

Then('the latest response cards should mention {string}', async function (textFragment) {
    const texts = await this.page.evaluate(() => {
        const groups = document.querySelectorAll('.response-group');
        const latest = groups[groups.length - 1];
        return [...latest.querySelectorAll('.response-text')].map(node => node.textContent.trim());
    });

    assert.strictEqual(texts.length, 3, `Expected 3 response texts, received ${texts.length}`);
    texts.forEach(text => {
        assert(
            text.includes(textFragment),
            `Expected latest response to include "${textFragment}", received "${text}"`
        );
    });
});

Then('I should return to the login page after signup', async function () {
    await this.page.waitForFunction(() => window.location.pathname === '/', { timeout: 15000 });
    await this.page.waitForSelector('#login-btn', { timeout: 15000 });
});

Then('I should be on the chat workspace', async function () {
    await this.page.waitForSelector('#chat-input', { timeout: 15000 });
    const path = new URL(this.page.url()).pathname;
    assert.strictEqual(path, '/chat');
});

Then('I should be able to log in with my new password', async function () {
    const page = await launchPage(this, '/');
    await page.type('#email', this.credentials.email);
    await page.type('#password', this.credentials.password);
    await page.click('#login-btn');
    await page.waitForSelector('.player-card');
    assert(await page.$('.player-card') !== null, 'Expected persona selection page after login.');
});

Then('I should only see the conversation titled {string}', async function (titleText) {
    const titles = await this.page.$$eval('.history-title', nodes => nodes.map(node => node.textContent.trim()));
    assert.deepStrictEqual(titles, [titleText]);
});

Then('I should see the conversation titled {string}', async function (titleText) {
    const titles = await this.page.$$eval('.history-title', nodes => nodes.map(node => node.textContent.trim()));
    assert(titles.includes(titleText), `Expected to find conversation "${titleText}", received ${titles.join(', ')}`);
});

Then('the conversation titled {string} should show a filled star icon', async function (titleText) {
    await this.page.waitForFunction(title => {
        const items = [...document.querySelectorAll('.history-item')];
        const match = items.find(item => item.querySelector('.history-title')?.textContent.includes(title));
        const button = match?.querySelector('.history-pin-btn');
        return Boolean(
            button &&
            button.classList.contains('is-pinned') &&
            button.textContent.trim() === '★'
        );
    }, { timeout: 5000 }, titleText);

    const isFilled = await this.page.evaluate(title => {
        const items = [...document.querySelectorAll('.history-item')];
        const match = items.find(item => item.querySelector('.history-title')?.textContent.includes(title));
        const button = match?.querySelector('.history-pin-btn');
        return Boolean(button && button.classList.contains('is-pinned') && button.textContent.trim() === '★');
    }, titleText);

    assert(isFilled, `Expected "${titleText}" to show a filled star icon.`);
});

Then('the conversation titled {string} should appear in the starred section', async function (titleText) {
    await this.page.waitForFunction(title => {
        const list = document.getElementById('conversation-list');
        const separator = [...list.children].find(node => {
            return node.classList.contains('history-separator') &&
                node.textContent.trim().toUpperCase() === 'STARRED';
        });

        if (!separator) {
            return false;
        }

        let pointer = separator.nextElementSibling;

        while (pointer && !pointer.classList.contains('history-divider') && !pointer.classList.contains('history-separator')) {
            if (pointer.classList.contains('history-item')) {
                const titleNode = pointer.querySelector('.history-title');
                if (titleNode && titleNode.textContent.trim() === title) {
                    return true;
                }
            }

            pointer = pointer.nextElementSibling;
        }

        return false;
    }, { timeout: 5000 }, titleText);

    const starredTitles = await this.page.evaluate(() => {
        const list = document.getElementById('conversation-list');
        const separator = [...list.children].find(node => {
            return node.classList.contains('history-separator') &&
                node.textContent.trim().toUpperCase() === 'STARRED';
        });

        if (!separator) {
            return [];
        }

        const titles = [];
        let pointer = separator.nextElementSibling;

        while (pointer && !pointer.classList.contains('history-divider') && !pointer.classList.contains('history-separator')) {
            if (pointer.classList.contains('history-item')) {
                const title = pointer.querySelector('.history-title');
                if (title) {
                    titles.push(title.textContent.trim());
                }
            }

            pointer = pointer.nextElementSibling;
        }

        return titles;
    });

    assert(
        starredTitles.includes(titleText),
        `Expected "${titleText}" in the STARRED section, received ${starredTitles.join(', ')}`
    );
});

Then('I should be on the login page', async function () {
    const path = new URL(this.page.url()).pathname;
    assert.strictEqual(path, '/');
    await this.page.waitForSelector('#login-btn', { timeout: 15000 });
});

Then('I should see the user message {string} in the chat window', async function (messageText) {
    const messages = await this.page.$$eval('.user-bubble', nodes => nodes.map(node => node.textContent.trim()));
    assert(
        messages.includes(messageText),
        `Expected chat window to include "${messageText}", received ${messages.join(', ')}`
    );
});
