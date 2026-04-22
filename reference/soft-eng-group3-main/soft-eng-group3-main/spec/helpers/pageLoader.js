const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function loadPage(fileName, url = 'http://localhost/') {
    const filePath = path.join(__dirname, '..', '..', 'public', fileName);
    const html = fs.readFileSync(filePath, 'utf8');
    const dom = new JSDOM(html, {
        url,
        runScripts: 'dangerously'
    });
    return dom.window;
}

module.exports = {
    loadPage
};
