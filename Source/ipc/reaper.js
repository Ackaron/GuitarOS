/**
 * ipc/reaper.js — IPC handlers for REAPER and Guitar Pro integration.
 */
'use strict';

const { ipcMain } = require('electron');
const path = require('path');
const ReaperService = require('../services/ReaperService');
const ReaperFileService = require('../services/ReaperFileService');
const GPService = require('../services/GPService');
const { initDB } = require('../services/db');

function registerReaperHandlers() {

    // Launch REAPER
    ipcMain.handle('reaper:launch', () => {
        console.log('IPC: reaper:launch');
        ReaperService.launch();
        return { success: true };
    });

    // Kill REAPER
    ipcMain.handle('reaper:kill', () => {
        ReaperService.kill();
    });

    // Send a raw command ID to REAPER Web Interface
    ipcMain.handle('reaper:command', async (_event, commandId) => {
        try {
            const res = await ReaperService.sendCommand(commandId);
            return { success: true, data: res };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    // Setup session via file bridge
    ipcMain.handle('reaper:setup_session', async (_event, data) => {
        return await ReaperFileService.sendCommand({
            action: 'SETUP_SESSION',
            ...data
        });
    });

    /**
     * Load an exercise into REAPER and optionally open Guitar Pro.
     * The frontend sends the full exercise object (including absolute `path`).
     */
    ipcMain.handle('reaper:load-exercise', async (_event, exercise) => {
        try {
            if (!exercise.path) {
                throw new Error('Exercise path is missing');
            }

            // Merge fresh BPM from DB
            const db = await initDB();
            const dbItem = (db.data.exercises || []).find(e => e.id === exercise.id);
            const exerciseToLoad = { ...exercise, ...(dbItem || {}) };
            if (exercise.path) exerciseToLoad.path = exercise.path;

            // Load in REAPER
            await ReaperService.loadExercise(exerciseToLoad, exerciseToLoad.path);

            // Open Guitar Pro tab file
            if (exercise.files && exercise.files.tab) {
                let gpFullPath = exercise.files.tab;
                if (!path.isAbsolute(gpFullPath)) {
                    gpFullPath = path.join(exercise.path, gpFullPath);
                }
                console.log('Opening GP file:', gpFullPath);
                GPService.openFile(gpFullPath);
            }

            return { success: true };
        } catch (err) {
            console.error('Failed to load exercise:', err);
            return { success: false, error: err.message };
        }
    });

    // Set BPM in real-time via file bridge
    ipcMain.handle('reaper:set-bpm', async (_event, bpm) => {
        return await ReaperFileService.sendCommand({ action: 'SET_BPM', bpm });
    });

    // Transport controls (play / stop / pause / record / rewind)
    ipcMain.handle('reaper:transport', async (_event, action) => {
        return await ReaperService.transport(action);
    });

    // Mixer — track volume
    ipcMain.handle('reaper:set-volume', async (_event, { trackIndex, volume }) => {
        return await ReaperService.setTrackVolume(trackIndex, volume);
    });

    // Mixer — track mute
    ipcMain.handle('reaper:set-mute', async (_event, { trackIndex, isMuted }) => {
        return await ReaperService.setTrackMute(trackIndex, isMuted);
    });

    // Trigger auto-configuration of REAPER Web Interface
    ipcMain.handle('reaper:auto-config', async () => {
        return await ReaperService.configureWebInterface();
    });

    // Install the GuitarOS Lua listener script into the target REAPER's Scripts folder
    ipcMain.handle('reaper:install-listener', async () => {
        try {
            const prefs = await (require('../services/UserPreferencesService')).getPreferences();
            const reaperExe = (prefs.general && prefs.general.reaperPath)
                ? prefs.general.reaperPath
                : require('../config/paths').REAPER_PATH;

            const reaperDir = path.dirname(reaperExe);
            const appData = process.env.APPDATA || '';

            // Possible Scripts folder locations
            const scriptsDirCandidates = [
                path.join(reaperDir, 'Scripts'),
                path.join(reaperDir, '..', 'Scripts'),
                path.join(appData, 'REAPER', 'Scripts'),
            ];

            let scriptsDir = null;
            for (const candidate of scriptsDirCandidates) {
                if (await require('fs-extra').pathExists(candidate)) {
                    scriptsDir = candidate;
                    break;
                }
            }

            // If none found, create next to the exe
            if (!scriptsDir) {
                scriptsDir = path.join(reaperDir, 'Scripts');
                await require('fs-extra').ensureDir(scriptsDir);
            }

            // Source listener script (from app's Source/scripts/)
            const srcListener = path.join(__dirname, '..', 'scripts', 'reaper_listener.lua');
            const dstListener = path.join(scriptsDir, 'reaper_listener.lua');

            await require('fs-extra').copyFile(srcListener, dstListener);
            console.log('Copied listener to:', dstListener);

            // Patch or create __startup.lua
            const startupPath = path.join(scriptsDir, '__startup.lua');
            const startupLine = `dofile(reaper.GetResourcePath() .. '/Scripts/reaper_listener.lua')\n`;
            let startupContent = '';

            if (await require('fs-extra').pathExists(startupPath)) {
                startupContent = await require('fs-extra').readFile(startupPath, 'utf8');
                // Only add if not already present
                if (!startupContent.includes('reaper_listener.lua')) {
                    startupContent += '\n-- GuitarOS listener\n' + startupLine;
                    await require('fs-extra').writeFile(startupPath, startupContent, 'utf8');
                }
            } else {
                await require('fs-extra').writeFile(startupPath,
                    `-- Auto-generated by GuitarOS\n${startupLine}`, 'utf8');
            }

            return { success: true, scriptPath: dstListener };
        } catch (err) {
            console.error('reaper:install-listener failed:', err);
            return { success: false, error: err.message };
        }
    });

    // Guitar Pro — open file
    ipcMain.handle('gp:open', (_event, filePath) => {
        GPService.openFile(filePath);
    });

    // Guitar Pro — close
    ipcMain.handle('gp:close', async () => {
        await GPService.close();
        return { success: true };
    });
}

module.exports = { registerReaperHandlers };
