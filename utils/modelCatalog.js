const MODEL_CATALOG = [
    {
        id: 'ollama-gemma3-1b',
        name: 'Local Gemma 3 1B (Recommended/Fastest)',
        provider: 'ollama',
        access: 'local',
        runtimeModel: 'gemma3:1b',
        description: 'Recommended fastest local demo model through Ollama, about 0.8 GB.'
    },
    {
        id: 'ollama-phi3-mini',
        name: 'Local Phi-3 Mini (Reliable Backup)',
        provider: 'ollama',
        access: 'local',
        runtimeModel: 'phi3:mini',
        description: 'Reliable local backup model through Ollama, about 2.3 GB.'
    },
    {
        id: 'ollama-llama3.2-1b',
        name: 'Local Llama 3.2 1B (Better Quality/Slower)',
        provider: 'ollama',
        access: 'local',
        runtimeModel: 'llama3.2:1b',
        description: 'Optional local Llama model with better quality but slower demo startup, about 1.3 GB.'
    },
    {
        id: 'ollama-qwen2.5-3b',
        name: 'Local Qwen 2.5 3B',
        provider: 'ollama',
        access: 'local',
        runtimeModel: 'qwen2.5:3b',
        description: 'Alibaba local comparison model through Ollama, about 1.9 GB.'
    },
    {
        id: 'ollama-llama3.2-latest',
        name: 'Local Llama 3.2 Latest (Advanced/Slow)',
        provider: 'ollama',
        access: 'local',
        runtimeModel: 'llama3.2:latest',
        description: 'Slow advanced local model through Ollama; visible for manual use but not recommended for demos.'
    },
    {
        id: 'openai-gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        access: 'public',
        runtimeModel: 'gpt-4o-mini',
        description: 'Public OpenAI model slot. Requires an API key.'
    },
    {
        id: 'google-gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        access: 'public',
        runtimeModel: 'gemini-2.0-flash',
        description: 'Public Google model slot. Requires an API key.'
    },
    {
        id: 'anthropic-claude-3-5-haiku',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        access: 'public',
        runtimeModel: 'claude-3-5-haiku-20241022',
        description: 'Public Anthropic model slot. Requires an API key.'
    }
];

const DEFAULT_MODEL_IDS = ['ollama-gemma3-1b'];

function listModelSummaries() {
    return MODEL_CATALOG.map(({ id, name, provider, access, runtimeModel, description }) => ({
        id,
        name,
        provider,
        access,
        runtimeModel,
        description: description || ''
    }));
}

function getModelById(modelId) {
    return MODEL_CATALOG.find(model => model.id === modelId) || null;
}

function sanitizeSelectedModelIds(modelIds = []) {
    const knownIds = new Set(MODEL_CATALOG.map(model => model.id));
    return [...new Set(modelIds)]
        .filter(modelId => typeof modelId === 'string' && knownIds.has(modelId));
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
