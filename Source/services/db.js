/**
 * db.js — Manages per-user profile databases using lowdb.
 * 
 * Separates a global registry (db.json) from user-specific data (profiles/Name.json).
 */
'use strict';

const path = require('path');
const fs = require('fs-extra');
const { USER_DATA_PATH } = require('../config/dataPath');

const registryPath = path.join(USER_DATA_PATH, 'db.json');
const profilesDir = path.join(USER_DATA_PATH, 'profiles');

/** Default structure for the global registry. */
const defaultRegistry = {
    users: [], // List of user names
    lastUser: null,
    settings: {
        theme: 'dark'
    }
};

/** Default structure for a single user's profile. */
const defaultUserData = {
    user: { name: '', totalCheckins: 0 },
    exercises: [], // Individual progress (BPM, history)
    history: [],
    pins: {
        technique: null,
        song: null,
        athletics: null
    },
    settings: {
        totalSessionMinutes: 60
    }
};

let registryDB = null;
let userDB = null;
let currentUserName = null;

/**
 * Initialise the global registry database and ensure profiles dir exists.
 */
async function initDB() {
    const { JSONFilePreset } = await import('lowdb/node');

    await fs.ensureDir(profilesDir);

    // 1. Load Registry
    if (!registryDB) {
        console.log('Database — Loading registry from:', registryPath);
        registryDB = await JSONFilePreset(registryPath, defaultRegistry);
        await registryDB.read();

        // Extra Defensive check
        if (!registryDB || !registryDB.data) {
            console.warn('Database — Registry data missing after load, using defaults.');
            registryDB.data = { ...defaultRegistry };
        }
        if (!registryDB.data.users) registryDB.data.users = [];
    }

    // 2. Auto-load last user if possible
    if (registryDB.data.lastUser && !userDB) {
        await switchUser(registryDB.data.lastUser);
    }

    return registryDB;
}

/**
 * Switch the active user. Loads or creates their specific JSON file.
 */
async function switchUser(name) {
    if (!name) return;
    const { JSONFilePreset } = await import('lowdb/node');

    const profilePath = path.join(profilesDir, `${name}.json`);

    // Create new user profile if it doesn't exist
    userDB = await JSONFilePreset(profilePath, {
        ...defaultUserData,
        user: { ...defaultUserData.user, name }
    });
    await userDB.read();

    currentUserName = name;

    // Update registry
    if (registryDB) {
        if (!registryDB.data) registryDB.data = { ...defaultRegistry };
        if (!registryDB.data.users) registryDB.data.users = [];

        if (!registryDB.data.users.includes(name)) {
            registryDB.data.users.push(name);
        }
        registryDB.data.lastUser = name;
        await registryDB.write();
    }

    console.log(`Database — Switched to user: ${name}`);
}

/**
 * Get the active user's database instance.
 */
function getUserDB() {
    if (!userDB) {
        // Fallback for when no user is logged in yet
        return {
            data: { ...defaultUserData },
            read: async () => { },
            write: async () => { }
        };
    }
    return userDB;
}

/**
 * Clear the current user context (Logout).
 */
async function clearUser() {
    userDB = null;
    currentUserName = null;
    if (registryDB) {
        if (!registryDB.data) registryDB.data = { ...defaultRegistry };
        registryDB.data.lastUser = null;
        await registryDB.write();
    }
}

function getCurrentUser() {
    return currentUserName;
}

module.exports = {
    initDB,
    getUserDB,
    switchUser,
    clearUser,
    getCurrentUser,
    defaultUserData
};
