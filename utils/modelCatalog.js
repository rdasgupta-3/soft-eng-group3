const MODEL_CATALOG = [
    {
        id: 'ollama-llama3.2-1b',
        name: 'Local Llama 3.2 1B',
        provider: 'ollama',
        access: 'local',
        runtimeModel: 'llama3.2:1b'
    },
    {
        id: 'ollama-qwen2.5-1.5b',
        name: 'Local Qwen 2.5 1.5B',
        provider: 'ollama',
        access: 'local',
        runtimeModel: 'qwen2.5:1.5b'
    },
    {
        id: 'openai-gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        access: 'public',
        runtimeModel: 'gpt-4o-mini'
    },
    {
        id: 'google-gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        access: 'public',
        runtimeModel: 'gemini-2.0-flash'
    },
    {
        id: 'anthropic-claude-3-5-haiku',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        access: 'public',
        runtimeModel: 'claude-3-5-haiku-20241022'
    }
];

const DEFAULT_MODEL_IDS = ['ollama-llama3.2-1b', 'openai-gpt-4o-mini', 'google-gemini-2.0-flash'];

function listModelSummaries() {
    return MODEL_CATALOG.map(({ id, name, provider, access }) => ({ id, name, provider, access }));
}

function getModelById(modelId) {
    return MODEL_CATALOG.find(model => model.id === modelId) || null;
}

function sanitizeSelectedModelIds(modelIds = []) {
    const knownIds = new Set(MODEL_CATALOG.map(model => model.id));
    return [...new Set(modelIds)]
        .filter(modelId => typeof modelId === 'string' && knownIds.has(modelId))
        .slice(0, 3);
}

function getDefaultModelIds() {
    return [...DEFAULT_MODEL_IDS];
}

module.exports = {
    getDefaultModelIds,
    getModelById,
    listModelSummaries,
    sanitizeSelectedModelIds
};
