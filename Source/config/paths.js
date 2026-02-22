const path = require('path');

// Helper to get absolute path from relative root
const getAppPath = (relativePath) => {
    // Priority 1: Portable dir (set by NSIS portable)
    // Priority 2: Executable location (standard for our Apps/Data siblings)
    // Priority 3: Fallback to resourcesPath (standard Electron)
    const baseDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);

    // Development fallback
    if (process.env.NODE_ENV !== 'production') {
        return path.resolve(__dirname, '../../Apps', relativePath);
    }

    // Production (Portable or Installed)
    // We expect Apps/ and Data/ to be siblings to the .exe in both cases
    return path.join(baseDir, 'Apps', relativePath);
};

module.exports = {
    REAPER_PATH: getAppPath('Reaper/Reaper64/reaper.exe'),
    GUITAR_PRO_PATH: getAppPath('GuitarPro/GuitarPro.exe'),
    REAPER_WEB_PORT: 8080,
    REAPER_WEB_HOST: '127.0.0.1'
};
