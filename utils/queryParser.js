function cleanLocationCandidate(candidate = '') {
    return candidate
        .replace(/[?!.,]+$/g, '')
        .replace(/\s+\b(?:right now|currently|now|today|tonight|tomorrow|later)\b.*$/i, '')
        .replace(/\s+\b(?:at|around)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b.*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractLocationFromMessage(message, intent = 'chat') {
    const text = (message || '').replace(/[?!]+$/g, '').trim();
    if (!text) {
        return '';
    }

    const matches = [...text.matchAll(/\b(in|for|near|at)\s+([^?!.,]+)$/gi)];
    for (let index = matches.length - 1; index >= 0; index -= 1) {
        const [, preposition, rawCandidate] = matches[index];
        const candidate = cleanLocationCandidate(rawCandidate);
        if (!candidate || /^\d/.test(candidate)) {
            continue;
        }
        if (preposition.toLowerCase() === 'at' && /^\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i.test(rawCandidate.trim())) {
            continue;
        }
        return candidate;
    }

    if (intent === 'weather' || intent === 'time') {
        const flexibleMatches = [...text.matchAll(/\b(in|for|near|at)\s+([a-zA-Z][a-zA-Z .'-]+?)(?=\s+\b(?:today|tonight|tomorrow|now|later|exactly|at|around)\b|$)/gi)];
        const last = flexibleMatches
            .map(match => cleanLocationCandidate(match[2]))
            .filter(Boolean)
            .pop();
        return last || '';
    }

    return '';
}

module.exports = {
    extractLocationFromMessage
};
