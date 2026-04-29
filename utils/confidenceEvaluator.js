function normalizeText(text) {
    return (text || '').toLowerCase();
}

function hasUsableCurrentWeather(toolResult) {
    return Boolean(
        toolResult &&
        toolResult.location &&
        Number.isFinite(Number(toolResult.temperature)) &&
        toolResult.condition
    );
}

function hasUsableForecast(forecastData) {
    return Boolean(
        forecastData &&
        Array.isArray(forecastData.hourlySamples) &&
        forecastData.hourlySamples.length >= 6
    );
}

function evaluateWeatherConfidence({ userMessage, toolResult, forecastData }) {
    const normalized = normalizeText(userMessage);
    const reasons = [];

    const asksForExactMinute = /\b(exactly|precisely|specific)\b/.test(normalized) ||
        /\b(?:at|around)\s+\d{1,2}:\d{2}\s*(?:am|pm)?\b/.test(normalized);
    const asksForCertainty = /\b(guarantee|certain|certainty|definitely|for sure|will it rain exactly)\b/.test(normalized);
    const asksLongRange = /\b(next month|next year|in \d+\s+(?:weeks|months|years))\b/.test(normalized);
    const asksTrend = /\b(later today|tonight|tomorrow|trend|throughout|over the day|by evening|this evening)\b/.test(normalized);
    const currentOrGeneral = /\b(now|current|currently|today|weather|forecast|temperature)\b/.test(normalized);

    if (!toolResult || !toolResult.location) {
        reasons.push('Location was not resolved confidently.');
    }

    if (!hasUsableCurrentWeather(toolResult)) {
        reasons.push('Current weather data is incomplete.');
    }

    if (!hasUsableForecast(forecastData)) {
        reasons.push('Hourly forecast samples are sparse or missing.');
    }

    if (asksForExactMinute) {
        reasons.push('The request asks for overly precise weather timing.');
    }

    if (asksForCertainty) {
        reasons.push('The request asks for certainty beyond forecast support.');
    }

    if (asksLongRange) {
        reasons.push('The request asks for an unsupported long-range forecast.');
    }

    if (reasons.length) {
        return { level: 'LOW', reasons };
    }

    if (asksTrend) {
        return {
            level: 'MEDIUM',
            reasons: ['The request asks about a future or trend-based period, so the answer is approximate.']
        };
    }

    if (currentOrGeneral && hasUsableCurrentWeather(toolResult)) {
        return {
            level: 'HIGH',
            reasons: ['Current conditions and near-term forecast data are available for the resolved location.']
        };
    }

    return {
        level: 'MEDIUM',
        reasons: ['The request is weather-related but not specific enough for high confidence.']
    };
}

module.exports = {
    evaluateWeatherConfidence
};
