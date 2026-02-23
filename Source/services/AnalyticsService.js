/**
 * AnalyticsService.js — Compute analytics and mastery scores from the DB.
 *
 * Mastery Index (V2.0):
 *   Learning phase  (BPM < target): Tempo 50% + Time 50%
 *   Mastery phase   (BPM >= target): Tempo ~33% + Time ~33% + Quality ~33%
 */
'use strict';

const { getUserDB } = require('./db');
const LibraryService = require('./LibraryService');

class AnalyticsService {

    // ─── Level 1 ─────────────────────────────────────────────────────────────

    /** Global KPI snapshot (hours, check-ins, level, active days). */
    async getGlobalStats() {
        const db = getUserDB();
        await db.read();
        const data = db.data;

        const totalCheckins = data.user?.totalCheckins || 0;
        const totalMinutes = totalCheckins * 5; // Estimate: ~5 min per check-in
        const totalHours = Math.floor(totalMinutes / 60);
        const level = Math.floor(totalCheckins / 25) + 1;

        // Unique activity days from all exercise history
        const allDates = [];
        (data.exercises || []).forEach(ex =>
            (ex.history || []).forEach(h => allDates.push(new Date(h.date)))
        );
        const daysActive = new Set(allDates.map(d => d.toDateString())).size;

        return { totalHours, totalCheckins, level, daysActive };
    }

    /** Flat chronological list of all history entries across all exercises. */
    async getGlobalHistory() {
        const db = getUserDB();
        await db.read();

        const allHistory = [];
        (db.data.exercises || []).forEach(ex =>
            (ex.history || []).forEach(h =>
                allHistory.push({ title: ex.title || 'Unknown Exercise', ...h, dateObj: new Date(h.date) })
            )
        );

        allHistory.sort((a, b) => a.dateObj - b.dateObj);
        return allHistory;
    }

    /** Activity heatmap data: { date: 'YYYY-MM-DD', count: number }[] */
    async getHeatmapData() {
        const db = getUserDB();
        await db.read();

        const activityMap = {};
        (db.data.exercises || []).forEach(ex =>
            (ex.history || []).forEach(h => {
                const day = new Date(h.date).toISOString().split('T')[0];
                activityMap[day] = (activityMap[day] || 0) + 1;
            })
        );

        return Object.keys(activityMap).map(date => ({ date, count: activityMap[date] }));
    }

    // ─── Level 2 ─────────────────────────────────────────────────────────────

    /** Breakdown of sessions / hours / BPM growth by category. */
    async getCategoryBreakdown() {
        const catalog = await LibraryService.getCatalog();
        const db = getUserDB();
        await db.read();

        const stats = {
            Technique: { count: 0, time: 0, growth: 0 },
            Songs: { count: 0, time: 0, growth: 0 },
            Theory: { count: 0, time: 0, growth: 0 },
            Exercises: { count: 0, time: 0, growth: 0 }
        };

        for (const ex of (db.data.exercises || [])) {
            const histCount = ex.history ? ex.history.length : 0;
            if (histCount === 0) continue;

            const catalogItem = catalog.items.find(i => i.id === ex.id);
            if (!catalogItem) continue;

            let category = 'Exercises';
            if (catalogItem.path.includes('Technique')) category = 'Technique';
            else if (catalogItem.path.includes('Songs')) category = 'Songs';
            else if (catalogItem.path.includes('Theory')) category = 'Theory';

            if (!stats[category]) stats[category] = { count: 0, time: 0, growth: 0 };
            stats[category].count += histCount;
            stats[category].time += histCount * 5;

            const bpms = ex.history.map(h => h.bpm);
            const growth = Math.max(...bpms) - Math.min(...bpms);
            if (growth > 0) stats[category].growth += growth;
        }

        return Object.keys(stats).map(key => ({
            name: key,
            sessions: stats[key].count,
            hours: (stats[key].time / 60).toFixed(1),
            growth: stats[key].growth
        }));
    }

    // ─── Level 3 ─────────────────────────────────────────────────────────────

    /**
     * Mastery trend chart data.
     * Optionally filtered by category name or a specific item ID.
     */
    async getMasteryTrend(categoryFilter = null, itemId = null) {
        const db = getUserDB();
        await db.read();
        const catalog = await LibraryService.getCatalog();

        let flatHistory = [];

        (db.data.exercises || []).forEach(ex => {
            if (itemId && ex.id !== itemId) return;

            const catalogItem = catalog.items.find(i => i.id === ex.id);
            if (!catalogItem) return;

            let cat = 'Exercises';
            if (catalogItem.path.includes('Technique')) cat = 'Technique';
            else if (catalogItem.path.includes('Songs')) cat = 'Songs';
            else if (catalogItem.path.includes('Theory')) cat = 'Theory';

            if (categoryFilter && cat !== categoryFilter) return;

            const targetBpm = catalogItem.targetBPM || catalogItem.originalBpm || catalogItem.bpm || 120;
            const targetDuration = catalogItem.duration || 300;

            (ex.history || []).forEach(h => {
                const details = this._calculateMasteryDetails(h, targetBpm, targetDuration);
                const currentBpm = h.bpm || 0;
                const bpmPercent = targetBpm > 0 ? (currentBpm / targetBpm) * 100 : 0;

                let numQuality = 0;
                if (details.isMasteryPhase || h.confidence > 0) {
                    if (h.rating === 'manual') numQuality = h.confidence || 5;
                    else if (h.confidence) numQuality = h.confidence;
                    else if (h.rating === 'easy') numQuality = 5;
                    else if (h.rating === 'good') numQuality = 3;
                    else if (h.rating === 'hard') numQuality = 1;
                }

                flatHistory.push({
                    dateObj: new Date(h.date),
                    mastery: details.totalScore,
                    details,
                    title: ex.title || 'Unknown',
                    bpmPercent: Math.min(200, bpmPercent),
                    time: h.actualDuration || h.duration || 0,
                    quality: numQuality,
                    sessionId: h.sessionId || null
                });
            });
        });

        // A. Group entries that share an explicit sessionId
        const explicitSessions = new Map();
        const legacyItems = [];

        flatHistory.forEach(item => {
            if (item.sessionId) {
                if (!explicitSessions.has(item.sessionId)) {
                    explicitSessions.set(item.sessionId, this._newSessionAccumulator(item.dateObj));
                }
                this._accumulateSession(explicitSessions.get(item.sessionId), item);
            } else {
                legacyItems.push(item);
            }
        });

        // B. Group legacy entries by time gap (45 min window)
        legacyItems.sort((a, b) => a.dateObj - b.dateObj);

        const SESSION_GAP_MS = 45 * 60 * 1000;
        const legacySessions = [];
        let currentLegacy = null;

        legacyItems.forEach(item => {
            if (!currentLegacy || (item.dateObj - currentLegacy.lastTime > SESSION_GAP_MS)) {
                currentLegacy = { ...this._newSessionAccumulator(item.dateObj), isExplicit: false, lastTime: item.dateObj };
                legacySessions.push(currentLegacy);
            }
            this._accumulateSession(currentLegacy, item);
            currentLegacy.lastTime = item.dateObj;
        });

        // C. Merge and format
        const allSessions = [...Array.from(explicitSessions.values()), ...legacySessions];
        allSessions.sort((a, b) => a.dateObj - b.dateObj);

        return allSessions.map((s, index) => {
            const avgTempoComp = s.accTempoWeighted / s.count;
            const avgTimeComp = s.accTimeWeighted / s.count;
            const avgQualityComp = s.accQualityWeighted / s.count;

            return {
                index: index + 1,
                dateObj: s.dateObj,
                date: s.dateObj.toLocaleDateString(),
                timeLabel: s.dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                mastery: Math.min(100, Math.round(avgTempoComp + avgTimeComp + avgQualityComp)),
                title: itemId
                    ? Array.from(s.titles)[0]
                    : `Session #${index + 1}${s.isExplicit ? '' : ' (Legacy)'}`,
                bpm: Math.round(s.totalBpmPercent / s.count),
                isBpmPercentage: true,
                time: s.totalTime,
                quality: s.count > 0 ? `${(s.totalQualityStars / s.count).toFixed(1)}★` : '-'
            };
        });
    }

    /** Per-item BPM history for the detail drill-down chart. */
    async getItemHistory(id) {
        const db = getUserDB();
        await db.read();
        const item = (db.data.exercises || []).find(e => e.id === id);
        if (!item || !item.history) return [];

        return item.history.map(h => ({
            date: new Date(h.date).toLocaleDateString(),
            bpm: h.bpm,
            rating: h.rating,
            confidence: h.confidence || (h.rating === 'easy' ? 5 : h.rating === 'good' ? 3 : 1)
        }));
    }

    /** Reset all history and global statistics. */
    async clearHistory() {
        const db = getUserDB();
        await db.read();

        if (db.data.user) db.data.user.totalCheckins = 0;
        (db.data.exercises || []).forEach(ex => { ex.history = []; });

        await db.write();
        return { success: true };
    }

    // ─── Mastery calculation ─────────────────────────────────────────────────

    _calculateMasteryDetails(h, targetBpm, targetDuration) {
        const currentBpm = h.bpm || 0;
        const actual = h.actualDuration || h.duration || 0;
        const planned = h.plannedDuration || targetDuration || 300;

        const isMasteryPhase = targetBpm > 0 && currentBpm >= targetBpm;

        let tempoPoints = 0;
        let timePoints = 0;
        let qualityPoints = 0;

        if (!isMasteryPhase) {
            // Scenario A — Learning: Tempo 50% + Time 50%
            tempoPoints = targetBpm > 0 ? Math.min(50, (currentBpm / targetBpm) * 50) : 50;
            timePoints = actual > 0 && planned > 0 ? Math.min(50, (actual / planned) * 50) : 0;
        } else {
            // Scenario B — Mastery: Tempo ~33% + Time ~33% + Quality ~33%
            tempoPoints = targetBpm > 0 ? Math.min(34.0, (currentBpm / targetBpm) * 33.3) : 33.3;
            timePoints = actual > 0 && planned > 0 ? Math.min(33.3, (actual / planned) * 33.3) : 0;

            let stars = 0;
            if (h.rating === 'manual') stars = h.confidence || 5;
            else if (h.confidence) stars = h.confidence;
            else if (h.rating === 'easy') stars = 5;
            else if (h.rating === 'good') stars = 3;
            else if (h.rating === 'hard') stars = 1;

            qualityPoints = Math.min(33.3, (stars / 5) * 33.3);
        }

        return {
            totalScore: tempoPoints + timePoints + qualityPoints,
            tempoWeighted: tempoPoints,
            timeWeighted: timePoints,
            qualityWeighted: qualityPoints,
            isMasteryPhase
        };
    }

    // ─── Session accumulator helpers ─────────────────────────────────────────

    _newSessionAccumulator(dateObj) {
        return {
            dateObj,
            accTempoWeighted: 0, accTimeWeighted: 0, accQualityWeighted: 0,
            totalBpmPercent: 0, totalTime: 0, totalQualityStars: 0,
            count: 0, titles: new Set(), isExplicit: true
        };
    }

    _accumulateSession(s, item) {
        if (item.dateObj < s.dateObj) s.dateObj = item.dateObj;
        s.accTempoWeighted += item.details.tempoWeighted;
        s.accTimeWeighted += item.details.timeWeighted;
        s.accQualityWeighted += item.details.qualityWeighted;
        s.totalBpmPercent += item.bpmPercent;
        s.totalTime += item.time;
        s.totalQualityStars += item.quality;
        s.count++;
        s.titles.add(item.title);
    }
}

module.exports = new AnalyticsService();
