const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';

function toOllamaMessages(conversationMessages) {
    const recent = (conversationMessages || []).slice(-16);

    return recent.map(msg => {
        if (msg.type === 'user-bubble') {
            return { role: 'user', content: msg.text };
        }

        return { role: 'assistant', content: msg.text };
    });
}

async function generateReplyFromOllama(conversationMessages) {
    const payload = {
        model: OLLAMA_MODEL,
        stream: false,
        messages: toOllamaMessages(conversationMessages)
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.status}`);
        }

        const data = await response.json();
        const content = data && data.message && typeof data.message.content === 'string'
            ? data.message.content.trim()
            : '';

        if (!content) {
            throw new Error('Ollama returned empty content.');
        }

        return content;
    } catch (error) {
        console.warn('[LLM] Falling back to local placeholder response:', error.message);
        return 'I could not reach local Ollama right now. Please make sure Ollama is running, then try again.'; // fallback response if frontend fails
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = {
    generateReplyFromOllama
};
