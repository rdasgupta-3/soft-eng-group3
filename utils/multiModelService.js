const { PROVIDERS } = require('./providerCatalog');
const { checkOllamaStatus, generateReplyFromOllama } = require('./ollamaClient');

function buildFallbackReply(provider, prompt, persona) {
    const personaCue = persona === 'sweetheart'
        ? 'with extra warmth'
        : persona === 'silly'
            ? 'with playful energy'
            : 'with a professional tone';

    if (provider.id === 'openai') {
        return `GPT fallback for "${prompt}" responds ${personaCue} by outlining the goal, suggesting a short plan, and ending with a quick verification step.`;
    }

    if (provider.id === 'gemini') {
        return `Gemini fallback for "${prompt}" responds ${personaCue} by comparing likely options, highlighting tradeoffs, and recommending the clearest next move.`;
    }

    return `Claude fallback for "${prompt}" responds ${personaCue} by reassuring the user, explaining the idea plainly, and offering one manageable next action.`;
}

async function generateModelResponses(email, prompt, persona = 'professional', conversationMessages = []) {
    const ollamaOnline = await checkOllamaStatus();

    return Promise.all(PROVIDERS.map(async provider => {
        let text;
        let mode = 'demo-mode';

        if (ollamaOnline) {
            try {
                text = await generateReplyFromOllama({
                    provider,
                    prompt,
                    persona,
                    conversationMessages
                });
                mode = 'ollama-live';
            } catch (error) {
                text = buildFallbackReply(provider, prompt, persona);
                mode = 'fallback-mode';
            }
        } else {
            text = buildFallbackReply(provider, prompt, persona);
            mode = 'offline-fallback';
        }

        return {
            providerId: provider.id,
            providerLabel: provider.label,
            mode,
            text
        };
    }));
}

module.exports = {
    generateModelResponses,
    buildFallbackReply
};
