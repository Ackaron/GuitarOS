/**
 * ipc/db.js — IPC handlers for the low-level database (lowdb) and
 *             the BPM-progression update logic.
 */
'use strict';

const { ipcMain } = require('electron');
const { initDB, getUserDB, switchUser, clearUser, getCurrentUser } = require('../services/db');
const LibraryService = require('../services/LibraryService');
const UserPreferencesService = require('../services/UserPreferencesService');

function registerDbHandlers() {

    // Get the common database data
    ipcMain.handle('db:get', async () => {
        const db = getUserDB();
        await db.read();
        return db.data;
    });

    // Login/Switch User
    ipcMain.handle('db:login', async (_event, name) => {
        if (!name) {
            await clearUser();
            return { success: true };
        }
        await switchUser(name);
        const db = getUserDB();
        await db.read();
        return { success: true, data: db.data };
    });

    // Compatibility aliases for frontend
    ipcMain.handle('db:set-user', async (_event, name) => {
        await switchUser(name);
        return { success: true };
    });

    ipcMain.handle('db:clear-user', async () => {
        await clearUser();
        return { success: true };
    });

    // Logout
    ipcMain.handle('db:logout', async () => {
        await clearUser();
        return { success: true };
    });

    // Get current profile
    ipcMain.handle('db:get-profile', async () => {
        const db = getUserDB();
        await db.read();
        return db.data;
    });

    // Overwrite the entire DB state (used by sync operations)
    ipcMain.handle('db:set', async (_event, newData) => {
        const userDb = getUserDB();
        userDb.data = newData;
        await userDb.write();
    });

    /**
     * Update BPM progression for a library item after a practice session.
     *
     * Rating rules:
     *   'easy'   → +2 BPM
     *   'hard'   → -2 BPM (min 40)
     *   'manual' → use explicitBpm directly
     */
    ipcMain.handle('library:update-progress', async (
        _event,
        { id, rating, explicitBpm, confidence, bpm: baselineBpm, duration, actualDuration, plannedDuration, score }
    ) => {
        const db = getUserDB();
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
            plannedDuration: plannedDuration || 0,
            score: score || null
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

        // Update tracked BPM
        item.bpm = newBpm;
        item.lastSuccessBPM = baselineBpm || oldBpm;
        item.lastPlayed = new Date().toISOString();

        // Update global check-in counter
        if (!db.data.user) db.data.user = { name: getCurrentUser(), totalCheckins: 0 };
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
