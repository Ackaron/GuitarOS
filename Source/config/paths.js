const path = require('path');
const { app } = require('electron');

const isPackaged = app ? app.isPackaged : false;

/**
 * getAppPath — Resolves paths to bundled applications (REAPER, Guitar Pro).
 * 
 * In production (portable or installed), bundled apps are always siblings
 * to the extracted/installed executable. 
 * 
 * NOTE: We do NOT use PORTABLE_EXECUTABLE_DIR here because bundled apps 
 * are extracted to a temp folder, not left in the Downloads/Original folder.
 */
const getAppPath = (relativePath) => {
    if (!isPackaged) {
        return path.resolve(__dirname, '../Apps', relativePath);
    }

    // Always use the directory of the currently running executable
    const baseDir = path.dirname(process.execPath);
    return path.join(baseDir, 'Apps', relativePath);
};

module.exports = {
    REAPER_PATH: getAppPath('Reaper/Reaper64/reaper.exe'),
    GUITAR_PRO_PATH: getAppPath('GuitarPro/GuitarPro.exe'),
    REAPER_WEB_PORT: 8080,
    REAPER_WEB_HOST: '127.0.0.1'
};
