const PROVIDERS = [
    {
        id: 'openai',
        label: 'GPT',
        tagline: 'Structured and concise'
    },
    {
        id: 'gemini',
        label: 'Gemini',
        tagline: 'Analytical and comparative'
    },
    {
        id: 'claude',
        label: 'Claude',
        tagline: 'Supportive and reflective'
    }
];

function getProvider(providerId) {
    return PROVIDERS.find(provider => provider.id === providerId) || null;
}

module.exports = {
    PROVIDERS,
    getProvider
};
