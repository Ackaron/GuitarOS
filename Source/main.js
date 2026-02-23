/**
 * main.js — GuitarOS Electron main process.
 *
 * This file is intentionally thin: it initialises the app, creates the
 * BrowserWindow, and delegates all IPC handling to domain modules under ipc/.
 */
'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const { initDB } = require('./services/db');
const ReaperService = require('./services/ReaperService');

// IPC domain handlers
const { registerReaperHandlers } = require('./ipc/reaper');
const { registerLibraryHandlers } = require('./ipc/library');
const { registerDbHandlers } = require('./ipc/db');
const { registerAnalyticsHandlers } = require('./ipc/analytics');
const { registerPrefsHandlers } = require('./ipc/prefs');
const { registerRoutineHandlers } = require('./ipc/routine');

// ─── Environment ────────────────────────────────────────────────────────────

const isDev = !app.isPackaged;

// ─── IPC Registration (before window creation) ──────────────────────────────

registerReaperHandlers();
registerLibraryHandlers();
registerDbHandlers();
registerAnalyticsHandlers();
registerPrefsHandlers();
registerRoutineHandlers();
ipcMain.handle('get-app-version', () => app.getVersion());

// ─── Window ──────────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0F111A',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    autoHideMenuBar: true,
    title: 'GuitarOS'
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

  // Non-blocking REAPER config — don't prevent app from starting
  ReaperService.configureWebInterface().catch(err => {
    console.warn('REAPER auto-config skipped:', err.message);
  });

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
