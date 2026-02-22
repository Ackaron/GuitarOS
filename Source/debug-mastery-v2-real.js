const service = require('./services/AnalyticsService');

// Data from DB
// Session #6 (dc0bf14a-bc26-4d87-9714-26182b6917a4) - 55%
// Items:
// 1. ID ...e57 (Grid)
//    BPM: 100. Target BPM: ? (Current BPM in item is 100).
//    History: { bpm: 100, actualDuration: 0, rating: 'good', confidence: 5 }
// 2. ID ...28d (Another item)
//    BPM: 105. Target: ? (Current 105).
//    History: { bpm: 105, actualDuration: 0, rating: 'good', confidence: 5 }
// 3. ID ...fb (Another)
//    BPM: 129. Target ? (Current 129).
//    History: { bpm: 129, actualDuration: 0, rating: 'good', confidence: 5 }

// Session #5 (832bf242-34d3-46e8-b068-4d1e4baaea5f) - 46%
// Items:
// 1. ID ...e57
//    History: { bpm: 100, actualDuration: 0, rating: 'good', confidence: 1 }
// 2. ID ...28d
//    History: { bpm: 105, actualDuration: 0, rating: 'good', confidence: 1 }
// 3. ID ...fb
//    History: { bpm: 129, actualDuration: 0, rating: 'good', confidence: 1 }

// We need to know Target BPM.
// In DB, `bpm` on the item level is essentially the Current Config.
// `targetBPM` is what we need. If not in DB, it falls back to `originalBpm` or `bpm`.
// The user said "Difference between Learning and Mastery".
// If `targetBpm` is not set, it defaults to `bpm` -> which means Current == Target -> Scenario B (Mastery).

// Assumption: Users items are in Scenario B (Mastery).
// Logic B: Tempo (33.3) + Time (33.3) + Quality (33.3).
// Time is 0. So max Score = 66.6%.

// Session #6 (Confidence 5 = 100% Quality)
// Tempo: 33.3 (100% of target)
// Time: 0
// Quality: 33.3 (5 stars)
// Total = 66.6%.
// User got 55%.
// 55 / 66.6 = 0.82?

// Session #5 (Confidence 1 = 20% Quality)
// Tempo: 33.3
// Time: 0
// Quality: 6.66 (1 star)
// Total = 39.96%.
// User got 46%.
// 46 / 40 = 1.15?

console.log("--- Debugging Specific Sessions ---");
console.log("Assumption: Target BPM = Current BPM (Scenario B)");

function debugCalc(bpm, target, actual, planned, confidence) {
    const res = service._calculateMasteryDetails(
        { bpm, actualDuration: actual, rating: 'good', confidence },
        target, planned
    );
    console.log(`BPM ${bpm}/${target}, Time ${actual}, Conf ${confidence} -> Total ${res.totalScore.toFixed(2)}`);
    console.log(`  Tempo: ${res.tempoWeighted.toFixed(2)}`);
    console.log(`  Time: ${res.timeWeighted.toFixed(2)}`);
    console.log(`  Qual: ${res.qualityWeighted.toFixed(2)}`);
    return res;
}

console.log("\nSession #6 Item 1 (Scenario B):");
const s6_i1 = debugCalc(100, 100, 0, 720, 5);

console.log("\nSession #5 Item 1 (Scenario B):");
const s5_i1 = debugCalc(100, 100, 0, 720, 1);

// What if Target BPM was HIGHER? e.g. 120?
// Then Scenario A (Learning).
// Tempo = (100/120)*50 = 41.6. Time = 0. Total = 41.6%.
// Quality ignored.

// Wait, looking at DB again.
// Item ...e57: "bpm": 100. "lastSuccessBPM": 100.
// If targetBPM is missing, logic uses: `catalogItem.targetBPM || catalogItem.originalBpm || catalogItem.bpm || 120`.

// Let's verify what happens if `targetBpm` is indeed 100 (Scenario B).
// Session 6 Total = Sum(AvgTempo + AvgTime + AvgQuality).
// S6 has 3 items. All identical structure?
// Item 1: 100/100, 0 time, 5 stars. Score 66.6.
// Item 2: 105/105, 0 time, 5 stars. Score 66.6.
// Item 3: 129/129, 0 time, 5 stars. Score 66.6.
// Avg Tempo = 33.3. Avg Time = 0. Avg Quality = 33.3.
// Final = 66.6%.

// Why did user get 55%?
// 55 is (66.6 + 49.5) / 2? No.
// 55 is (129 + 105 + 100) / ... no.

// What if one item WAS Scenario A?
// e.g. Item 3 (129). Maybe Target is 130?
// If Scen A: Tempo (129/130)*50 = 49.6. Time 0. Total 49.6.
// Avg of (66.6, 66.6, 49.6) = 60.9?

// I suspect the Aggregation Logic.
// "Sum of averages".
// Session #6:
// Item 1: Tempo 33.3, Time 0, Qual 33.3
// Item 2: Tempo 33.3, Time 0, Qual 33.3
// Item 3: Tempo 33.3, Time 0, Qual 33.3
// Agg: AvgTempo=33.3, AvgTime=0, AvgQual=33.3. Sum=66.6.

// Wait... User's screenshot says "Tempo 99%".
// If Tempo is 99%, that implies `current < target`.
// SCENARIO A!
// If Scenario A:
// Tempo 99% of 50 = 49.5.
// Time = 0.
// Quality = Ignored (0).
// Total = 49.5%.
// Use got 55%.
// Maybe Tempo > 100% (Scenario A cap is 50)?
// Or maybe user has mixed items?
