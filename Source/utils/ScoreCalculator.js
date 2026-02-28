/**
 * ScoreCalculator.js
 * 
 * Computes a unified 0-100 mastery score based on:
 * - Module Type (Technique, Repertoire, etc.)
 * - Day Focus (Speed, Clarity, Stability)
 * - Target BPM vs Actual BPM
 * - User Rating (Hard, Good, Easy / Confidence 1-5)
 */

export const calculateScore = (params) => {
    const {
        moduleType,     // 'technique', 'theory', 'repertoire', 'exercise'
        dayFocus,       // 'speed', 'clarity', 'stability'
        targetBpm,
        actualBpm,
        userRating,     // 'hard', 'good', 'easy' (for speed building)
        confidence,     // 1-5 (for target reached / musicality)
        plannedDuration,
        actualDuration
    } = params;

    let baseScore = 0;

    // --- Scenario 1: Feature reached target or it's a non-speed module ---
    if (confidence || moduleType === 'theory' || moduleType === 'repertoire') {
        // Base score driven heavily by user confidence (1-5)
        const confidenceScoreMap = { 1: 40, 2: 60, 3: 75, 4: 90, 5: 100 };
        baseScore = confidenceScoreMap[confidence || 3]; // Default to 75 if missing
    }
    // --- Scenario 2: Speed building phase (Target not reached yet) ---
    else {
        // Calculate progression towards target
        const safeTarget = targetBpm || actualBpm || 120;
        const progressRatio = Math.min(actualBpm / safeTarget, 1);

        // Base score starts from BPM progress (scaled 30 to 80)
        baseScore = 30 + (progressRatio * 50);

        // Adjust based on user perceived difficulty
        if (userRating === 'easy') baseScore += 10;
        if (userRating === 'hard') baseScore -= 10;
        if (userRating === 'good') baseScore += 5;
    }

    // --- Apply Day Focus Multipliers ---
    // If the user's intent matches the outcome, we boost the score.
    if (dayFocus === 'speed') {
        // High BPM progress is rewarded more
        if (!confidence && userRating !== 'hard' && actualBpm > (targetBpm * 0.8)) {
            baseScore *= 1.1;
        }
    } else if (dayFocus === 'clarity') {
        // High confidence/ease is rewarded more, even if BPM is lower
        if (confidence >= 4 || userRating === 'easy') {
            baseScore *= 1.15;
        } else if (userRating === 'hard') {
            // Penalize pushing too fast when focus is clarity
            baseScore *= 0.8;
        }
    } else if (dayFocus === 'stability') {
        // Hitting the exact planned duration without stopping early is rewarded
        const durationRatio = actualDuration / plannedDuration;
        if (durationRatio >= 0.9 && (confidence >= 3 || userRating !== 'hard')) {
            baseScore *= 1.1;
        }
    }

    // Cap between 0 and 100
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));
    return finalScore;
};
