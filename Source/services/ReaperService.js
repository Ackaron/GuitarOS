/**
 * ReaperService.js — Communicates with a running REAPER instance via
 * its built-in Web Interface (HTTP) and the file-bridge (ReaperFileService).
 */
'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs-extra');
const { execFile, execSync } = require('child_process');

const { REAPER_WEB_PORT, REAPER_WEB_HOST, REAPER_PATH } = require('../config/paths');
const UserPreferencesService = require('./UserPreferencesService');

// Transport command IDs for REAPER Web Interface
const TRANSPORT_COMMANDS = {
    play: '1007',  // Transport: Play
    stop: '1016',  // Transport: Stop
    record: '1013',  // Transport: Record
    pause: '1008',  // Transport: Pause
    rewind: '40042'  // Go to start of project
};

class ReaperService {
    constructor() {
        this.baseUrl = `http://${REAPER_WEB_HOST}:${REAPER_WEB_PORT}/_/`;
        console.log('ReaperService initialised at:', this.baseUrl);
    }

    // ─── Commands ────────────────────────────────────────────────────────────

    /**
     * Send a raw action ID to REAPER via the Web Interface.
     * @param {string} commandId - e.g. '1007', '_custom_action'
     */
    async sendCommand(commandId) {
        return this._fetch(String(commandId));
    }

    /**
     * Send a predefined transport action.
     * @param {'play'|'stop'|'record'|'pause'|'rewind'} action
     */
    async transport(action) {
        const cmd = TRANSPORT_COMMANDS[action];
        if (cmd) return this.sendCommand(cmd);
    }

    /** Set a track's linear volume (0.0–1.0). Track index is 1-based. */
    async setTrackVolume(trackIndex, volume) {
        return this._fetch(`SET/TRACK/${trackIndex}/VOL/${volume}`);
    }

    /** Mute or un-mute a track. Track index is 1-based. */
    async setTrackMute(trackIndex, isMuted) {
        return this._fetch(`SET/TRACK/${trackIndex}/MUTE/${isMuted ? 1 : 0}`);
    }

    // ─── Process control ─────────────────────────────────────────────────────

    /**
     * Launch REAPER. Respects the user's `launchReaper` preference and
     * `reaperPath` override. Does nothing if already running.
     */
    launch() {
        UserPreferencesService.getPreferences().then(prefs => {
            const general = prefs.general || {};

            if (general.launchReaper === false || general.launchReaper === 'false') {
                console.log('REAPER auto-launch disabled by user preference.');
                return;
            }

            const exePath = general.reaperPath || REAPER_PATH;

            if (!fs.existsSync(exePath)) {
                console.error(`REAPER executable not found: ${exePath}`);
                return;
            }

            console.log(`Launching REAPER from: ${exePath}`);
            const child = execFile(exePath, err => {
                if (err) console.error('Error launching REAPER:', err);
            });
            child.unref();
        });
    }

    /** Forcefully terminate the REAPER process. */
    kill() {
        const { exec } = require('child_process');
        exec('taskkill /F /IM reaper.exe /T', err => {
            if (err) console.log('Reaper kill error (may already be closed):', err.message);
        });
    }

    /**
     * Load an exercise into a running REAPER instance.
     * Launches REAPER first if it is not already running.
     *
     * @param {Object} exercise - Full exercise object (from Library / DB merge)
     * @param {string} exercisePath - Absolute path to the exercise folder
     */
    async loadExercise(exercise, exercisePath) {
        const ReaperFileService = require('./ReaperFileService');
        const files = exercise.files || {};

        const resolve = (rel) => {
            if (!rel) return null;
            const abs = path.isAbsolute(rel) ? rel : path.join(exercisePath, rel);
            return abs.replace(/\\/g, '/');
        };

        const command = {
            action: 'LOAD_EXERCISE',
            bpm: exercise.originalBpm || exercise.bpm,
            backing: resolve(files.backing),
            original: resolve(files.original)
        };

        if (!this._isReaperRunning()) {
            console.log('REAPER not running — launching...');
            this.launch();
            await this._sleep(4000);
        }

        await ReaperFileService.sendCommand(command);
        console.log('Sent LOAD_EXERCISE to REAPER:', command);
        return { success: true };
    }

    /**
     * Auto-configure REAPER's Web Interface by writing to reaper.ini.
     * Reads the user-configured REAPER path from preferences first.
     * Searches for the INI next to the exe, one level up, and in %APPDATA%\REAPER.
     */
    async configureWebInterface() {
        try {
            // Prefer user-configured path over the compiled-in default
            const prefs = await UserPreferencesService.getPreferences();
            const effectiveReaperPath = (prefs.general && prefs.general.reaperPath)
                ? prefs.general.reaperPath
                : REAPER_PATH;

            const reaperDir = path.dirname(effectiveReaperPath);
            console.log(`Configuring REAPER INI — exe dir: ${reaperDir}`);

            // Search order: next to exe → one level up → %APPDATA%\REAPER
            const candidates = [
                path.join(reaperDir, 'reaper.ini'),
                path.join(reaperDir, '..', 'reaper.ini'),
                path.join(process.env.APPDATA || '', 'REAPER', 'reaper.ini'),
            ];

            let iniPath = null;
            for (const candidate of candidates) {
                if (await fs.pathExists(candidate)) {
                    iniPath = candidate;
                    break;
                }
            }

            if (!iniPath) {
                const tried = candidates.join(', ');
                console.warn('reaper.ini not found. Tried:', tried);
                return { success: false, error: `reaper.ini not found. Tried: ${tried}` };
            }

            console.log(`Configuring REAPER INI at: ${iniPath}`);

            let content = await fs.readFile(iniPath, 'utf8');
            const wwwBlock = `\nenabled=1\nport=8080\nmode=1\nrc_uri=`;
            const sectionRegex = /\[reaper_www\]([\s\S]*?)(?=\[|$)/;

            if (content.includes('[reaper_www]')) {
                content = content.replace(sectionRegex, `[reaper_www]${wwwBlock}\n`);
            } else {
                content += `\n[reaper_www]${wwwBlock}\n`;
            }

            await fs.writeFile(iniPath, content, 'utf8');
            console.log('REAPER INI updated successfully.');
            return { success: true, iniPath };

        } catch (err) {
            console.error('REAPER auto-config failed:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── Internals ───────────────────────────────────────────────────────────

    _isReaperRunning() {
        try {
            const stdout = execSync('tasklist /FI "IMAGENAME eq reaper.exe"').toString();
            return stdout.includes('reaper.exe');
        } catch {
            return false;
        }
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _fetch(endpoint) {
        return new Promise((resolve, reject) => {
            const url = `${this.baseUrl}${endpoint}`;
            http.get(url, res => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => resolve(data));
            }).on('error', err => {
                console.error(`REAPER HTTP error (${url}):`, err.message);
                reject(err);
            });
        });
    }
}

module.exports = new ReaperService();
