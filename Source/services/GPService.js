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

        // Fix frontend file URIs to native OS paths
        if (filePath.startsWith('file://')) {
            try {
                filePath = require('url').fileURLToPath(filePath);
            } catch (e) {
                // Fallback for edge cases
                filePath = decodeURIComponent(filePath.replace(/^file:\/\/\/?/, ''));
                if (process.platform === 'win32' && filePath.startsWith('/')) {
                    filePath = filePath.slice(1); // Remove leading slash for Windows drives
                }
            }
        }

        // Also normalize windows slashes
        filePath = path.normalize(filePath);

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

            // Primary: OS file association via explorer.exe to simulate actual Double Click
            // This bypasses a bug where GP only opens the title screen when using shell.openPath or start
            exec(`explorer.exe "${filePath}"`, async (err) => {
                // explorer.exe often returns exit code 1 even when successful. 
                // DO NOT fall back to shell.openPath here, otherwise it triggers GP to open the splash screen again and break.
                if (err && err.code !== 1) {
                    console.warn(`explorer.exe "${filePath}" failed with code ${err.code}, falling back to start command:`, err);
                    exec(`start "" "${filePath}"`, err2 => {
                        if (err2) console.error('All GP open strategies failed:', err2);
                    });
                }
            });
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
