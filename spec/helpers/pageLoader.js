const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function loadPage(fileName, url = 'http://localhost/', fetchMock = null) {
    const filePath = path.join(__dirname, '..', '..', 'public', fileName);
    const html = fs.readFileSync(filePath, 'utf8');

    const options = { url, runScripts: 'dangerously' };

    if (fetchMock) {
        options.beforeParse = (window) => { window.fetch = fetchMock; };
    }

    const dom = new JSDOM(html, options);
    return dom.window;
}

module.exports = { loadPage };
