const service = require('./services/AnalyticsService');

// Mock Data logic extraction for testing without DB
// We will access the private helper if valid or mock the call context.
// Actually, since _calculateMasteryDetails is part of class, let's just create an instance or use the exported singleton if it exposes the method?
// It does not expose `_calculateMasteryDetails` directly in exports?
// It is "module.exports = new AnalyticsService();"
// So `service._calculateMasteryDetails` should be accessible.

console.log("--- Verifying Mastery V2.0 Logic ---");

// Helper wrapper
function test(name, h, targetBpm, targetDuration, expectedScoreRange) {
    const res = service._calculateMasteryDetails(h, targetBpm, targetDuration);
    console.log(`\nTest: ${name}`);
    console.log(`Input: BPM=${h.bpm}/${targetBpm}, Time=${h.actualDuration}/${targetDuration}, Rating=${h.rating}, Conf=${h.confidence}`);
    console.log(`Result: Total=${res.totalScore.toFixed(2)}, Tempo=${res.tempoWeighted.toFixed(2)}, Time=${res.timeWeighted.toFixed(2)}, Quality=${res.qualityWeighted.toFixed(2)}`);

    if (res.totalScore >= expectedScoreRange[0] && res.totalScore <= expectedScoreRange[1]) {
        console.log("PASS");
    } else {
        console.log(`FAIL (Expected ${expectedScoreRange[0]}-${expectedScoreRange[1]})`);
    }
}

// 1. Scenario A (Learning): BPM 50/100, Time 300/300. 
// Tempo: (50/100)*50 = 25. Time: (300/300)*50 = 50. Quality: 0. Total = 75.
test("Scenario A - Perfect Time, Half Speed",
    { bpm: 50, actualDuration: 300, plannedDuration: 300, confidence: 5 },
    100, 300, [74.9, 75.1]
);

// 2. Scenario A (Learning): BPM 50/100, Time 0/300.
// Tempo: 25. Time: 0. Total = 25.
test("Scenario A - No Timer",
    { bpm: 50, actualDuration: 0, plannedDuration: 300 },
    100, 300, [24.9, 25.1]
);

// 3. Scenario B (Mastery): BPM 100/100, Time 300/300, 5 Stars.
// Tempo: 33.3. Time: 33.3. Quality: 33.3. Total = 99.9 (100).
test("Scenario B - Perfect Score",
    { bpm: 100, actualDuration: 300, plannedDuration: 300, confidence: 5 },
    100, 300, [99.8, 100.1]
);

// 4. Scenario B (Mastery): BPM 100/100, Time 0/300, 5 Stars. (Manual entry?)
// Tempo: 33.3. Time: 0. Quality: 33.3. Total = 66.6.
test("Scenario B - No Timer (Manual)",
    { bpm: 100, actualDuration: 0, plannedDuration: 300, rating: 'manual', confidence: 5 },
    100, 300, [66.5, 66.7]
);

// 5. Scenario B (Mastery): BPM 100/100, Time 300/300, 1 Star.
// Tempo: 33.3. Time: 33.3. Quality: 6.66. Total = ~73.3.
test("Scenario B - Low Quality",
    { bpm: 100, actualDuration: 300, plannedDuration: 300, confidence: 1 },
    100, 300, [73.0, 73.5]
);
