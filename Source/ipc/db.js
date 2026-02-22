/**
 * ipc/db.js — IPC handlers for the low-level database (lowdb) and
 *             the BPM-progression update logic that lives in main.js.
 */
'use strict';

const { ipcMain } = require('electron');
const { initDB } = require('../services/db');
const LibraryService = require('../services/LibraryService');
const UserPreferencesService = require('../services/UserPreferencesService');

function registerDbHandlers() {

    // Read the entire DB state
    ipcMain.handle('db:get', async () => {
        const db = await initDB();
        await db.read();
        return db.data;
    });

    // Overwrite the entire DB state (used by sync operations)
    ipcMain.handle('db:set', async (_event, newData) => {
        const db = await initDB();
        db.data = newData;
        await db.write();
    });

    /**
     * Update BPM progression for a library item after a practice session.
     *
     * Rating rules:
     *   'easy'   → +2 BPM
     *   'hard'   → -2 BPM (min 40)
     *   'manual' → use explicitBpm directly
     *
     * Also stores a history entry and updates global check-in count.
     */
    ipcMain.handle('library:update-progress', async (
        _event,
        { id, rating, explicitBpm, confidence, bpm: baselineBpm, duration, actualDuration, plannedDuration }
    ) => {
        const db = await initDB();
        await db.read();

        const exercises = db.data.exercises || [];
        let itemIndex = exercises.findIndex(e => e.id === id);

        // Create DB entry if it doesn't exist yet
        if (itemIndex === -1) {
            const newItem = { id, bpm: baselineBpm || 100, history: [] };
            exercises.push(newItem);
            itemIndex = exercises.length - 1;
        }

        const item = exercises[itemIndex];
        const oldBpm = item.bpm || baselineBpm || 100;
        let newBpm = oldBpm;

        // Calculate new BPM
        if (rating === 'manual' && explicitBpm) {
            newBpm = explicitBpm;
        } else if (rating === 'easy') {
            newBpm += 2;
        } else if (rating === 'hard') {
            newBpm = Math.max(40, newBpm - 2);
        }

        // Build history entry
        if (!item.history) item.history = [];

        const historyEntry = {
            date: new Date().toISOString(),
            bpm: newBpm,
            rating,
            oldBpm,
            actualDuration: actualDuration || duration || 0,
            plannedDuration: plannedDuration || 0
        };

        // Attach active session ID if present
        const prefs = await UserPreferencesService.getPreferences();
        if (prefs.session && prefs.session.isActive && prefs.session.sessionId) {
            historyEntry.sessionId = prefs.session.sessionId;
        }

        if (confidence) {
            historyEntry.confidence = confidence;
        }

        item.history.push(historyEntry);

        // Update tracked BPM — lastSuccessBPM stores the tempo they actually played at
        item.bpm = newBpm;
        item.lastSuccessBPM = baselineBpm || oldBpm;
        item.lastPlayed = new Date().toISOString();

        // Update global check-in counter
        if (!db.data.user.totalCheckins) db.data.user.totalCheckins = 0;
        db.data.user.totalCheckins++;

        exercises[itemIndex] = item;
        db.data.exercises = exercises;
        await db.write();

        // Also sync progress to the physical config.json inside the Library folder
        try {
            const catalog = await LibraryService.getCatalog();
            const catalogItem = catalog.items.find(i => i.id === id);

            if (catalogItem && catalogItem.path) {
                const fsName = require('path').basename(catalogItem.path);
                const parent = catalogItem.parent === 'exercises'
                    ? 'Exercises'
                    : catalogItem.parent === 'songs'
                        ? 'Songs'
                        : null;

                if (parent) {
                    await LibraryService.updateProgress(fsName, newBpm, historyEntry, parent);
                }
            }
        } catch (e) {
            console.error('Failed to sync progress to physical config:', e);
        }

        return { success: true, newBpm };
    });
}

module.exports = { registerDbHandlers };
