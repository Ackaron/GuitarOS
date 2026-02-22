function _calculateMasteryIndex(h, targetBpm, targetDuration, category) {
    // User Formula: Average of available components (Tempo, Time, Quality)

    // 1. Tempo Score
    const currentBpm = h.bpm || 0;
    let tempoScore = null;
    if (targetBpm > 0) {
        tempoScore = (currentBpm / targetBpm) * 100;
        // Cap at 100% per user implication
        tempoScore = Math.min(100, tempoScore);
    } else {
        tempoScore = 100;
    }

    // 2. Time Score
    const actual = h.actualDuration || h.duration || 0;
    const planned = h.plannedDuration || targetDuration || 300;

    let timeScore = null;

    if (actual > 0 && planned > 0) {
        timeScore = (actual / planned) * 100;
        // Leniency: If > 90% time completed, treat as 100%.
        if (timeScore >= 90) timeScore = 100;
        timeScore = Math.min(100, timeScore);
    } else if (actual === 0 && h.rating === 'manual') {
        // Manual entry usually implies "I did it".
        timeScore = 100;
    }

    // 3. Quality Score
    let qualityScore = null;
    if (h.rating === 'manual') {
        if (h.confidence) qualityScore = (h.confidence / 5) * 100;
        else qualityScore = 100;
    } else if (h.confidence) {
        qualityScore = (h.confidence / 5) * 100;
    } else if (h.rating === 'easy') qualityScore = 100;
    else if (h.rating === 'good') qualityScore = 80;
    else if (h.rating === 'hard') qualityScore = 60;

    // Calculate Average
    let components = [];
    if (tempoScore !== null) components.push(tempoScore);
    if (timeScore !== null) components.push(timeScore);
    if (qualityScore !== null) components.push(qualityScore);

    const sum = components.reduce((a, b) => a + b, 0);
    const finalScore = components.length ? sum / components.length : 0;

    console.log(`Debug: BPM=${currentBpm}/${targetBpm} (${tempoScore}) Time=${actual}/${planned} (${timeScore}) Quality=${h.confidence} (${qualityScore}) -> Components=[${components.join(', ')}] -> Final=${Math.round(finalScore)}`);
    return Math.round(finalScore);
}

// Mimic User Scenario
// Tempo 95%, Time 0, Quality 0.3 stars.
// Assuming 0.3 stars means confidence = 0.3?
// Or maybe user meant "Quality Score was 0.3 which is 30%?" No "0.3 stars".
// If display says "0.3 Quality", likely average confidence is 0.3.

const historyItem = {
    bpm: 95,
    actualDuration: 0,
    rating: 'manual', // or undefined? User says time is 0. If manual, time is 100. If not manual...
    confidence: 0.3 // 0.3 stars?
};

console.log("--- Test Case 1: Manual with 0.3 confidence ---");
_calculateMasteryIndex({ ...historyItem, rating: 'manual' }, 100, 300, 'Exercises');

console.log("--- Test Case 2: Not manual with 0.3 confidence ---");
_calculateMasteryIndex({ ...historyItem, rating: undefined }, 100, 300, 'Exercises');

console.log("--- Test Case 3: 2 Items Averaging to 85% ---");
// Item 1: 100% (Manual 5 stars)
// Item 2: ?
// Avg 85 -> (100 + X)/2 = 85 -> X = 70.
// How to get 70?
// Tempo 90 (90%). Time 0 (null). Quality ?
// (90 + Q)/2 = 70 -> 90+Q = 140 -> Q = 50 (2.5 stars).
