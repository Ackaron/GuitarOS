/**
 * ipc/reaper.js — IPC handlers for REAPER and Guitar Pro integration.
 *
 * Session lifecycle:
 *   reaper:start-session  → launch REAPER once + send first exercise
 *   reaper:load-exercise  → send file-bridge command (no restart)
 *   reaper:end-session    → kill REAPER
 */
'use strict';

const { ipcMain } = require('electron');
const path = require('path');
const { getUserDB } = require('../services/db');
const ReaperService = require('../services/ReaperService');
const ReaperFileService = require('../services/ReaperFileService');
const GPService = require('../services/GPService');
const UserPreferencesService = require('../services/UserPreferencesService');

function registerReaperHandlers() {

    // ── Session Lifecycle ─────────────────────────────────────────────────

    /**
     * Start a new REAPER session: update listener, launch REAPER once, load the first exercise.
     */
    ipcMain.handle('reaper:start-session', async (_event, exercise) => {
        try {
            if (!exercise || !exercise.path) {
                throw new Error('Exercise path is missing');
            }

            // Always update the listener script to ensure latest version is running
            await _autoUpdateListener();

            const exerciseToLoad = await _enrichExercise(exercise);
            const result = await ReaperService.startSession(exerciseToLoad, exerciseToLoad.path);

            await _maybeOpenGP(exerciseToLoad);

            if (result && !result.success) {
                throw new Error(result.error);
            }
            return result;
        } catch (err) {
            console.error('[IPC] reaper:start-session failed:', err);
            return { success: false, error: err.message, code: 'START_SESSION_FAILED' };
        }
    });

    /**
     * Load a different exercise into the running REAPER session (no restart).
     */
    ipcMain.handle('reaper:load-exercise', async (_event, exercise) => {
        try {
            if (!exercise || !exercise.path) {
                throw new Error('Exercise path is missing');
            }

            const exerciseToLoad = await _enrichExercise(exercise);
            console.log(`[IPC] Loading exercise: "${exerciseToLoad.title}" (ID: ${exerciseToLoad.id})`);

            const result = await ReaperService.sendExerciseCommand(exerciseToLoad, exerciseToLoad.path);

            await _maybeOpenGP(exerciseToLoad);

            if (result && !result.success) {
                throw new Error(result.error);
            }
            return result;
        } catch (err) {
            console.error('[IPC] reaper:load-exercise failed:', err);
            return { success: false, error: err.message, code: 'LOAD_EXERCISE_FAILED' };
        }
    });

    /**
     * End session: kill REAPER, close Guitar Pro.
     */
    ipcMain.handle('reaper:end-session', async () => {
        try {
            await GPService.close();
            await ReaperService.endSession();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message, code: 'END_SESSION_FAILED' };
        }
    });

    // ── Transport / Commands ──────────────────────────────────────────────

    ipcMain.handle('reaper:launch', () => {
        ReaperService.launch();
        return { success: true };
    });

    ipcMain.handle('reaper:kill', () => {
        ReaperService.kill();
        ReaperService.sessionActive = false;
        return { success: true };
    });

    ipcMain.handle('reaper:command', async (_event, commandId) => {
        try {
            const res = await ReaperService.sendCommand(commandId);
            return res; // res is already {success, data} or {success, error, code}
        } catch (e) {
            return { success: false, error: e.message, code: 'COMMAND_FAILED' };
        }
    });

    ipcMain.handle('reaper:setup_session', async (_event, data) => {
        return await ReaperFileService.sendCommand({ action: 'SETUP_SESSION', ...data });
    });

    ipcMain.handle('reaper:set-bpm', async (_event, bpm) => {
        return await ReaperFileService.sendCommand({ action: 'SET_BPM', bpm });
    });

    ipcMain.handle('reaper:transport', async (_event, action) => {
        return await ReaperService.transport(action);
    });

    ipcMain.handle('reaper:set-volume', async (_event, { trackIndex, volume }) => {
        return await ReaperService.setTrackVolume(trackIndex, volume);
    });

    ipcMain.handle('reaper:set-mute', async (_event, { trackIndex, isMuted }) => {
        return await ReaperService.setTrackMute(trackIndex, isMuted);
    });

    // ── Config & Listener ────────────────────────────────────────────────

    ipcMain.handle('reaper:auto-config', async () => {
        return await ReaperService.configureWebInterface();
    });

    ipcMain.handle('reaper:install-listener', async () => {
        try {
            const prefs = await UserPreferencesService.getPreferences();
            const reaperExe = (prefs.general?.reaperPath) || require('../config/paths').REAPER_PATH;
            const reaperDir = path.dirname(reaperExe);
            const appData = process.env.APPDATA || '';

            const scriptsDirCandidates = [
                path.join(reaperDir, 'Scripts'),
                path.join(reaperDir, '..', 'Scripts'),
                path.join(appData, 'REAPER', 'Scripts'),
            ];

            const fse = require('fs-extra');
            let scriptsDir = null;
            for (const candidate of scriptsDirCandidates) {
                if (await fse.pathExists(candidate)) { scriptsDir = candidate; break; }
            }
            if (!scriptsDir) {
                scriptsDir = path.join(reaperDir, 'Scripts');
                await fse.ensureDir(scriptsDir);
            }

            const srcListener = path.join(__dirname, '..', 'scripts', 'reaper_listener.lua');
            const dstListener = path.join(scriptsDir, 'reaper_listener.lua');
            await fse.copyFile(srcListener, dstListener);

            const startupPath = path.join(scriptsDir, '__startup.lua');
            const startupLine = `dofile(reaper.GetResourcePath() .. '/Scripts/reaper_listener.lua')\n`;
            if (await fse.pathExists(startupPath)) {
                let current = await fse.readFile(startupPath, 'utf8');
                if (!current.includes('reaper_listener.lua')) {
                    await fse.writeFile(startupPath, current + '\n' + startupLine);
                }
            } else {
                await fse.writeFile(startupPath, startupLine);
            }

            return { success: true, scriptPath: dstListener };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // ── Guitar Pro ──────────────────────────────────────────────────────

    ipcMain.handle('gp:open', (_event, filePath) => GPService.openFile(filePath));
    ipcMain.handle('gp:close', async () => {
        await GPService.close();
        return { success: true };
    });
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Auto-copy the latest Lua listener to REAPER's Scripts folder.
 * This ensures the updated script is always active without a manual reinstall step.
 */
async function _autoUpdateListener() {
    try {
        const fse = require('fs-extra');
        const srcListener = path.join(__dirname, '..', 'scripts', 'reaper_listener.lua');
        if (!fse.existsSync(srcListener)) return;

        const appData = process.env.APPDATA || '';
        const scriptsDirs = [
            path.join(appData, 'REAPER', 'Scripts'),
        ];

        // Also try to detect REAPER portable location from preferences
        try {
            const prefs = await UserPreferencesService.getPreferences();
            const reaperExe = prefs.general?.reaperPath;
            if (reaperExe) {
                scriptsDirs.push(path.join(path.dirname(reaperExe), 'Scripts'));
            }
        } catch (_) { /* ignore */ }

        for (const dir of scriptsDirs) {
            const dest = path.join(dir, 'reaper_listener.lua');
            if (await fse.pathExists(dir)) {
                await fse.copyFile(srcListener, dest);
                console.log('[IPC] Listener updated at:', dest);
            }
        }
    } catch (err) {
        console.warn('[IPC] Could not auto-update listener:', err.message);
    }
}

/**
 * Merge fresh BPM and db data into the exercise object.
 */
async function _enrichExercise(exercise) {
    const userDb = getUserDB();
    await userDb.read();
    const dbItem = (userDb.data.exercises || []).find(e => e.id === exercise.id);
    const enriched = { ...exercise, ...(dbItem || {}) };
    if (!enriched.path) enriched.path = exercise.path;
    return enriched;
}

/**
 * Open Guitar Pro tab file if the preference is enabled and the file exists.
 */
async function _maybeOpenGP(exercise) {
    const prefs = await UserPreferencesService.getPreferences();
    const launchGP = prefs.general?.launchGuitarPro;
    if (launchGP !== false && launchGP !== 'false' && exercise.files?.tab) {
        let gpPath = exercise.files.tab;
        if (!path.isAbsolute(gpPath)) gpPath = path.join(exercise.path, gpPath);
        GPService.openFile(gpPath);
    }
}

module.exports = { registerReaperHandlers };
