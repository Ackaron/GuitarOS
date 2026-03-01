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

    let qualityScore = 0;

    // 1. Calculate Quality Score (0-100)
    // If we have a 1-5 confidence rating (or it's a non-metronome module)
    if (confidence || moduleType === 'theory' || moduleType === 'repertoire') {
        const confidenceScoreMap = { 1: 40, 2: 60, 3: 75, 4: 90, 5: 100 };
        qualityScore = confidenceScoreMap[confidence || 3];
    } else {
        // Metronome / Speed building module
        const safeTarget = targetBpm || actualBpm || 120;
        const progressRatio = Math.min(actualBpm / safeTarget, 1);

        qualityScore = 30 + (progressRatio * 50); // Base: 30 to 80 based on BPM vs Target

        if (userRating === 'easy') qualityScore += 20;
        else if (userRating === 'good') qualityScore += 10;
        // if 'hard', we only get the base speed ratio score
    }

    qualityScore = Math.max(0, Math.min(100, qualityScore));

    // 2. Calculate Discipline (Time) Score (0-100)
    const durationRatio = (plannedDuration && plannedDuration > 0)
        ? Math.min(actualDuration / plannedDuration, 1)
        : 1;
    const timeScore = Math.round(durationRatio * 100);

    // 3. Balance Quality vs Time based on Intent 
    let weightQuality = 0.5;
    let weightTime = 0.5;

    if (dayFocus === 'speed') {
        weightQuality = 0.7; // Speed prioritizes output (BPM)
        weightTime = 0.3;
    } else if (dayFocus === 'clarity') {
        weightQuality = 0.8; // Clarity prioritizes getting perfect stars
        weightTime = 0.2;
    } else if (dayFocus === 'stability') {
        weightQuality = 0.3;
        weightTime = 0.7;    // Stability strictly prioritizes putting in the TIME (stamina)
    }

    let baseScore = (qualityScore * weightQuality) + (timeScore * weightTime);

    // 4. Intent Synergies
    if (dayFocus === 'speed' && actualBpm > (targetBpm * 0.9) && userRating !== 'hard') {
        baseScore *= 1.1; // Bonus for reaching speed target comfortably
    }
    if (dayFocus === 'clarity' && (confidence >= 4 || userRating === 'easy')) {
        baseScore *= 1.1; // Bonus for extreme cleanliness
    }
    if (dayFocus === 'stability' && durationRatio >= 0.95 && (confidence >= 3 || userRating !== 'hard')) {
        baseScore *= 1.15; // Massive stamina bonus for finishing the timer without failing
    }

    // 5. Anti-Cheat: Harsh penalty for skipping early
    // If you skip halfway or less, your overall score drops severely
    if (durationRatio < 0.5) {
        // e.g., durationRatio = 0.1 (10% played). Multiplier = 0.5 + 0.1 = 0.6x
        baseScore *= (0.5 + durationRatio);
    }

    return Math.max(0, Math.min(100, Math.round(baseScore)));
};
