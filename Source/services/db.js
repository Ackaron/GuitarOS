/**
 * db.js — lowdb JSON database initialisation.
 *
 * All modules that need the DB should call `initDB()` and await the result.
 * The singleton pattern ensures the file is opened only once per process.
 */
'use strict';

const path = require('path');
const { ROOT_PATH } = require('../config/dataPath');

const dbPath = path.join(ROOT_PATH, 'db.json');

/** Default data structure for a fresh install. */
const defaultData = {
    user: { name: 'Guitarist', totalCheckins: 0 },
    exercises: [], // { id, title, bpm, tags, history: [{ date, bpm, rating }] }
    history: [],   // Global session history (reserved for future use)
    pins: {        // Monthly focus items
        technique: null,
        song: null,
        athletics: null
    },
    settings: {
        totalSessionMinutes: 60
    }
};

let db;

async function initDB() {
    if (!db) {
        const { JSONFilePreset } = await import('lowdb/node');
        db = await JSONFilePreset(dbPath, defaultData);
    }
    return db;
}

module.exports = { initDB };
