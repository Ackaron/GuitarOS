/**
 * ipc/library.js — IPC handlers for the file-system Library.
 */
'use strict';

const { ipcMain, dialog } = require('electron');
const fs = require('fs-extra');
const path = require('path');
const LibraryService = require('../services/LibraryService');
const RoutineService = require('../services/RoutineService');

function registerLibraryHandlers() {

    // Get top-level folder list
    ipcMain.handle('fs:get-library', async () => {
        return await LibraryService.getLibrary();
    });

    // Get contents of a specific folder (supports nested paths)
    ipcMain.handle('fs:get-folder', async (_event, folderName) => {
        return await LibraryService.getFolderContents(folderName);
    });

    // Show native open-file dialog
    ipcMain.handle('fs:select-file', async (_event, type) => {
        const filters = type === 'audio'
            ? [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg'] }]
            : [{ name: 'Guitar Pro Files', extensions: ['gp', 'gp5', 'gpx'] }];

        return await dialog.showOpenDialog({
            properties: ['openFile'],
            filters
        });
    });

    // Generic open-file dialog (with custom filters from caller)
    ipcMain.handle('dialog:open-file', async (_event, { filters }) => {
        const { filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters
        });
        return filePaths && filePaths.length > 0 ? filePaths[0] : null;
    });

    // Import a Guitar Pro file (with optional audio tracks) into the Library
    ipcMain.handle('fs:import-exercise', async (_event, { filePaths, folder, metadata }) => {
        return await LibraryService.importGPFile(filePaths, folder, metadata);
    });

    // Create a new folder inside the Library
    ipcMain.handle('fs:create-folder', async (_event, { name, parent }) => {
        return await LibraryService.createFolder(name, parent);
    });

    // Delete a library item or folder
    ipcMain.handle('fs:delete-item', async (_event, { id, parent }) => {
        return await LibraryService.deleteItem(id, parent);
    });

    // Rename a library item or folder
    ipcMain.handle('fs:rename-item', async (_event, { id, newName, parent }) => {
        return await LibraryService.renameItem(id, newName, parent);
    });

    // Update metadata (title, BPM, tags, …) and optionally move to another folder
    ipcMain.handle('fs:update-metadata', async (_event, { id, metadata, parent, targetFolder, newFiles }) => {
        return await LibraryService.updateMetadata(id, metadata, parent, targetFolder, newFiles);
    });

    // Get all known tags across the Library
    ipcMain.handle('fs:get-tags', async () => {
        return await LibraryService.getAllTags();
    });

    // Get flat catalog of all Smart Items (for Routine builder / Analytics)
    ipcMain.handle('fs:get-catalog', async () => {
        return await LibraryService.getCatalog();
    });

    // Get recursive list of all sub-folders (for import target dropdown)
    ipcMain.handle('fs:get-all-folders', async () => {
        return await LibraryService.getAllFolderPaths();
    });

    // Update play stats (playCount, lastPlayed) for a Library item
    ipcMain.handle('fs:update-stats', async (_event, { id, sessionData, parent }) => {
        return await LibraryService.updateStats(id, sessionData, parent);
    });

    /**
     * Update metadata via fsName lookup (called from SessionView after rating).
     * Falls back to catalog lookup if fsName is missing or equals the item ID.
     */
    ipcMain.handle('library:update-metadata', async (_event, { fsName, id, metadata, parent, category }) => {
        let finalFsName = fsName;
        let finalParent = parent || (category === 'Exercises' ? 'Etude' : category === 'Songs' ? 'Songs' : null);

        // Fallback: If fsName invalid or missing, lookup by ID in catalog
        if (!finalFsName || finalFsName === id) {
            const catalog = await LibraryService.getCatalog();
            const item = catalog.items.find(i => i.id === id || i.id === fsName);
            if (item) {
                finalFsName = item.fsName;
                finalParent = item.category;
            }
        }

        if (finalParent === 'other' && category) {
            finalParent = category;
        }

        console.log(`Updating metadata for "${finalFsName}" in "${finalParent}" (id: ${id})`);
        const result = await LibraryService.updateMetadata(finalFsName, metadata, finalParent);
        console.log('Metadata update result:', result);
        return result;
    });


    // Read a file as buffer (for binary files like .gp)
    ipcMain.handle('fs:read-file', async (_event, filePath) => {
        try {
            const buffer = await fs.readFile(filePath);
            return buffer; // Electron automatically converts Buffer to Uint8Array/ArrayBuffer for the renderer
        } catch (err) {
            console.error('fs:read-file failed:', err);
            return null;
        }
    });
}

module.exports = { registerLibraryHandlers };
