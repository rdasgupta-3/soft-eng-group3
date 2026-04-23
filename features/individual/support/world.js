const { setWorldConstructor, After } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');

function parseBoolean(value, fallback) {
    if (typeof value === 'undefined') {
        return fallback;
    }

    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
    }

    return fallback;
}

function getSlowMo() {
    const configured = Number(process.env.PUPPETEER_SLOWMO);
    if (Number.isFinite(configured) && configured >= 0) {
        return configured;
    }

    return 120;
}

async function launchBrowser() {
    const headless = parseBoolean(process.env.PUPPETEER_HEADLESS, false);
    const preferChrome = !headless && parseBoolean(process.env.PUPPETEER_PREFER_CHROME, true);
    const baseOptions = {
        headless: headless ? 'new' : false,
        slowMo: headless ? 0 : getSlowMo(),
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    if (preferChrome) {
        try {
            return await puppeteer.launch({
                ...baseOptions,
                channel: 'chrome'
            });
        } catch (error) {}
    }

    return puppeteer.launch(baseOptions);
}

class BrowserWorld {
    constructor() {
        this.browser = null;
        this.page = null;
        this.credentials = null;
    }

    async launch() {
        if (!this.browser) {
            this.browser = await launchBrowser();
            this.page = await this.browser.newPage();
            await this.page.setViewport({ width: 1440, height: 960 });
            await this.page.bringToFront().catch(() => {});
        }

        return this.page;
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async close() {
        if (this.browser) {
            const browser = this.browser;
            const browserProcess = browser.process();

            try {
                if (this.page && !this.page.isClosed()) {
                    await this.page.close().catch(() => {});
                }

                await Promise.race([
                    browser.close(),
                    new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('browser-close-timeout')), 5000);
                    })
                ]);
            } catch (error) {
                if (browserProcess && !browserProcess.killed) {
                    browserProcess.kill();
                }
            }
        }

        this.browser = null;
        this.page = null;
        this.credentials = null;
    }
}

setWorldConstructor(BrowserWorld);

After(async function () {
    await this.close();
});
