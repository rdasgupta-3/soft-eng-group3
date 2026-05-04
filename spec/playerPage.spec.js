const { loadPage } = require('./helpers/pageLoader');

describe('players.html backend model selection', () => {
    it('shows Gemma, Phi, Qwen, and Llama local Ollama model options', async () => {
        const win = loadPage('players.html', 'http://localhost/choose-player');
        await new Promise(resolve => setTimeout(resolve, 0));

        const localModelIds = [
            'ollama-gemma3-1b',
            'ollama-phi3-mini',
            'ollama-llama3.2-1b',
            'ollama-qwen2.5-3b',
            'ollama-llama3.2-latest'
        ];
        const optionText = win.document.querySelector('.model-grid').textContent;

        localModelIds.forEach(modelId => {
            expect(win.document.querySelector(`[data-model-id="${modelId}"]`)).not.toBeNull();
        });
        expect(optionText).toContain('Local Llama 3.2');
        expect(optionText).toContain('Local Gemma 3 1B');
        expect(optionText).toContain('Local Phi-3 Mini');
        expect(optionText).toContain('Local Qwen 2.5 3B');
        expect(optionText).toContain('Recommended fastest');
        expect(optionText).toContain('not recommended for demos');
    });

    it('allows selecting more than three models from the frontend picker', async () => {
        const win = loadPage('players.html', 'http://localhost/choose-player');
        await new Promise(resolve => setTimeout(resolve, 0));

        [
            'ollama-llama3.2-1b',
            'ollama-llama3.2-latest',
            'ollama-phi3-mini',
            'ollama-qwen2.5-3b',
            'openai-gpt-4o-mini',
            'google-gemini-2.0-flash'
        ].forEach(modelId => win.toggleModelSelection(modelId));

        const selected = JSON.parse(win.localStorage.getItem('llmSelectedModelIds'));

        expect(selected).toEqual([
            'ollama-gemma3-1b',
            'ollama-llama3.2-1b',
            'ollama-llama3.2-latest',
            'ollama-phi3-mini',
            'ollama-qwen2.5-3b',
            'openai-gpt-4o-mini',
            'google-gemini-2.0-flash'
        ]);
        expect(win.document.getElementById('selection-hint').textContent).toContain('7 models selected');
    });
});
