/**
 * dataPath.js — Shared path resolver.
 * 
 * Separates read-only application assets (Catalog, Media) 
 * from writable user data (DB, Profiles, Commands).
 */
'use strict';

const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');

const isPackaged = app ? app.isPackaged : false;
const isDev = process.env.NODE_ENV !== 'production' && !isPackaged;

// 1. ASSETS_PATH (Catalog, Media)
// Always look next to the executable or in the project root (dev)
let ASSETS_PATH;
if (isDev) {
    ASSETS_PATH = path.join(process.cwd(), 'Data');
} else {
    // Check next to exe first (for both portable and installed)
    const localData = path.join(path.dirname(process.execPath), 'Data');
    if (fs.existsSync(localData)) {
        ASSETS_PATH = localData;
    } else {
        // Fallback to resources dir (standard Electron)
        ASSETS_PATH = path.join(process.resourcesPath, 'Data');
    }
}

// 2. USER_DATA_PATH (DB, Profiles, reaper_cmd.json)
// - Portable: same folder as executable (Data/ or next to it)
// - Installed: AppData/Local/GuitarOS
let USER_DATA_PATH;
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;

if (isDev) {
    USER_DATA_PATH = path.join(process.cwd(), 'Data');
} else if (portableDir) {
    // PORTABLE MODE: Keep everything in the portable folder
    USER_DATA_PATH = path.join(portableDir, 'Data');
} else {
    // INSTALLED MODE: Use AppData to ensure write permissions
    USER_DATA_PATH = app.getPath('userData');
}

// Ensure the writable path exists
try {
    fs.ensureDirSync(USER_DATA_PATH);
} catch (e) {
    console.error('Failed to create USER_DATA_PATH:', e);
}

module.exports = {
    ROOT_PATH: ASSETS_PATH, // For backward compatibility where it's used for reading
    ASSETS_PATH,
    USER_DATA_PATH,
    isDev
};
