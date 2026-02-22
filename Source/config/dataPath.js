/**
 * dataPath.js — Shared data root path resolver.
 *
 * Centralises the portable-first ROOT_PATH logic that was previously
 * duplicated in LibraryService, UserPreferencesService, and db.js.
 *
 * Resolution order:
 *   1. PORTABLE_EXECUTABLE_DIR (set by electron-builder NSIS portable)
 *   2. process.execPath directory  (standard installed build)
 *   3. process.cwd()/../Data       (development mode)
 */
const path = require('path');
const { app } = require('electron');

const isPackaged = app ? app.isPackaged : false;
const isDev = process.env.NODE_ENV !== 'production' && !isPackaged;

const portableDir =
    process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);

/** Absolute path to the shared Data folder. */
const ROOT_PATH = isDev
    ? path.join(process.cwd(), '../Data')
    : path.join(portableDir, 'Data');

module.exports = { ROOT_PATH, isDev, portableDir };
