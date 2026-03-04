const { REAPER_PATH } = require('../config/paths');
const UserPreferencesService = require('./UserPreferencesService');
const ReaperFileService = require('./ReaperFileService');
const fs = require('fs-extra');
const path = require('path');

class ReaperService {
    constructor() {
        this.sessionActive = false;
    }

    /**
     * Kill Reaper Process
     */
    kill() {
        const api = require('child_process');
        try {
            api.execSync('taskkill /F /IM reaper.exe /T');
        } catch (err) {
            // Reaper might already be closed
        }
    }

    /**
     * Launch REAPER
     */
    launch() {
        const { execFile } = require('child_process');
        const fs = require('fs');

        // Check user preference
        UserPreferencesService.getPreferences().then(prefs => {
            console.log("Reaper Launch Check. Prefs:", JSON.stringify(prefs.general));

            // Extensive false check (boolean or string)
            if (prefs.general && (prefs.general.launchReaper === false || prefs.general.launchReaper === 'false')) {
                console.log("REAPER auto-launch disabled by user preference.");
                return;
            }

            // Priority: Custom Path > Portable Path
            let exePath = REAPER_PATH;
            if (prefs.general && prefs.general.reaperPath) {
                exePath = prefs.general.reaperPath;
            }

            if (!fs.existsSync(exePath)) {
                console.error(`REAPER executable not found at: ${exePath}`);
                return;
            }

            console.log(`Launching REAPER from: ${exePath}`);

            // Ensure the Lua script is passed as an argument to guarantee execution
            const { app } = require('electron');
            const path = require('path');
            const srcListenerProd = path.join(process.resourcesPath || '', 'scripts', 'reaper_listener.lua');
            const srcListenerDev = path.join(__dirname, '..', 'scripts', 'reaper_listener.lua');
            let scriptArg = fs.existsSync(srcListenerProd) ? srcListenerProd : srcListenerDev;

            const args = [];
            if (fs.existsSync(scriptArg)) {
                args.push(scriptArg);
            }

            const child = execFile(exePath, args, (error) => {
                if (error) {
                    console.error('Error launching REAPER:', error);
                }
            });

            child.unref();
        });
    }

    /**
     * Auto-Configure Reaper Web Interface
     */
    async configureWebInterface() {
        const fs = require('fs-extra');
        const path = require('path');

        try {
            // Standard location: %APPDATA%\REAPER\reaper.ini
            // BUT for Portable, it is in Apps/Reaper/reaper.ini

            const reaperDir = path.dirname(REAPER_PATH);
            // Check current dir or parent dir (sometimes Reaper64 is a subdir)
            let iniPath = path.join(reaperDir, 'reaper.ini');

            if (!await fs.pathExists(iniPath)) {
                // Try one level up
                iniPath = path.join(reaperDir, '..', 'reaper.ini');
            }

            // Fallback to APPDATA
            if (!await fs.pathExists(iniPath)) {
                console.log("Portable reaper.ini not found. Checking APPDATA.");
                const appData = process.env.APPDATA;
                iniPath = path.join(appData, 'REAPER', 'reaper.ini');
            }

            if (!await fs.pathExists(iniPath)) {
                return { success: false, error: 'reaper.ini not found' };
            }

            console.log(`Configuring Reaper INI at: ${iniPath}`);

            let content = await fs.readFile(iniPath, 'utf8');

            // Check if section exists
            if (content.includes('[reaper_www]')) {
                const sectionRegex = /\[reaper_www\]([\s\S]*?)(?=\[|$)/;
                const match = content.match(sectionRegex);

                let newBlock = `
enabled=1
port=8080
mode=1
rc_uri=`;

                if (match) {
                    content = content.replace(sectionRegex, `[reaper_www]${newBlock}\n`);
                } else {
                    content += `\n[reaper_www]${newBlock}\n`;
                }

            } else {
                content += `\n[reaper_www]
enabled=1
port=8080
mode=1
rc_uri=
`;
            }

            await fs.writeFile(iniPath, content, 'utf8');
            return { success: true };

        } catch (err) {
            console.error("Auto-config failed:", err);
            return { success: false, error: err.message, code: 'AUTO_CONFIG_FAILED' };
        }
    }

    /**
     * Load Exercise (Full Session Setup)
     * @param {Object} exercise - The full exercise object from Library
     * @param {string} exercisePath - Absolute path to the exercise folder
     */
    async loadExercise(exercise, exercisePath) {
        const path = require('path');
        const files = exercise.files || {};

        let backingPath = null;
        if (files.backing) {
            backingPath = path.isAbsolute(files.backing)
                ? files.backing
                : path.join(exercisePath, files.backing);
            backingPath = backingPath.replace(/\\/g, '/');
        }

        let originalPath = null;
        if (files.original) {
            originalPath = path.isAbsolute(files.original)
                ? files.original
                : path.join(exercisePath, files.original);
            originalPath = originalPath.replace(/\\/g, '/');
        }

        const targetBpm = exercise.originalBpm || exercise.bpm;
        const UserPreferencesService = require('./UserPreferencesService');
        const prefs = await UserPreferencesService.getPreferences();

        const inputChannel = prefs.general?.inputChannel ?? 2;
        const recordMonitoring = prefs.general?.recordMonitoring !== false;

        const command = {
            action: 'LOAD_EXERCISE',
            bpm: targetBpm,
            backing: backingPath,
            original: originalPath,
            inputChannel: inputChannel,
            recordMonitoring: recordMonitoring
        };

        const ReaperFileService = require('./ReaperFileService');

        // 2. Try sending command to running instance
        try {
            console.log("Attempting to send LOAD_EXERCISE to running Reaper instance...");

            if (!this._isReaperRunning()) {
                console.log("Reaper not running. Launching...");
                this.launch();
                await this._sleep(4000); // Wait for startup
            }

            // Just write the command. Listener will pick it up.
            await ReaperFileService.sendCommand(command);
            console.log('Sent LOAD_EXERCISE to Reaper:', command);
            this.sessionActive = true;
            return { success: true };

        } catch (err) {
            console.error("Failed to load exercise in Reaper:", err);
            return { success: false, error: err.message, code: 'LOAD_EXERCISE_FAILED' };
        }
    }

    /**
     * Start Session Wrapper (Modular IPC compatibility)
     */
    async startSession(exercise, exercisePath) {
        return this.loadExercise(exercise, exercisePath);
    }

    /**
     * End Session Wrapper
     */
    async endSession() {
        this.kill();
        this.sessionActive = false;
        return { success: true };
    }

    /**
     * Generic Command Wrapper
     */
    async sendExerciseCommand(exercise, exercisePath) {
        return this.loadExercise(exercise, exercisePath);
    }

    _isReaperRunning() {
        try {
            const { execSync } = require('child_process');
            const stdout = execSync('tasklist /FI "IMAGENAME eq reaper.exe"').toString();
            return stdout.includes('reaper.exe');
        } catch (e) {
            return false;
        }
    }

    async transport(action) {
        return ReaperFileService.sendCommand({ action: 'TRANSPORT', command: action });
    }

    async setTrackVolume(trackIndex, volume) {
        return ReaperFileService.sendCommand({ action: 'SET_VOLUME', trackIndex, value: volume });
    }

    async setTrackMute(trackIndex, isMuted) {
        return ReaperFileService.sendCommand({ action: 'SET_MUTE', trackIndex, value: isMuted ? 1 : 0 });
    }

    async setBpm(bpm) {
        return ReaperFileService.sendCommand({ action: 'SET_BPM', bpm });
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new ReaperService();
