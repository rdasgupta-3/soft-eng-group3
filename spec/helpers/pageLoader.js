const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function loadPage(fileName, url = 'http://localhost/', options = {}) {
    const filePath = path.join(__dirname, '..', '..', 'public', fileName);
    const html = fs.readFileSync(filePath, 'utf8');
    const dom = new JSDOM(html, {
        url,
        runScripts: 'dangerously',
        beforeParse: options.beforeParse
    });
    return dom.window;
}

module.exports = {
    loadPage
};
