const { setDefaultTimeout } = require('@cucumber/cucumber');

const headlessRun = /^(1|true|yes|on)$/i.test(String(process.env.PUPPETEER_HEADLESS || '').trim());

setDefaultTimeout(headlessRun ? 60000 : 120000);
