/**
 * ipc/prefs.js — IPC handlers for User Preferences.
 */
'use strict';

const { ipcMain } = require('electron');
const UserPreferencesService = require('../services/UserPreferencesService');

function registerPrefsHandlers() {

    // Read all preferences
    ipcMain.handle('prefs:get', async () => {
        return await UserPreferencesService.getPreferences();
    });

    // Deep-merge and persist preferences (partial update is fine)
    ipcMain.handle('prefs:save', async (_event, newPrefs) => {
        return await UserPreferencesService.savePreferences(newPrefs);
    });

    // Update the live-session state (index, timer, isActive, …)
    ipcMain.handle('prefs:update-session', async (_event, sessionState) => {
        return await UserPreferencesService.updateSessionState(sessionState);
    });
}

module.exports = { registerPrefsHandlers };
