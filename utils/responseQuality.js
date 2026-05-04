function normalizeForComparison(text = '') {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenSet(text = '') {
    return new Set(
        normalizeForComparison(text)
            .split(' ')
            .filter(token => token.length > 2)
    );
}

function jaccardSimilarity(leftText, rightText) {
    const left = tokenSet(leftText);
    const right = tokenSet(rightText);
    if (!left.size || !right.size) {
        return 0;
    }

    const intersection = [...left].filter(token => right.has(token)).length;
    const union = new Set([...left, ...right]).size;
    return intersection / union;
}

function isLowQualityResponse(userInput, response) {
    const normalizedInput = normalizeForComparison(userInput);
    const normalizedResponse = normalizeForComparison(response);

    if (!normalizedResponse || normalizedResponse.length < 60) {
        return true;
    }

    if (normalizedResponse === normalizedInput) {
        return true;
    }

    if (normalizedResponse.includes(normalizedInput) && normalizedInput.length > 20) {
        return true;
    }

    if (jaccardSimilarity(normalizedInput, normalizedResponse) > 0.82) {
        return true;
    }

    return [
        'approach the question',
        'approach this question',
        'identify the goal',
        'separate facts',
        'i would answer',
        'i can respond',
        'here is a response',
        'a useful answer should',
        'selected backend model',
        'normally responsible',
        'the relevant facts',
        'reasoning that connects'
    ].some(phrase => normalizedResponse.includes(phrase));
}

module.exports = {
    isLowQualityResponse,
    jaccardSimilarity,
    normalizeForComparison
};
