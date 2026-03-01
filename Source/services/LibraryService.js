/**
 * LibraryService.js — Manages the GuitarOS file-system library.
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { ASSETS_PATH, USER_DATA_PATH } = require('../config/dataPath');

// The Library lives in the writable USER_DATA_PATH
const LIBRARY_PATH = path.join(USER_DATA_PATH, 'Library');
// The bundled library (read-only) lives in ASSETS_PATH
const BUNDLED_LIBRARY_PATH = path.join(ASSETS_PATH, 'Library');

const STANDARD_KEYS = [
    'C Major', 'G Major', 'D Major', 'A Major', 'E Major', 'B Major', 'F# Major', 'C# Major', 'F Major', 'Bb Major', 'Eb Major', 'Ab Major', 'Db Major', 'Gb Major', 'Cb Major',
    'A Minor', 'E Minor', 'B Minor', 'F# Minor', 'C# Minor', 'G# Minor', 'D# Minor', 'A# Minor', 'D Minor', 'G Minor', 'C Minor', 'F Minor', 'Bb Minor', 'Eb Minor', 'Ab Minor'
];

const STANDARD_TAGS = [
    'Alternate Picking', 'Economy Picking', 'Sweep Picking', 'Hybrid Picking',
    'Legato', 'Tapping', 'Fingerstyle', 'Bending', 'Vibrato', 'Strumming',
    'Rhythm', 'Chords', 'Scales', 'Arpeggios'
];

class LibraryService {
    constructor() {
        this.init();
    }

    getLibraryPath() { return LIBRARY_PATH; }

    /** 
     * Ensure default folder structure exists.
     * If the Library in AppData is empty, copy the bundled exercises from the app folder.
     */
    async init() {
        try {
            await fs.ensureDir(LIBRARY_PATH);

            // Check if we need to seed the library from assets
            const existingFiles = await fs.readdir(LIBRARY_PATH);
            if (existingFiles.length === 0 && fs.existsSync(BUNDLED_LIBRARY_PATH)) {
                console.log('LibraryService — Seeding library from bundled assets...');
                await fs.copy(BUNDLED_LIBRARY_PATH, LIBRARY_PATH);
            }

            const defaults = ['Theory', 'Etude', 'Technique', 'Songs', 'Custom'];
            for (const folder of defaults) {
                await fs.ensureDir(path.join(LIBRARY_PATH, folder));
            }
            console.log('LibraryService initialised at:', LIBRARY_PATH);
        } catch (err) {
            console.error('Failed to init LibraryService:', err);
        }
    }

    /** Get top-level directory list (name, itemCount). */
    async getLibrary() {
        try {
            const items = await fs.readdir(LIBRARY_PATH, { withFileTypes: true });
            return await Promise.all(
                items
                    .filter(d => d.isDirectory())
                    .map(async dirent => {
                        const folderPath = path.join(LIBRARY_PATH, dirent.name);
                        const files = await fs.readdir(folderPath);
                        return {
                            id: dirent.name,
                            name: dirent.name,
                            type: 'folder',
                            itemCount: files.length,
                            path: folderPath
                        };
                    })
            );
        } catch (err) {
            console.error('Error reading library:', err);
            return [];
        }
    }

    /** Read the immediate contents of a folder (shallow). */
    async getFolderContents(folderName) {
        try {
            const folderPath = path.join(LIBRARY_PATH, folderName);
            if (!await fs.pathExists(folderPath)) return [];

            const items = await fs.readdir(folderPath, { withFileTypes: true });
            return await Promise.all(items.map(async dirent => {
                const itemPath = path.join(folderPath, dirent.name);

                if (dirent.isDirectory()) {
                    const configPath = path.join(itemPath, 'config.json');
                    if (await fs.pathExists(configPath)) {
                        const config = await fs.readJson(configPath);
                        const relPath = folderName.replace(/\\/g, '/');
                        const category = relPath.split('/')[0];
                        return {
                            ...config,
                            type: 'smart_item',
                            path: itemPath,
                            fsName: dirent.name,
                            category,
                            relPath
                        };
                    }
                    return { id: dirent.name, name: dirent.name, type: 'folder', path: itemPath, fsName: dirent.name };
                }

                return {
                    id: dirent.name,
                    name: dirent.name,
                    type: 'file',
                    path: itemPath,
                    ext: path.extname(dirent.name),
                    fsName: dirent.name
                };
            }));
        } catch (err) {
            console.error(`Error reading folder ${folderName}:`, err);
            return [];
        }
    }

    /** Recursively scan for all sub-folders. */
    async getAllFolders() {
        const results = [];
        const scan = async (currentRelative) => {
            const absolutePath = path.join(LIBRARY_PATH, currentRelative);
            if (!await fs.pathExists(absolutePath)) return;

            const entries = await fs.readdir(absolutePath, { withFileTypes: true });

            for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                const relativePath = currentRelative
                    ? path.join(currentRelative, entry.name)
                    : entry.name;

                const configPath = path.join(absolutePath, entry.name, 'config.json');
                if (!await fs.pathExists(configPath)) {
                    results.push(relativePath.replace(/\\/g, '/'));
                    await scan(relativePath);
                }
            }
        };

        try {
            await scan('');
            return results.sort();
        } catch (err) {
            console.error('Failed to get recursive folders:', err);
            return ['Etude', 'Songs', 'Technique', 'Theory'];
        }
    }

    /** Return a flat catalog of all Smart Items. */
    async getCatalog() {
        const items = await this._getAllSmartItems();
        const tags = new Set(STANDARD_TAGS);
        const keys = new Set(STANDARD_KEYS);

        const simplifiedItems = items.map(i => {
            if (i.tags) i.tags.forEach(t => tags.add(t));
            if (i.key) keys.add(i.key);
            return {
                id: i.id || i.path,
                title: i.title || i.name,
                path: i.path,
                type: i.type,
                tags: i.tags || [],
                key: i.key,
                bpm: i.bpm,
                targetBPM: i.targetBPM,
                originalBpm: i.originalBpm,
                duration: i.duration,
                category: i.category,
                relPath: i.relPath,
                fsName: i.fsName,
                parent: i.path.includes('Etude') ? 'exercises' : i.path.includes('Songs') ? 'songs' : 'other'
            };
        });

        return {
            items: simplifiedItems,
            tags: Array.from(tags).sort(),
            keys: Array.from(keys).sort()
        };
    }

    /** Import a Guitar Pro file. */
    async importGPFile(filePaths, targetFolderName, metadata = {}) {
        try {
            let gpPath = null, audioBackingPath = null, audioOriginalPath = null;
            if (typeof filePaths === 'string') {
                gpPath = filePaths;
            } else {
                gpPath = filePaths.gp;
                audioBackingPath = filePaths.audioBacking || filePaths.audio || null;
                audioOriginalPath = filePaths.audioOriginal || null;
            }

            if (!gpPath) throw new Error('No Guitar Pro file provided');

            const gpFileName = path.basename(gpPath);
            const nameWithoutExt = path.parse(gpFileName).name;
            const itemId = crypto.randomUUID();
            const title = metadata.title || nameWithoutExt;
            const safeName = title.replace(/[<>:"/\\|?*]/g, '').trim();
            const itemFolderPath = path.join(LIBRARY_PATH, targetFolderName, safeName);

            await fs.ensureDir(itemFolderPath);
            await fs.copy(gpPath, path.join(itemFolderPath, gpFileName));

            let backingFileName = null;
            if (audioBackingPath) {
                backingFileName = path.basename(audioBackingPath);
                await fs.copy(audioBackingPath, path.join(itemFolderPath, backingFileName));
            }

            let originalFileName = null;
            if (audioOriginalPath) {
                originalFileName = path.basename(audioOriginalPath);
                await fs.copy(audioOriginalPath, path.join(itemFolderPath, originalFileName));
            }

            const config = {
                id: itemId,
                title,
                bpm: Number(metadata.bpm) || 120,
                targetBPM: Number(metadata.targetBPM) || null,
                originalBpm: Number(metadata.bpm) || 120,
                difficulty: Number(metadata.difficulty) || 1,
                key: this._normalizeKey(metadata.key) || null,
                tags: metadata.tags || [],
                status: metadata.status || 'none',
                files: { tab: gpFileName, backing: backingFileName, original: originalFileName },
                stats: { addedAt: new Date(), lastPlayed: null, playCount: 0 }
            };

            await fs.writeJson(path.join(itemFolderPath, 'config.json'), config, { spaces: 2 });
            return { success: true, item: config };
        } catch (err) {
            console.error('Import failed:', err);
            return { success: false, error: err.message };
        }
    }

    async deleteItem(id, parentFolder = null) {
        try {
            const targetPath = parentFolder ? path.join(LIBRARY_PATH, parentFolder, id) : path.join(LIBRARY_PATH, id);
            if (await fs.pathExists(targetPath)) {
                await fs.remove(targetPath);
                return { success: true };
            }
            return { success: false, error: 'Item not found' };
        } catch (err) { return { success: false, error: err.message }; }
    }

    async renameItem(id, newName, parentFolder = null) {
        try {
            const currentPath = parentFolder ? path.join(LIBRARY_PATH, parentFolder, id) : path.join(LIBRARY_PATH, id);
            const safeName = newName.replace(/[<>:"/\\|?*]/g, '').trim();
            const newPath = path.join(path.dirname(currentPath), safeName);
            await fs.rename(currentPath, newPath);
            const configPath = path.join(newPath, 'config.json');
            if (await fs.pathExists(configPath)) {
                const config = await fs.readJson(configPath);
                config.title = newName;
                await fs.writeJson(configPath, config, { spaces: 2 });
            }
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }

    async updateMetadata(fsName, metadata, parentFolder = null, targetFolder = null, newFiles = null) {
        try {
            let itemPath = parentFolder ? path.join(LIBRARY_PATH, parentFolder, fsName) : path.join(LIBRARY_PATH, fsName);
            if (targetFolder && targetFolder !== parentFolder) {
                const newItemPath = path.join(LIBRARY_PATH, targetFolder, fsName);
                await fs.ensureDir(path.dirname(newItemPath));
                await fs.move(itemPath, newItemPath);
                itemPath = newItemPath;
            }
            const configPath = path.join(itemPath, 'config.json');
            const config = await fs.readJson(configPath);
            if (metadata.title) config.title = metadata.title;
            if (metadata.bpm !== undefined) config.bpm = Number(metadata.bpm);
            if (metadata.targetBPM !== undefined) config.targetBPM = Number(metadata.targetBPM);
            config.key = metadata.key || null;
            if (metadata.tags) config.tags = metadata.tags;
            await fs.writeJson(configPath, config, { spaces: 2 });
            return { success: true, item: config };
        } catch (err) { return { success: false, error: err.message }; }
    }

    async _getAllSmartItems() {
        try {
            if (!await fs.pathExists(LIBRARY_PATH)) return [];
            const rootItems = await fs.readdir(LIBRARY_PATH, { withFileTypes: true });
            const categories = rootItems.filter(d => d.isDirectory()).map(d => d.name);
            const allItems = [];
            for (const category of categories) {
                await this._scanDeep(path.join(LIBRARY_PATH, category), category, [], allItems);
            }
            return allItems;
        } catch (err) { return []; }
    }

    /**
     * Smart Review Engine
     * Fetches exercises practiced within `daysToLookBack` that resulted in a score below `scoreThreshold`.
     */
    async getReviewQueue(daysToLookBack = 2, scoreThreshold = 60) {
        try {
            const { getUserDB } = require('./db');
            const db = getUserDB();
            await db.read();

            if (!db.data || !db.data.exercises) return [];

            const now = new Date();
            const cutoffTime = now.getTime() - (daysToLookBack * 24 * 60 * 60 * 1000);

            const reviewItems = [];

            db.data.exercises.forEach(ex => {
                if (!ex.history || ex.history.length === 0) return;

                // Sort history newest first
                const sortedHistory = [...ex.history].sort((a, b) => new Date(b.date) - new Date(a.date));
                const lastSession = sortedHistory[0];
                const sessionDate = new Date(lastSession.date).getTime();

                // Check if it happened recently and needs review
                if (sessionDate >= cutoffTime) {
                    const score = lastSession.score !== undefined ? lastSession.score : 100; // default to 100 if legacy to avoid false positives
                    if (score < scoreThreshold) {
                        reviewItems.push({
                            id: ex.id,
                            title: ex.title,
                            score: score,
                            date: lastSession.date
                        });
                    }
                }
            });

            // Sort by score ascending (worst first)
            return reviewItems.sort((a, b) => a.score - b.score);

        } catch (err) {
            console.error('Error fetching review queue:', err);
            return [];
        }
    }

    async _scanDeep(currentPath, category, folderHierarchy, resultList) {
        const items = await fs.readdir(currentPath, { withFileTypes: true });
        for (const dirent of items) {
            if (!dirent.isDirectory()) continue;
            const itemPath = path.join(currentPath, dirent.name);
            const configPath = path.join(itemPath, 'config.json');
            if (await fs.pathExists(configPath)) {
                try {
                    const config = await fs.readJson(configPath);

                    // Normalize key
                    if (config.key) config.key = this._normalizeKey(config.key);

                    // Folder-based tagging
                    const folderTags = [...folderHierarchy];
                    const mergedTags = new Set([...(config.tags || []), ...folderTags]);

                    const itemData = {
                        ...config,
                        tags: Array.from(mergedTags),
                        type: 'smart_item',
                        path: itemPath,
                        fsName: dirent.name,
                        category,
                        relPath: folderHierarchy.length > 0 ? `${category}/${folderHierarchy.join('/')}` : category
                    };
                    if (itemData.files) {
                        for (const key of ['backing', 'original', 'tab']) {
                            if (itemData.files[key] && !path.isAbsolute(itemData.files[key])) {
                                itemData.files[key] = path.join(itemPath, itemData.files[key]);
                            }
                        }
                    }
                    resultList.push(itemData);
                } catch (e) { }
            } else {
                await this._scanDeep(itemPath, category, [...folderHierarchy, dirent.name], resultList);
            }
        }
    }

    _normalizeKey(key) {
        if (!key) return null;
        const k = key.trim();
        if (k.endsWith('m') && !k.toLowerCase().endsWith('am')) return `${k.slice(0, -1)} Minor`;
        if (k.toLowerCase().endsWith('min')) return `${k.slice(0, -3).trim()} Minor`;
        if (k.toLowerCase().includes('minor')) return `${k.split(' ')[0]} Minor`;
        if (k.toLowerCase().endsWith('maj')) return `${k.slice(0, -3).trim()} Major`;
        if (k.toLowerCase().includes('major')) return `${k.split(' ')[0]} Major`;
        if (k.length <= 2) return `${k} Major`;
        return k;
    }
}

module.exports = new LibraryService();
