const fs = require('fs');
const path = require('path');

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function getDataDir() {
    return path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
}

function ensureDataDir() {
    const dir = getDataDir();
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function getDataFile(fileName) {
    return path.join(ensureDataDir(), fileName);
}

function readJson(fileName, fallbackValue) {
    const filePath = getDataFile(fileName);

    if (!fs.existsSync(filePath)) {
        writeJson(fileName, fallbackValue);
        return clone(fallbackValue);
    }

    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) {
        return clone(fallbackValue);
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        writeJson(fileName, fallbackValue);
        return clone(fallbackValue);
    }
}

function writeJson(fileName, value) {
    const filePath = getDataFile(fileName);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
    return value;
}

function resetDataFiles(files) {
    ensureDataDir();
    Object.entries(files).forEach(([fileName, value]) => {
        writeJson(fileName, value);
    });
}

module.exports = {
    getDataDir,
    ensureDataDir,
    getDataFile,
    readJson,
    writeJson,
    resetDataFiles
};
