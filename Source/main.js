/**
 * main.js — GuitarOS Electron main process.
 *
 * This file is intentionally thin: it initialises the app, creates the
 * BrowserWindow, and delegates all IPC handling to domain modules under ipc/.
 */
'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('path');

const { initDB } = require('./services/db');
const ReaperService = require('./services/ReaperService');

// IPC domain handlers
const { registerReaperHandlers } = require('./ipc/reaper');
const { registerLibraryHandlers } = require('./ipc/library');
const { registerDbHandlers } = require('./ipc/db');
const { registerAnalyticsHandlers } = require('./ipc/analytics');
const { registerPrefsHandlers } = require('./ipc/prefs');

// ─── Environment ────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

// ─── Window ──────────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0F111A',
    webPreferences: {
      nodeIntegration: false,   // Security: disabled
      contextIsolation: true,   // Security: enabled
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false        // Required for local file loading
    },
    autoHideMenuBar: true,
    title: 'GuitarOS Portable'
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, 'out/index.html'));
  }

  win.maximize();
}

// ─── Startup ─────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  await initDB();
  await ReaperService.configureWebInterface();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ─── IPC Registration ────────────────────────────────────────────────────────

registerReaperHandlers();
registerLibraryHandlers();
registerDbHandlers();
registerAnalyticsHandlers();
registerPrefsHandlers();
