const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

function inlineScripts(html) {
    return html.replace(/<script\s+src="\/([^"]+)"><\/script>/g, (match, scriptPath) => {
        const fullPath = path.join(__dirname, '..', '..', 'public', scriptPath);
        const script = fs.readFileSync(fullPath, 'utf8');
        return `<script>${script}</script>`;
    });
}

function loadPage(fileName, url = 'http://localhost/') {
    const filePath = path.join(__dirname, '..', '..', 'public', fileName);
    const html = inlineScripts(fs.readFileSync(filePath, 'utf8'));
    const virtualConsole = new VirtualConsole();

    virtualConsole.on('jsdomError', error => {
        if (/navigation to another Document/i.test(error.message || '')) {
            return;
        }

        console.error(error);
    });

    const dom = new JSDOM(html, {
        url,
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        virtualConsole
    });

    return dom.window;
}

module.exports = {
    loadPage
};
