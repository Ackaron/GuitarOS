/**
 * ReaperFileService.js — File-based IPC bridge for REAPER Lua scripts.
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { USER_DATA_PATH } = require('../config/dataPath');

const CMD_FILE_PATH = path.join(USER_DATA_PATH, 'reaper_cmd.json');

/**
 * Write a command object to the bridge file.
 */
async function sendCommand(command) {
    if (!command || !command.action) {
        return { success: false, error: 'Command must have an action field' };
    }

    const payload = { ...command, timestamp: Date.now() };

    try {
        await fs.ensureDir(path.dirname(CMD_FILE_PATH));
        await fs.writeJson(CMD_FILE_PATH, payload, { spaces: 2 });

        // Write pointer for Reaper listener
        try {
            const pointerPath = path.join(os.tmpdir(), 'guitaros_cmd_path.txt');
            await fs.writeFile(pointerPath, CMD_FILE_PATH, 'utf8');
        } catch (e) {
            console.warn('ReaperFileService — failed to write pointer file:', e.message);
        }

        console.log('[ReaperFileService] wrote command:', payload.action, 'TS:', payload.timestamp);
        return { success: true };
    } catch (err) {
        console.error('ReaperFileService — write failed:', err);
        return { success: false, error: err.message };
    }
}

module.exports = { sendCommand };
