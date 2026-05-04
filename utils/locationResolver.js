const KNOWN_TIMEZONES = [
    { aliases: ['kolkata', 'kolkata india', 'calcutta', 'calcutta india'], timezone: 'Asia/Kolkata', displayName: 'Kolkata, India' },
    { aliases: ['tokyo', 'tokyo japan'], timezone: 'Asia/Tokyo', displayName: 'Tokyo, Japan' },
    { aliases: ['london', 'london uk', 'london united kingdom'], timezone: 'Europe/London', displayName: 'London, UK' },
    { aliases: ['new york', 'new york ny', 'nyc'], timezone: 'America/New_York', displayName: 'New York, United States' },
    { aliases: ['los angeles', 'los angeles ca'], timezone: 'America/Los_Angeles', displayName: 'Los Angeles, United States' },
    { aliases: ['piscataway', 'piscataway nj', 'piscataway new jersey'], timezone: 'America/New_York', displayName: 'Piscataway, New Jersey, United States' },
    { aliases: ['edison', 'edison nj', 'edison new jersey'], timezone: 'America/New_York', displayName: 'Edison, New Jersey, United States' },
    { aliases: ['new brunswick', 'new brunswick nj', 'new brunswick new jersey'], timezone: 'America/New_York', displayName: 'New Brunswick, New Jersey, United States' }
];

function normalizeLocation(location = '') {
    return location.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function resolveKnownTimezone(location) {
    const normalized = normalizeLocation(location);
    if (!normalized) {
        return null;
    }

    return KNOWN_TIMEZONES.find(entry => entry.aliases.some(alias => normalized.includes(alias))) || null;
}

module.exports = {
    resolveKnownTimezone
};
