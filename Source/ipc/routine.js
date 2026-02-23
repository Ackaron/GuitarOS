/**
 * ipc/routine.js — IPC handlers for Practice Routine generation.
 */
'use strict';

const { ipcMain } = require('electron');
const RoutineService = require('../services/RoutineService');

function registerRoutineHandlers() {
    /**
     * Generate a new practice routine based on the provided modules and time.
     */
    ipcMain.handle('routine:generate', async (_event, { minutes, modules }) => {
        try {
            console.log(`IPC: routine:generate called for ${minutes} mins`);
            const routine = await RoutineService.generateRoutine(minutes, modules);
            return routine;
        } catch (err) {
            console.error('IPC: routine:generate failed:', err);
            return [];
        }
    });
}

module.exports = { registerRoutineHandlers };
