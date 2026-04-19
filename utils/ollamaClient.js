const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:latest';

const RECOMMENDED_MODELS = [
    'llama3.2:latest',   // Meta  – default, 3B params, ~2.0 GB
    'gemma3:1b',         // Google – 1B params, ~0.8 GB, fastest
    'phi3:mini',         // Microsoft – 3.8B params, ~2.3 GB
    'qwen2.5:3b'         // Alibaba  – 3B params, ~1.9 GB
];

const PERSONA_PROMPTS = {
    sweetheart: 'You are Miss Sweetheart, a warm and deeply empathetic companion. You are gentle, kind, and nurturing. Always acknowledge the feelings of the person you are talking to before offering advice. Speak in a warm, friendly tone with encouraging language. You genuinely care about people\'s well-being and always try to cheer them up.',
    professional: 'You are Mr. Professional, a sharp and efficient business advisor. You are direct, concise, and solution-focused. Cut straight to the heart of problems and deliver clear, actionable advice. Avoid small talk. Use professional language and prioritise logic, efficiency, and results.',
    silly: 'You are Lord Silly The Ninth, an eccentric and chaotic royal. You speak in an over-the-top, theatrical manner full of riddles, puns, jokes, and delightful nonsense. Treat every question as an opportunity for wordplay and absurdity. Stay in character as a whimsical, self-important but lovable royal at all times.'
};

function toOllamaMessages(conversationMessages, persona) {
    const recent = (conversationMessages || []).slice(-16);

    const formatted = recent.map(msg => {
        if (msg.type === 'user-bubble') {
            return { role: 'user', content: msg.text };
        }

        return { role: 'assistant', content: msg.text };
    });

    if (persona && PERSONA_PROMPTS[persona]) {
        formatted.unshift({ role: 'system', content: PERSONA_PROMPTS[persona] });
    }

    return formatted;
}

async function getAvailableModels() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return [];
        const data = await res.json();
        const names = (data.models || []).map(m => m.name);
        // Sort so recommended models appear first in defined order, others after
        return names.sort((a, b) => {
            const ai = RECOMMENDED_MODELS.indexOf(a);
            const bi = RECOMMENDED_MODELS.indexOf(b);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
    } catch {
        return [];
    }
}

async function generateReplyFromOllama(conversationMessages, persona, modelOverride) {
    const payload = {
        model: modelOverride || OLLAMA_MODEL,
        stream: false,
        messages: toOllamaMessages(conversationMessages, persona)
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

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
        console.warn('[LLM] Ollama error:', error.message);
        throw new Error('ollama-failed');
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = {
    generateReplyFromOllama,
    getAvailableModels,
    RECOMMENDED_MODELS
};
