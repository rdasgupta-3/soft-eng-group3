const { resetTestData } = require('./helpers/testData');
const { generateModelResponses } = require('../utils/multiModelService');

describe('multiModelService', () => {
    beforeEach(() => {
        resetTestData();
        process.env.TEST_MODE = '1';
    });

    afterEach(() => {
        delete process.env.TEST_MODE;
    });

    it('returns three provider responses in a fixed order', async () => {
        const responses = await generateModelResponses('student@example.com', 'Explain automated testing', 'professional', []);

        expect(responses.map(response => response.providerLabel)).toEqual(['GPT', 'Gemini', 'Claude']);
        expect(responses.every(response => response.text.includes('Explain automated testing'))).toBeTrue();
    });

    it('marks live responses and applies the selected persona voice', async () => {
        const responses = await generateModelResponses('student@example.com', 'Compare model styles', 'sweetheart', []);

        expect(responses[0].mode).toBe('ollama-live');
        expect(responses[0].text).toContain('Miss Sweetheart');
    });
});
