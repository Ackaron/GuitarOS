/**
 * UserPreferencesService.js — Reads and writes user_preferences.json.
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const { USER_DATA_PATH } = require('../config/dataPath');

const PREFS_PATH = path.join(USER_DATA_PATH, 'user_preferences.json');

class UserPreferencesService {
    constructor() {
        this._pendingSessionState = null;
        this._sessionWriteTimer = null;

        this.defaultPrefs = {
            general: {
                language: 'ru',
                launchReaper: true,
                launchGuitarPro: true
            },
            routine: {
                modules: [
                    { id: 'theory', type: 'theory', target: 'C Major', percentage: 15 },
                    { id: 'technique', type: 'technique', target: ['Alternate Picking'], percentage: 25 },
                    { id: 'exercises', type: 'exercise', strategy: 'item', target: '', percentage: 20 },
                    { id: 'song', type: 'repertoire', target: 'monthly', percentage: 40 }
                ]
            },
            session: {
                isActive: false,
                currentRoutine: [],
                currentIndex: 0,
                elapsedTime: 0,
                stepTimeRemaining: 0,
                lastUpdated: null
            }
        };
        this.init();
    }

    async init() {
        try {
            if (!await fs.pathExists(PREFS_PATH)) {
                await fs.writeJson(PREFS_PATH, this.defaultPrefs, { spaces: 2 });
            }
        } catch (err) {
            console.error('Failed to init UserPreferencesService:', err);
        }
    }

    async getPreferences() {
        try {
            if (await fs.pathExists(PREFS_PATH)) {
                return await fs.readJson(PREFS_PATH);
            }
            return this.defaultPrefs;
        } catch (err) {
            console.error('Error reading prefs:', err);
            return this.defaultPrefs;
        }
    }

    /**
     * Deep-merge newPrefs into existing preferences and persist.
     * @param {Object} newPrefs - Partial prefs object to merge
     */
    async savePreferences(newPrefs) {
        try {
            const current = await this.getPreferences();

            // Simple deep merge for the 2-level structure we have
            const updated = { ...current };
            for (const key in newPrefs) {
                if (typeof newPrefs[key] === 'object' && newPrefs[key] !== null && !Array.isArray(newPrefs[key])) {
                    updated[key] = { ...(updated[key] || {}), ...newPrefs[key] };

                    // Sanitization: Ensure launch flags are booleans if they exist in the update
                    if (key === 'general') {
                        if (newPrefs.general.hasOwnProperty('launchReaper')) {
                            updated.general.launchReaper = !!newPrefs.general.launchReaper;
                        }
                        if (newPrefs.general.hasOwnProperty('launchGuitarPro')) {
                            updated.general.launchGuitarPro = !!newPrefs.general.launchGuitarPro;
                        }
                    }
                } else {
                    updated[key] = newPrefs[key];
                }
            }

            await fs.writeJson(PREFS_PATH, updated, { spaces: 2 });
            return { success: true, prefs: updated };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Merge sessionState into the `session` key of prefs and persist.
     * Debounced: batches rapid updates (e.g. timer ticks) into a single
     * disk write after 500 ms of inactivity.
     * @param {Object} sessionState - Partial session object to merge
     */
    updateSessionState(sessionState) {
        // Accumulate state in memory
        this._pendingSessionState = {
            ...(this._pendingSessionState || {}),
            ...sessionState,
            lastUpdated: Date.now()
        };

        // Reset the debounce timer
        if (this._sessionWriteTimer) clearTimeout(this._sessionWriteTimer);

        this._sessionWriteTimer = setTimeout(async () => {
            try {
                const current = await this.getPreferences();
                const updated = {
                    ...current,
                    session: { ...current.session, ...this._pendingSessionState }
                };
                await fs.writeJson(PREFS_PATH, updated, { spaces: 2 });
                this._pendingSessionState = null;
            } catch (err) {
                console.error('Session write failed:', err);
            }
        }, 500);

        return Promise.resolve({ success: true, pending: true });
    }
}

module.exports = new UserPreferencesService();
