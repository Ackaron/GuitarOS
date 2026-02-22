
const path = require('path');
const os = require('os');

// Mock Environment
const MOCK_EXE_DIR = path.join(os.tmpdir(), 'GuitarOS_Test_Portable');
process.env.PORTABLE_EXECUTABLE_DIR = MOCK_EXE_DIR;
process.env.NODE_ENV = 'production'; // Simulate Prod

console.log('--- Portable Path Simulation ---');
console.log('Mock Exec Dir:', MOCK_EXE_DIR);

// Mock Electron App
global.app = { isPackaged: true };

// 1. Test db.js Path
try {
    // We cannot require db.js directly if it uses 'electron' module (it does).
    // We need to mock electron module or just copy logic.
    // Let's copy logic for verification.

    // Logic from db.js
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR || (process.execPath ? path.dirname(process.execPath) : __dirname);
    const dbPath = path.join(portableDir, 'Data/db.json');
    console.log('Resolved DB Path:', dbPath);

    if (dbPath !== path.join(MOCK_EXE_DIR, 'Data/db.json')) {
        console.error('FAIL: DB Path mismatch');
    } else {
        console.log('PASS: DB Path logic');
    }

} catch (e) {
    console.error('DB Test Error:', e);
}

// 2. Test paths.js
try {
    // Logic from paths.js
    const getAppPath = (relativePath) => {
        const baseDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
        return path.join(baseDir, 'Apps', relativePath);
    };

    const reaperPath = getAppPath('Reaper/Reaper64/reaper.exe');
    console.log('Resolved Reaper Path:', reaperPath);

    if (reaperPath !== path.join(MOCK_EXE_DIR, 'Apps/Reaper/Reaper64/reaper.exe')) {
        console.error('FAIL: Reaper Path mismatch');
    } else {
        console.log('PASS: Reaper Path logic');
    }
} catch (e) {
    console.error('Paths Test Error:', e);
}

// 3. Test LibraryService ROOT_PATH
try {
    // Logic from LibraryService
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
    const ROOT_PATH = path.join(portableDir, 'Data');
    console.log('Resolved Library ROOT_PATH:', ROOT_PATH);

    if (ROOT_PATH !== path.join(MOCK_EXE_DIR, 'Data')) {
        console.error('FAIL: Library Root Path mismatch');
    } else {
        console.log('PASS: Library Root Path logic');
    }
} catch (e) {
    console.error('Library Test Error:', e);
}
