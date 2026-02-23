/**
 * GPService.js — Manages Guitar Pro process lifecycle.
 *
 * Strategy:
 *   1. Try `shell.openPath(filePath)` — honours the OS file association.
 *   2. If the user has set an explicit `guitarProPath`, use that directly.
 *   3. Fall back to `exec("start <file>")` via cmd.exe.
 */
'use strict';

const { shell } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const UserPreferencesService = require('./UserPreferencesService');

class GPService {

    /**
     * Open a file in Guitar Pro.
     * @param {string} filePath - Absolute path to the .gp / .gp5 / .gpx file
     */
    async openFile(filePath) {
        if (!filePath) {
            console.warn('GPService.openFile: no file path provided');
            return;
        }

        try {
            const prefs = await UserPreferencesService.getPreferences();
            const general = prefs.general || {};

            if (general.launchGuitarPro === false || general.launchGuitarPro === 'false') {
                console.log(`GPService: openFile suppressed. launchGuitarPro=${general.launchGuitarPro} (type: ${typeof general.launchGuitarPro})`);
                return;
            }

            const gpExePath = general.guitarProPath;

            if (gpExePath) {
                exec(`"${gpExePath}" "${filePath}"`, err => {
                    if (err) console.error('Failed to open GP via explicit path:', err);
                });
                return;
            }

            // Primary: OS file association via Electron shell
            const error = await shell.openPath(filePath);
            if (error) {
                console.warn('shell.openPath failed, trying start command:', error);
                exec(`start "" "${filePath}"`, err => {
                    if (err) console.error('All GP open strategies failed:', err);
                });
            }
        } catch (err) {
            console.error('GPService.openFile error:', err);
        }
    }

    /** Terminate Guitar Pro (Windows only). */
    async close() {
        return new Promise((resolve) => {
            exec('taskkill /F /IM GuitarPro.exe /T', err => {
                if (err) console.log('GP close error (may already be closed):', err.message);
                resolve();
            });
        });
    }
}

module.exports = new GPService();
