function toHourLabel(timeValue) {
    const date = new Date(timeValue);
    if (Number.isNaN(date.getTime())) {
        return String(timeValue || '');
    }

    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}

function normalizeSamples(hourlySamples = []) {
    return hourlySamples
        .map(sample => ({
            time: sample.time,
            temperature: Number(sample.temperature)
        }))
        .filter(sample => sample.time && Number.isFinite(sample.temperature))
        .slice(0, 24);
}

function smoothTemperature(samples, index) {
    const neighbors = samples.slice(Math.max(0, index - 1), Math.min(samples.length, index + 2));
    const average = neighbors.reduce((sum, sample) => sum + sample.temperature, 0) / neighbors.length;
    return Math.round(average * 10) / 10;
}

function classifyTrend(points) {
    if (points.length < 2) {
        return 'stable';
    }

    const first = points[0].temperature;
    const last = points[points.length - 1].temperature;
    const delta = last - first;
    const directionChanges = points.slice(2).reduce((count, point, index) => {
        const previousDelta = points[index + 1].temperature - points[index].temperature;
        const nextDelta = point.temperature - points[index + 1].temperature;
        return previousDelta * nextDelta < 0 ? count + 1 : count;
    }, 0);

    if (directionChanges >= 2) {
        return 'mixed';
    }
    if (Math.abs(delta) < 2) {
        return 'stable';
    }
    return delta > 0 ? 'rising' : 'falling';
}

function buildTrendSummary(points, overallTrend, peak, low) {
    if (!points.length) {
        return 'Hourly temperature samples were not available, so no smooth trend could be reconstructed.';
    }

    const start = points[0];
    const end = points[points.length - 1];
    return [
        `The reconstructed temperature signal is ${overallTrend}.`,
        `It starts near ${start.temperature} F and ends near ${end.temperature} F.`,
        peak ? `The smooth peak is around ${toHourLabel(peak.time)} at ${peak.temperature} F.` : '',
        low ? `The smooth low is around ${toHourLabel(low.time)} at ${low.temperature} F.` : ''
    ].filter(Boolean).join(' ');
}

function reconstructTemperatureTrend(hourlySamples = []) {
    const samples = normalizeSamples(hourlySamples);

    // INR/MLP-inspired: instead of training a neural network, this deterministic
    // approximation treats hourly temperatures as samples from a continuous
    // signal f(t) and smooths/interpolates the trend for a lightweight fallback.
    const reconstructedPoints = samples.map((sample, index) => ({
        time: sample.time,
        temperature: smoothTemperature(samples, index)
    }));

    const peak = reconstructedPoints.reduce((best, point) => (
        !best || point.temperature > best.temperature ? point : best
    ), null);
    const low = reconstructedPoints.reduce((best, point) => (
        !best || point.temperature < best.temperature ? point : best
    ), null);
    const overallTrend = classifyTrend(reconstructedPoints);

    return {
        reconstructedPoints,
        trendSummary: buildTrendSummary(reconstructedPoints, overallTrend, peak, low),
        peakTime: peak ? peak.time : null,
        lowTime: low ? low.time : null,
        overallTrend
    };
}

module.exports = {
    reconstructTemperatureTrend
};
