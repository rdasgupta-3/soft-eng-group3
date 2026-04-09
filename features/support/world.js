const { setWorldConstructor, After } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');

const HEADLESS_MODE = process.env.HEADLESS === 'false' ? false : 'new';
const DEFAULT_ARGS = ['--no-sandbox', '--disable-setuid-sandbox'];

class BrowserWorld {
  constructor() {
    this.browser = null;
    this.page = null;
    this.launchOptions = {
      headless: HEADLESS_MODE,
      args: DEFAULT_ARGS,
      slowMo: process.env.SLOWMO ? Number(process.env.SLOWMO) : 0
    };
    this.lastResponse = null;
    this.lastConversationTitles = [];
  }

  async launch(options = {}) {
    if (!this.browser) {
      const merged = { ...this.launchOptions, ...options };
      this.browser = await puppeteer.launch(merged);
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 800 });
      this.page.on('dialog', async dialog => {
        try {
          await dialog.accept();
        } catch (error) {}
      });
    }
    return this.page;
  }

  async freshPage(options = {}) {
    await this.close();
    return this.launch(options);
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {}
    }
    this.browser = null;
    this.page = null;
    this.lastResponse = null;
    this.lastConversationTitles = [];
  }
}

setWorldConstructor(BrowserWorld);

After(async function () {
  await this.close();
});
