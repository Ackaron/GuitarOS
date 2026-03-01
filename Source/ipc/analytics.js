/**
 * ipc/analytics.js — IPC handlers for the Analytics service.
 */
'use strict';

const { ipcMain } = require('electron');
const AnalyticsService = require('../services/AnalyticsService');

function registerAnalyticsHandlers() {

    // Global KPI stats (total hours, level, streak)
    ipcMain.handle('analytics:get-global', async () => {
        return await AnalyticsService.getGlobalStats();
    });

    // Activity heatmap data (date → count)
    ipcMain.handle('analytics:get-heatmap', async () => {
        return await AnalyticsService.getHeatmapData();
    });

    // Flat global history (all exercises, sorted by date)
    ipcMain.handle('analytics:get-global-history', async () => {
        return await AnalyticsService.getGlobalHistory();
    });

    // Get Skill Matrix (Radar Chart Data)
    ipcMain.handle('analytics:get-skill-matrix', async () => {
        return await AnalyticsService.getSkillMatrix();
    });

    // Mastery trend (optionally filtered by category or item ID)
    ipcMain.handle('analytics:get-mastery', async (_event, filter, itemId) => {
        return await AnalyticsService.getMasteryTrend(filter, itemId);
    });

    // Category breakdown (Technique / Songs / Theory / Exercises)
    ipcMain.handle('analytics:get-categories', async () => {
        return await AnalyticsService.getCategoryBreakdown();
    });

    // Individual item history (for detail drill-down)
    ipcMain.handle('analytics:get-item-history', async (_event, id) => {
        return await AnalyticsService.getItemHistory(id);
    });

    // Clear all history and reset stats
    ipcMain.handle('analytics:clear-history', async () => {
        return await AnalyticsService.clearHistory();
    });
}

module.exports = { registerAnalyticsHandlers };
