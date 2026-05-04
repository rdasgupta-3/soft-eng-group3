const { evaluateWeatherConfidence } = require('./confidenceEvaluator');
const { resolveKnownTimezone } = require('./locationResolver');
const { extractLocationFromMessage } = require('./queryParser');
const { reconstructTemperatureTrend } = require('./weatherSignalReconstruction');

const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'America/New_York';
const DEFAULT_LOCATION = process.env.DEFAULT_LOCATION || 'New York';
const WEATHER_CODE_LABELS = {
    0: 'clear',
    1: 'mostly clear',
    2: 'partly cloudy',
    3: 'cloudy',
    45: 'foggy',
    48: 'foggy',
    51: 'light drizzle',
    53: 'drizzle',
    55: 'heavy drizzle',
    61: 'light rain',
    63: 'rainy',
    65: 'heavy rain',
    71: 'light snow',
    73: 'snowy',
    75: 'heavy snow',
    80: 'light rain showers',
    81: 'rain showers',
    82: 'heavy rain showers',
    95: 'thunderstorms'
};

const PERSONAS = {
    professional: {
        id: 'professional',
        name: 'Mr. Professional',
        tone: 'serious and precise',
        defaultTask: 'equation solving'
    },
    sweetheart: {
        id: 'sweetheart',
        name: 'Miss Sweetheart',
        tone: 'warm, kind, and encouraging',
        defaultTask: 'date and time questions'
    },
    silly: {
        id: 'silly',
        name: 'Lord Silly the Ninth',
        tone: 'playful and theatrical',
        defaultTask: 'weather predictions'
    }
};

const KNOWLEDGE_BASE = [
    {
        id: 'equation-api-policy',
        topics: ['math', 'equation', 'algebra', 'calculate'],
        text: 'For equation and arithmetic questions, call the math API and use the returned value as the source of truth.'
    },
    {
        id: 'time-api-policy',
        topics: ['time', 'date', 'day', 'today', 'tomorrow', 'yesterday'],
        text: 'For date and time questions, call TimeAPI for the requested timezone rather than relying on a local hard-coded date.'
    },
    {
        id: 'weather-api-policy',
        topics: ['weather', 'forecast', 'rain', 'sunny', 'temperature'],
        text: 'For weather questions, geocode the requested location and call the weather API for current conditions.'
    },
    {
        id: 'persona-policy',
        topics: ['professional', 'sweetheart', 'silly', 'personality', 'tone'],
        text: 'Always apply the selected personality after the API result is known, so tone changes without changing the underlying facts.'
    },
    {
        id: 'model-policy',
        topics: ['model', 'llm', 'ollama', 'gpt', 'gemini', 'claude'],
        text: 'The app can compare backend models, including local Ollama models and public GPT, Gemini, and Claude slots.'
    }
];

const IN_CONTEXT_EXAMPLES = [
    {
        id: 'math-professional-example',
        intent: 'math',
        persona: 'professional',
        user: 'Can you solve 2x + 4 = 10?',
        assistant: 'The math API gives x = 3. Subtract 4 from both sides, then divide by 2. Final answer: 3.'
    },
    {
        id: 'time-sweetheart-example',
        intent: 'time',
        persona: 'sweetheart',
        user: 'What day is it right now?',
        assistant: 'Of course, sweetheart. TimeAPI says it is Saturday, April 25, 2026 at 6:30 PM EDT.'
    },
    {
        id: 'weather-silly-example',
        intent: 'weather',
        persona: 'silly',
        user: 'How is the weather looking for Boston?',
        assistant: 'My official prediction for Boston: 54 F and partly cloudy, with a tiny chance of dramatic sky behavior.'
    },
    {
        id: 'general-professional-example',
        intent: 'general',
        persona: 'professional',
        user: 'What can you help me with?',
        assistant: 'I can help with equations, date and time questions, weather questions, and selected backend model comparisons.'
    }
];

function getPersona(personaId = 'professional') {
    return PERSONAS[personaId] || PERSONAS.professional;
}

function tokenize(text) {
    return (text || '').toLowerCase().match(/[a-z0-9.]+/g) || [];
}

function retrieveContext(messageText, limit = 3) {
    const tokens = new Set(tokenize(messageText));
    return KNOWLEDGE_BASE.map(entry => {
        const score = entry.topics.reduce((sum, topic) => sum + (tokens.has(topic) ? 2 : 0), 0)
            + tokenize(entry.text).reduce((sum, token) => sum + (tokens.has(token) ? 1 : 0), 0);
        return { ...entry, score };
    })
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ id, text, topics, score }) => ({ id, text, topics, score }));
}

function classifyIntent(text) {
    const normalized = (text || '').toLowerCase();
    const looksLikeEquation = /[a-z]\s*[+\-*/=]|\d+\s*[a-z]|=/.test(normalized);
    const looksLikeArithmetic = /\d+(?:\.\d+)?\s*[+\-*/]\s*\d+/.test(normalized);
    const asksForDerivative = /\b(derivative|differentiate|d\/dx)\b/.test(normalized);
    if (/\b(weather|forecast|rain|sunny|temperature)\b/.test(normalized)) {
        return 'weather';
    }
    if (/\b(time|date|day|today|tomorrow|yesterday|from now|later|ago|before now)\b/.test(normalized)) {
        return 'time';
    }
    if (
        asksForDerivative ||
        (/\b(solve|equation|factor|simplify|calculate|work out|workout|find)\b/.test(normalized) && /[0-9a-z+\-*/=^]/.test(normalized)) ||
        (/\bwhat is\b/.test(normalized) && (looksLikeEquation || looksLikeArithmetic)) ||
        looksLikeEquation ||
        looksLikeArithmetic
    ) {
        return 'math';
    }
    return 'general';
}

function selectInContextExamples(intent, personaId, limit = 2) {
    return IN_CONTEXT_EXAMPLES.map(example => {
        let score = 0;
        if (example.intent === intent) score += 3;
        if (example.persona === personaId) score += 2;
        if (example.intent === 'general') score += 1;
        return { ...example, score };
    })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ id, intent: exampleIntent, persona, user, assistant }) => ({
            id,
            intent: exampleIntent,
            persona,
            user,
            assistant
        }));
}

function buildReasoningPlan({ intent, retrievedContext, examples }) {
    const toolName = {
        math: 'solveEquation',
        time: 'getCurrentDateTime',
        weather: 'getCurrentWeather',
        general: 'providerModel',
        chat: 'providerModel'
    }[intent];

    return [
        `Classified the user request as ${intent}.`,
        retrievedContext.length
            ? `Retrieved guidance: ${retrievedContext.map(entry => entry.id).join(', ')}.`
            : 'No matching local guidance was needed.',
        examples.length
            ? `Selected in-context examples: ${examples.map(example => example.id).join(', ')}.`
            : 'No in-context examples were selected.',
        toolName === 'providerModel'
            ? 'No deterministic API tool matched; use the selected backend model.'
            : `Call API tool: ${toolName}.`
    ];
}

function normalizeToolOptions(options) {
    if (options instanceof Date) {
        return { now: options };
    }
    return options || {};
}

async function requestJson(url, options = {}) {
    const fetchImpl = options.fetchImpl || fetch;
    const response = await fetchImpl(url);
    if (!response.ok) {
        throw new Error(`API request failed with ${response.status}`);
    }
    return response.json();
}

async function requestText(url, options = {}) {
    const fetchImpl = options.fetchImpl || fetch;
    const response = await fetchImpl(url);
    if (!response.ok) {
        throw new Error(`API request failed with ${response.status}`);
    }
    return response.text();
}

function parseLinearEquation(text) {
    const compact = text.replace(/\s+/g, '');
    const match = compact.match(/([+-]?\d*)x([+-]\d+)?=([+-]?\d+)/i);
    if (!match) {
        return null;
    }

    const coefficientRaw = match[1];
    const coefficient = coefficientRaw === '' || coefficientRaw === '+'
        ? 1
        : coefficientRaw === '-'
            ? -1
            : Number(coefficientRaw);
    const constant = Number(match[2] || 0);
    const rightSide = Number(match[3]);

    if (!Number.isFinite(coefficient) || coefficient === 0 || !Number.isFinite(constant) || !Number.isFinite(rightSide)) {
        return null;
    }

    return {
        coefficient,
        constant,
        rightSide,
        apiExpression: `(${rightSide} - (${constant})) / (${coefficient})`
    };
}

function extractArithmeticExpression(text) {
    const expressionMatch = text.match(/(-?\d+(?:\.\d+)?(?:\s*[+\-*/]\s*-?\d+(?:\.\d+)?)+)/);
    if (!expressionMatch) {
        return null;
    }
    const expression = expressionMatch[1].trim();
    return /^[\d+\-*/. ()]+$/.test(expression) ? expression : null;
}

async function evaluateMathExpression(expression, options = {}) {
    const url = `https://api.mathjs.org/v4/?expr=${encodeURIComponent(expression)}&precision=14`;
    const result = (await requestText(url, options)).trim();
    if (!result) {
        throw new Error('Math API returned an empty result.');
    }
    return result;
}

async function solveLinearEquation(text, options = {}) {
    const parsed = parseLinearEquation(text);
    if (!parsed) {
        return null;
    }

    const answer = await evaluateMathExpression(parsed.apiExpression, options);
    return {
        steps: [
            `${parsed.coefficient}x ${parsed.constant < 0 ? '-' : '+'} ${Math.abs(parsed.constant)} = ${parsed.rightSide}`,
            `${parsed.coefficient}x = ${parsed.rightSide - parsed.constant}`,
            `x = ${answer}`
        ],
        answer,
        apiExpression: parsed.apiExpression,
        apiProvider: 'mathjs'
    };
}

async function solveArithmetic(text, options = {}) {
    const expression = extractArithmeticExpression(text);
    if (!expression) {
        return null;
    }
    const answer = await evaluateMathExpression(expression, options);
    return {
        steps: [`Evaluate ${expression}`],
        answer,
        apiExpression: expression,
        apiProvider: 'mathjs'
    };
}

function extractDerivativeExpression(text) {
    const normalized = (text || '').replace(/\^/g, '^').trim();
    const match = normalized.match(/\b(?:derivative of|differentiate)\s+(.+?)(?:\s+with respect to\s+([a-z]))?[?.!]*$/i);
    if (!match) {
        return null;
    }

    const expression = match[1]
        .replace(/\s+/g, '')
        .replace(/(\d)([a-z])/gi, '$1*$2')
        .replace(/\*\*/g, '^');
    const variable = match[2] || ((expression.match(/[a-z]/i) || [])[0]) || 'x';

    if (!/^[0-9a-z+\-*/^().]+$/i.test(expression)) {
        return null;
    }

    return {
        expression,
        variable,
        apiExpression: `derivative(${expression}, ${variable})`
    };
}

async function solveDerivative(text, options = {}) {
    const parsed = extractDerivativeExpression(text);
    if (!parsed) {
        return null;
    }

    const answer = await evaluateMathExpression(parsed.apiExpression, options);
    return {
        steps: [
            `Differentiate ${parsed.expression} with respect to ${parsed.variable}`,
            `Result: ${answer}`
        ],
        answer,
        apiExpression: parsed.apiExpression,
        apiProvider: 'mathjs'
    };
}

async function geocodeLocation(location, options = {}) {
    const locationQuery = location || DEFAULT_LOCATION;
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationQuery)}&count=1&language=en&format=json`;
    const data = await requestJson(url, options);
    const place = data && Array.isArray(data.results) ? data.results[0] : null;
    if (!place) {
        throw new Error(`Could not geocode "${locationQuery}".`);
    }
    return {
        name: place.name,
        admin1: place.admin1,
        country: place.country,
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone || DEFAULT_TIMEZONE
    };
}

function displayLocation(place) {
    return [place.name, place.admin1, place.country].filter(Boolean).join(', ');
}

async function getCurrentWeather(messageText, options = {}) {
    const requestedLocation = extractLocationFromMessage(messageText, 'weather');
    const place = await geocodeLocation(requestedLocation, options);
    const url = [
        'https://api.open-meteo.com/v1/forecast',
        `?latitude=${encodeURIComponent(place.latitude)}`,
        `&longitude=${encodeURIComponent(place.longitude)}`,
        '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
        '&hourly=temperature_2m,precipitation_probability,weather_code',
        '&temperature_unit=fahrenheit',
        '&wind_speed_unit=mph',
        '&timezone=auto'
    ].join('');
    const data = await requestJson(url, options);
    const current = data.current || {};
    const units = data.current_units || {};
    const condition = WEATHER_CODE_LABELS[current.weather_code] || 'weather conditions';
    const hourly = data.hourly || {};
    const hourlySamples = (hourly.time || []).map((time, index) => ({
        time,
        temperature: Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m[index] : null,
        precipitationProbability: Array.isArray(hourly.precipitation_probability) ? hourly.precipitation_probability[index] : null,
        weatherCode: Array.isArray(hourly.weather_code) ? hourly.weather_code[index] : null
    })).filter(sample => sample.time && Number.isFinite(Number(sample.temperature)));
    const forecastData = {
        hourlySamples,
        timezone: data.timezone || place.timezone
    };
    const baseResult = {
        location: displayLocation(place),
        temperature: current.temperature_2m,
        temperatureUnit: units.temperature_2m || 'F',
        windSpeed: current.wind_speed_10m,
        windSpeedUnit: units.wind_speed_10m || 'mph',
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        condition,
        timezone: data.timezone || place.timezone,
        apiProvider: 'open-meteo',
        forecastData
    };
    const confidence = evaluateWeatherConfidence({
        userMessage: messageText,
        toolResult: baseResult,
        forecastData
    });
    const shouldReconstruct = (confidence.level === 'LOW' || confidence.level === 'MEDIUM') && hourlySamples.length > 0;
    const reconstruction = shouldReconstruct
        ? reconstructTemperatureTrend(hourlySamples)
        : null;

    return {
        ...baseResult,
        confidence,
        reconstruction
    };
}

async function getCurrentDateTime(messageText, options = {}) {
    const requestedLocation = extractLocationFromMessage(messageText, 'time');
    const knownTimezone = requestedLocation ? resolveKnownTimezone(requestedLocation) : null;
    let place = null;
    let timezone = knownTimezone ? knownTimezone.timezone : (options.timezone || DEFAULT_TIMEZONE);
    let resolutionNote = knownTimezone ? 'Resolved timezone from known-location mapping.' : '';

    if (requestedLocation && !knownTimezone) {
        try {
            place = await geocodeLocation(requestedLocation, options);
            timezone = place.timezone || timezone;
            resolutionNote = 'Resolved timezone from geocoding.';
        } catch (error) {
            resolutionNote = `Could not resolve "${requestedLocation}" through geocoding; used ${timezone}.`;
        }
    }

    const url = `https://timeapi.io/api/Time/current/zone?timeZone=${encodeURIComponent(timezone)}`;
    const data = await requestJson(url, options);
    if (!data || !data.dateTime) {
        throw new Error('Time API returned no datetime.');
    }
    const apiNow = new Date(data.dateTime);
    const offset = parseRelativeTimeOffset(messageText);
    const requestedTime = offset
        ? new Date(apiNow.getTime() + offset.milliseconds)
        : apiNow;

    return {
        now: requestedTime,
        currentApiTime: apiNow,
        relativeOffset: offset,
        timezone: data.timeZone || timezone,
        abbreviation: data.dstActive ? 'DST active' : 'standard time',
        utcOffset: '',
        location: place ? displayLocation(place) : (knownTimezone ? knownTimezone.displayName : timezone),
        requestedLocation,
        resolutionNote,
        apiProvider: 'timeapi'
    };
}

function parseRelativeTimeOffset(text) {
    const normalized = (text || '').toLowerCase();
    const match = normalized.match(/\b(\d+)\s*(minute|minutes|hour|hours|day|days|week|weeks)\s+(from now|later|after now|ago|before now)\b/);
    if (!match) {
        return null;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const directionText = match[3];
    const direction = /\bago|before now\b/.test(directionText) ? -1 : 1;
    const multipliers = {
        minute: 60 * 1000,
        minutes: 60 * 1000,
        hour: 60 * 60 * 1000,
        hours: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        weeks: 7 * 24 * 60 * 60 * 1000
    };

    return {
        amount,
        unit,
        direction,
        durationLabel: `${amount} ${unit}`,
        label: `${amount} ${unit} ${directionText}`,
        milliseconds: direction * amount * multipliers[unit]
    };
}

const TOOL_REGISTRY = {
    solveEquation: {
        intent: 'math',
        apiProvider: 'mathjs',
        run: async (messageText, options) => {
            const derivativeResult = await solveDerivative(messageText, options);
            if (derivativeResult) {
                return derivativeResult;
            }
            const equationResult = await solveLinearEquation(messageText, options);
            return equationResult || solveArithmetic(messageText, options);
        }
    },
    getCurrentDateTime: {
        intent: 'time',
        apiProvider: 'timeapi',
        run: getCurrentDateTime
    },
    getCurrentWeather: {
        intent: 'weather',
        apiProvider: 'open-meteo',
        run: getCurrentWeather
    }
};

function toolForIntent(intent) {
    return Object.entries(TOOL_REGISTRY).find(([, tool]) => tool.intent === intent) || null;
}

function formatNumber(value) {
    return Number.isFinite(Number(value)) ? Number(value).toFixed(0) : value;
}

function formatUnit(unit) {
    return unit === 'mp/h' ? 'mph' : unit;
}

function formatByPersona(personaId, intent, payload) {
    const persona = getPersona(personaId);

    if (intent === 'math') {
        const steps = payload.steps.join(' Then ');
        if (persona.id === 'sweetheart') {
            return `Absolutely, dear. The math API returned ${payload.answer}. ${steps}.`;
        }
        if (persona.id === 'silly') {
            return `By royal decree of arithmetic, the math API says ${payload.answer}. ${steps}.`;
        }
        return `${steps}. Final answer: ${payload.answer}.`;
    }

    if (intent === 'time') {
        const dateText = payload.now.toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: payload.timezone,
            timeZoneName: 'short'
        });
        if (persona.id === 'sweetheart') {
            return `Of course, sweetheart. TimeAPI says it is ${dateText} for ${payload.location}.`;
        }
        if (persona.id === 'silly') {
            return `The grand clock API proclaims: ${dateText} for ${payload.location}.`;
        }
        return `TimeAPI says it is ${dateText} for ${payload.location}.`;
    }

    if (intent === 'weather') {
        const weatherText = `${formatNumber(payload.temperature)} ${formatUnit(payload.temperatureUnit)}, ${payload.condition}, wind ${formatNumber(payload.windSpeed)} ${formatUnit(payload.windSpeedUnit)}, humidity ${formatNumber(payload.humidity)}%`;
        const confidence = payload.confidence || { level: 'HIGH', reasons: [] };
        const uncertaintyNote = confidence.level === 'MEDIUM'
            ? ` Forecast confidence is medium: ${confidence.reasons.join(' ')}`
            : '';
        const reconstructionNote = confidence.level === 'LOW' && payload.reconstruction
            ? ` Because that request is too precise for exact certainty, I reconstructed the general temperature trend instead. ${payload.reconstruction.trendSummary}`
            : '';
        if (persona.id === 'silly') {
            if (reconstructionNote) return `Royal weather caution for ${payload.location}: ${weatherText}. The crystal barometer refuses exact certainty, so behold the trend: ${payload.reconstruction.trendSummary}`;
            return `My official prediction for ${payload.location}: ${weatherText}, with a tiny chance of dramatic sky behavior.${uncertaintyNote}`;
        }
        if (persona.id === 'sweetheart') {
            if (reconstructionNote) return `For ${payload.location}, the weather API says ${weatherText}. I cannot promise that exact moment, sweetheart, so here is the gentler trend: ${payload.reconstruction.trendSummary}`;
            return `For ${payload.location}, the weather API says ${weatherText}. Hope that helps, sweetheart.${uncertaintyNote}`;
        }
        if (reconstructionNote) return `Current weather for ${payload.location}: ${weatherText}. Exact timing confidence is low, so I used a reconstructed temperature trend: ${payload.reconstruction.trendSummary}`;
        return `Current weather for ${payload.location}: ${weatherText}.${uncertaintyNote}`;
    }

    return null;
}

function buildAssistantPipeline(messageText, personaId) {
    const persona = getPersona(personaId);
    const intent = classifyIntent(messageText);
    const retrievedContext = retrieveContext(`${messageText} ${intent} ${persona.id}`);
    const examples = selectInContextExamples(intent, persona.id);
    const reasoningPlan = buildReasoningPlan({ intent, retrievedContext, examples });

    return {
        intent,
        persona,
        retrievedContext,
        examples,
        reasoningPlan
    };
}

function buildToolErrorAnswer(pipeline, toolName, error) {
    return {
        intent: pipeline.intent,
        text: `${pipeline.persona.name} could not reach the ${toolName} API right now: ${error.message}`,
        metadata: {
            techniques: [
                'retrieval-augmented generation',
                'in-context learning',
                'chain-of-thought planning',
                'tool calling'
            ],
            retrievedContext: pipeline.retrievedContext,
            inContextExamples: pipeline.examples,
            reasoningSummary: [...pipeline.reasoningPlan, `API tool failed: ${error.message}`],
            toolCalls: [{ name: toolName, error: error.message }]
        }
    };
}

async function answerWithTools(messageText, personaId, options = {}) {
    const toolOptions = normalizeToolOptions(options);
    const pipeline = buildAssistantPipeline(messageText, personaId);
    const toolEntry = toolForIntent(pipeline.intent);

    if (!toolEntry) {
        return null;
    }

    const [toolName, tool] = toolEntry;
    try {
        const toolResult = await tool.run(messageText, toolOptions);
        if (!toolResult) {
            return null;
        }

        return {
            intent: pipeline.intent,
            text: formatByPersona(pipeline.persona.id, pipeline.intent, toolResult),
            metadata: {
                techniques: [
                    'retrieval-augmented generation',
                    'in-context learning',
                    'chain-of-thought planning',
                    'tool calling'
                ],
                retrievedContext: pipeline.retrievedContext,
                inContextExamples: pipeline.examples,
                reasoningSummary: [
                    ...pipeline.reasoningPlan,
                    ...(pipeline.intent === 'weather' && toolResult.confidence
                        ? [
                            `Weather confidence was ${toolResult.confidence.level}: ${toolResult.confidence.reasons.join(' ')}`
                        ]
                        : []),
                    ...(pipeline.intent === 'weather' && toolResult.confidence && toolResult.confidence.level === 'LOW'
                        ? ['Weather confidence was LOW, so the assistant invoked the weather signal reconstruction module.']
                        : [])
                ],
                toolCalls: [{
                    name: toolName,
                    apiProvider: tool.apiProvider,
                    input: messageText,
                    result: toolResult
                }]
            }
        };
    } catch (error) {
        return buildToolErrorAnswer(pipeline, toolName, error);
    }
}

function buildSystemPrompt(personaId, messageText) {
    const pipeline = buildAssistantPipeline(messageText, personaId);
    const examples = pipeline.examples
        .map(example => `User: ${example.user}\nAssistant: ${example.assistant}`)
        .join('\n\n');
    const retrieved = pipeline.retrievedContext
        .map(entry => `- ${entry.id}: ${entry.text}`)
        .join('\n');

    return [
        `You are ${pipeline.persona.name}. Use a ${pipeline.persona.tone} tone.`,
        `Specialty: ${pipeline.persona.defaultTask}.`,
        `Classified intent: ${pipeline.intent}.`,
        'Follow the user request first. The selected personality changes tone only; it must not change the topic, named entities, requested format, or task requirements.',
        'Use the retrieved guidance and examples below before answering.',
        'Think through the task internally. Do not reveal hidden chain-of-thought; return only a concise final answer.',
        retrieved ? `Retrieved guidance:\n${retrieved}` : 'Retrieved guidance: no direct match.',
        examples ? `In-context examples:\n${examples}` : '',
        `Reasoning plan summary:\n- ${pipeline.reasoningPlan.join('\n- ')}`
    ].filter(Boolean).join('\n\n');
}

function buildGeneralQueryPrompt(personaId, messageText) {
    const pipeline = buildAssistantPipeline(messageText, personaId);
    const personaInstruction = {
        professional: 'Use a formal, precise, and technical tone.',
        sweetheart: 'Use a warm, kind, and gentle tone.',
        silly: 'Use a playful and whimsical tone.'
    }[pipeline.persona.id] || 'Use a clear, helpful tone.';
    const examples = pipeline.examples
        .map(example => `User: ${example.user}\nAssistant: ${example.assistant}`)
        .join('\n\n');
    const retrieved = pipeline.retrievedContext
        .map(entry => `- ${entry.id}: ${entry.text}`)
        .join('\n');

    return {
        systemPrompt: [
            'SYSTEM:',
            'You are a knowledgeable assistant.',
            'Answer the user\'s question directly and clearly.',
            'Provide concrete information.',
            'Do not describe how to approach the question.',
            '- Do NOT describe how to approach the question.',
            '- Do NOT give meta explanations.',
            '- Do NOT restate the question.',
            '- Personality changes tone only, not reasoning or content.',
            '',
            'PERSONALITY:',
            personaInstruction,
            '',
            retrieved ? `RETRIEVED CONTEXT:\n${retrieved}` : 'RETRIEVED CONTEXT: no direct match.',
            examples ? `Few-shot examples:\n${examples}` : '',
            `Audit summary:\n- ${pipeline.reasoningPlan.join('\n- ')}`
        ].filter(Boolean).join('\n\n'),
        userPrompt: [
            'USER:',
            messageText
        ].join('\n'),
        strictUserPrompt: [
            'USER:',
            messageText,
            '',
            'Answer the question directly with specific details.',
            'Do not repeat the question.',
            'Do not give general advice.',
            'Provide concrete information.'
        ].join('\n'),
        metadata: {
            retrievedContext: pipeline.retrievedContext,
            inContextExamples: pipeline.examples,
            reasoningSummary: pipeline.reasoningPlan
        }
    };
}

function handleGeneralQuery({ message, personality } = {}) {
    return buildGeneralQueryPrompt(personality || 'professional', message || '');
}

function buildFallbackReply(messageText, personaId) {
    const pipeline = buildAssistantPipeline(messageText, personaId);
    const contextText = pipeline.retrievedContext.length
        ? ` Retrieved guidance: ${pipeline.retrievedContext.map(entry => entry.id).join(', ')}.`
        : '';
    return `${pipeline.persona.name} is ready. Ask me to solve an equation, tell the date/time, or check the weather.${contextText}`;
}

module.exports = {
    PERSONAS,
    TOOL_REGISTRY,
    answerWithTools,
    buildAssistantPipeline,
    buildFallbackReply,
    buildGeneralQueryPrompt,
    buildSystemPrompt,
    classifyIntent,
    evaluateMathExpression,
    getCurrentDateTime,
    getCurrentWeather,
    getPersona,
    handleGeneralQuery,
    retrieveContext,
    selectInContextExamples,
    solveDerivative,
    solveLinearEquation
};
