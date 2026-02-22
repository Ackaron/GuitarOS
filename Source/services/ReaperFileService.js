/**
 * ReaperFileService.js — File-based IPC bridge for REAPER Lua scripts.
 *
 * REAPER's Lua listener script polls `reaper_cmd.json` for changes.
 * Writing to this file is the entry point for sending structured commands
 * that the Web Interface cannot handle (e.g. loading exercise tracks).
 *
 * The `timestamp` field is required to ensure the Lua script detects the change
 * even when the `action` field is identical to the previous write.
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const { ROOT_PATH } = require('../config/dataPath');

const CMD_FILE_PATH = path.join(ROOT_PATH, 'reaper_cmd.json');

/**
 * Write a command object to the bridge file.
 * @param {Object} command - Must contain at least an `action` string
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendCommand(command) {
    if (!command || !command.action) {
        return { success: false, error: 'Command must have an action field' };
    }

    const payload = { ...command, timestamp: Date.now() };

    try {
        await fs.ensureDir(path.dirname(CMD_FILE_PATH));
        await fs.writeJson(CMD_FILE_PATH, payload, { spaces: 2 });
        console.log('ReaperFileService — wrote command:', payload.action);
        return { success: true };
    } catch (err) {
        console.error('ReaperFileService — write failed:', err);
        return { success: false, error: err.message };
    }
}

module.exports = { sendCommand };
