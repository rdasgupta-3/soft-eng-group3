const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:1b';
const DEFAULT_HEALTH_TIMEOUT_MS = Number(process.env.OLLAMA_HEALTH_TIMEOUT_MS) || 5000;
const DEFAULT_CHAT_TIMEOUT_MS = Number(process.env.OLLAMA_CHAT_TIMEOUT_MS) || 60000;
const DEFAULT_WARMUP_TIMEOUT_MS = Number(process.env.OLLAMA_WARMUP_TIMEOUT_MS) || 60000;
const DEFAULT_WARMUP_MODELS = ['gemma3:1b', 'phi3:mini', 'llama3.2:1b'];
const DEFAULT_WARMUP_PROMPT = 'Hi. Reply with one word.';

function describeOllamaError(error) {
    if (!error) {
        return 'unknown error';
    }

    if (error.name === 'AbortError' || /aborted/i.test(error.message || '')) {
        return 'timeout waiting for Ollama to respond';
    }

    if (/fetch failed|ECONNREFUSED|connection refused|Failed to fetch/i.test(error.message || '')) {
        return 'connection error reaching Ollama';
    }

    return error.message || String(error);
}

function placeholderResponse(runtimeModel, reason) {
    return `I could not reach local Ollama model "${runtimeModel}" right now. Reason: ${reason}. Please make sure Ollama is running and the model is installed, then try again.`;
}

async function requestOllamaJson(path, options = {}) {
    const fetchImpl = options.fetchImpl || fetch;
    const timeoutMs = options.timeoutMs || DEFAULT_HEALTH_TIMEOUT_MS;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetchImpl(`${OLLAMA_BASE_URL}${path}`, {
            ...(options.requestOptions || {}),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`bad response status ${response.status}`);
        }

        return response.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function getAvailableModels(options = {}) {
    const data = await requestOllamaJson('/api/tags', options);
    return Array.isArray(data.models)
        ? data.models.map(model => model.name).filter(Boolean)
        : [];
}

async function checkOllamaHealth(options = {}) {
    try {
        const installedModels = await getAvailableModels(options);
        return {
            reachable: true,
            installedModels,
            reason: ''
        };
    } catch (error) {
        return {
            reachable: false,
            installedModels: [],
            reason: describeOllamaError(error)
        };
    }
}

function toOllamaMessages(conversationMessages, systemPrompt) {
    const recent = (conversationMessages || []).slice(-16);
    const prepared = [];

    if (systemPrompt) {
        prepared.push({ role: 'system', content: systemPrompt });
    }

    recent.forEach(msg => {
        if (msg.type === 'user-bubble') {
            prepared.push({ role: 'user', content: msg.text });
            return;
        }

        prepared.push({ role: 'assistant', content: msg.text });
    });

    return prepared;
}

async function generateReplyFromOllama(conversationMessages, options = {}) {
    const runtimeModel = options.runtimeModel || OLLAMA_MODEL;
    const fetchImpl = options.fetchImpl || fetch;
    const health = options.skipHealthCheck
        ? { reachable: true, installedModels: [], reason: '' }
        : await checkOllamaHealth({
            fetchImpl,
            timeoutMs: options.healthTimeoutMs || DEFAULT_HEALTH_TIMEOUT_MS
        });

    if (!health.reachable) {
        const reason = `health check failed: ${health.reason}`;
        console.warn('[LLM] Falling back to local placeholder response:', {
            model: runtimeModel,
            cause: reason
        });
        return placeholderResponse(runtimeModel, reason);
    }

    if (health.installedModels.length && !health.installedModels.includes(runtimeModel)) {
        const reason = `invalid model name or model not installed. Run: ollama pull ${runtimeModel}`;
        console.warn('[LLM] Falling back to local placeholder response:', {
            model: runtimeModel,
            cause: reason,
            installedModels: health.installedModels
        });
        return placeholderResponse(runtimeModel, reason);
    }

    const payload = {
        model: runtimeModel,
        stream: false,
        messages: toOllamaMessages(conversationMessages, options.systemPrompt)
    };

    const controller = new AbortController();
    const chatTimeoutMs = options.chatTimeoutMs || options.timeoutMs || DEFAULT_CHAT_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), chatTimeoutMs);

    try {
        const response = await fetchImpl(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        if (!response.ok) {
            const details = typeof response.text === 'function' ? await response.text() : '';
            throw new Error(`bad response status ${response.status}${details ? `: ${details}` : ''}`);
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
        const reason = describeOllamaError(error);
        console.warn('[LLM] Falling back to local placeholder response:', {
            model: runtimeModel,
            cause: reason,
            endpoint: `${OLLAMA_BASE_URL}/api/chat`,
            timeoutMs: chatTimeoutMs
        });
        return placeholderResponse(runtimeModel, reason);
    } finally {
        clearTimeout(timeout);
    }
}

async function warmOllamaModel(options = {}) {
    const fetchImpl = options.fetchImpl || fetch;
    const modelHierarchy = options.modelHierarchy || DEFAULT_WARMUP_MODELS;
    const prompt = options.prompt || DEFAULT_WARMUP_PROMPT;
    const skipped = [];
    const failures = [];
    const health = await checkOllamaHealth({
        fetchImpl,
        timeoutMs: options.healthTimeoutMs || DEFAULT_HEALTH_TIMEOUT_MS
    });

    if (!health.reachable) {
        console.warn('[Ollama Warmup] Skipped warmup because Ollama is not reachable.', {
            cause: health.reason
        });
        return {
            warmed: false,
            model: null,
            reason: health.reason,
            skipped,
            failures
        };
    }

    for (const model of modelHierarchy) {
        if (health.installedModels.length && !health.installedModels.includes(model)) {
            const reason = `model not installed. Run: ollama pull ${model}`;
            skipped.push({ model, reason });
            console.log('[Ollama Warmup] Skipping warmup model.', { model, reason });
            continue;
        }

        console.log('[Ollama Warmup] Warming local model.', { model });

        const payload = {
            model,
            stream: false,
            keep_alive: '10m',
            messages: [{ role: 'user', content: prompt }]
        };
        const controller = new AbortController();
        const warmupTimeoutMs = options.warmupTimeoutMs || options.timeoutMs || DEFAULT_WARMUP_TIMEOUT_MS;
        const timeout = setTimeout(() => controller.abort(), warmupTimeoutMs);

        try {
            const response = await fetchImpl(`${OLLAMA_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            if (!response.ok) {
                const details = typeof response.text === 'function' ? await response.text() : '';
                throw new Error(`bad response status ${response.status}${details ? `: ${details}` : ''}`);
            }

            const data = await response.json();
            const responseText = data && data.message && typeof data.message.content === 'string'
                ? data.message.content.trim()
                : '';

            console.log('[Ollama Warmup] Warmup succeeded.', {
                model,
                keepAlive: payload.keep_alive
            });

            return {
                warmed: true,
                model,
                responseText,
                skipped,
                failures
            };
        } catch (error) {
            const reason = describeOllamaError(error);
            failures.push({ model, reason });
            console.warn('[Ollama Warmup] Warmup failed; trying next model if available.', {
                model,
                cause: reason
            });
        } finally {
            clearTimeout(timeout);
        }
    }

    const reason = 'no installed warmup model succeeded';
    console.warn('[Ollama Warmup] Warmup did not load a model.', {
        reason,
        skipped,
        failures
    });

    return {
        warmed: false,
        model: null,
        reason,
        skipped,
        failures
    };
}

module.exports = {
    checkOllamaHealth,
    describeOllamaError,
    DEFAULT_WARMUP_MODELS,
    getAvailableModels,
    generateReplyFromOllama,
    toOllamaMessages,
    warmOllamaModel
};
