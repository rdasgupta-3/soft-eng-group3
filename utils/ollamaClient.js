const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
// const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:latest';   NO LONGER NEEDED


const MODEL_MAP = {
    phi: "phi3:3.8b",
    gemma: "gemma2:2b",
    deepseek: "deepseek-r1:1.5b"
};

function toOllamaMessages(conversationMessages) {
    const recent = (conversationMessages || []).slice(-16);

    return recent.map(msg => {
        if (msg.type === 'user-bubble') {
            return { role: 'user', content: msg.text };
        }

        return { role: 'assistant', content: msg.text };
    });
}

/*
async function generateReplyFromOllama(conversationMessages) {
    const payload = {
        model: OLLAMA_MODEL,
        stream: false,
        messages: toOllamaMessages(conversationMessages)
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

*/

async function generateReplyFromSpecificModel(model, messages) {
    const lastUserMessage = [...messages]
        .reverse()
        .find(m => m.type === "user-bubble");

    const prompt = lastUserMessage?.text || "Hello";

    const payload = { model, prompt, stream: false };

    // Use a Promise.race so the timeout actually works in Node
    const fetchPromise = fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: ${model} took too long`)), 60000)
    );

    try {
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (!response.ok) {
            const errText = await response.text();
            console.warn(`[LLM] ${model} HTTP ${response.status}:`, errText);
            return null;
        }

        const data = await response.json();
        console.log(`[LLM] ${model} responded:`, data.response?.slice(0, 60));
        return data.response?.trim() || null;

    } catch (error) {
        console.warn(`[LLM] Error from model ${model}:`, error.message);
        return null;
    }
}

module.exports = { generateReplyFromSpecificModel };