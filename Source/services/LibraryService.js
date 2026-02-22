/**
 * LibraryService.js — Manages the GuitarOS file-system library.
 *
 * Library structure:
 *   Data/Library/
 *     <Category>/         — e.g. Exercises, Songs, Technique, Theory
 *       <Item>/           — "Smart Item" folder
 *         config.json     — item metadata
 *         *.gp / *.mp3    — media files
 *
 * Items are identified by a UUID stored in config.json.
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');
const { ROOT_PATH } = require('../config/dataPath');

const LIBRARY_PATH = path.join(ROOT_PATH, 'Library');

// ─── Standard reference data ─────────────────────────────────────────────────

const STANDARD_KEYS = [
    'C Major', 'G Major', 'D Major', 'A Major', 'E Major', 'B Major',
    'F# Major', 'C# Major', 'F Major', 'Bb Major', 'Eb Major', 'Ab Major',
    'Db Major', 'Gb Major', 'Cb Major',
    'A Minor', 'E Minor', 'B Minor', 'F# Minor', 'C# Minor', 'G# Minor',
    'D# Minor', 'A# Minor', 'D Minor', 'G Minor', 'C Minor', 'F Minor',
    'Bb Minor', 'Eb Minor', 'Ab Minor'
];

const STANDARD_TAGS = [
    'Alternate Picking', 'Economy Picking', 'Sweep Picking', 'Hybrid Picking',
    'Legato', 'Tapping', 'Fingerstyle', 'Bending', 'Vibrato', 'Strumming',
    'Rhythm', 'Chords', 'Scales', 'Arpeggios'
];

// ─── Service ─────────────────────────────────────────────────────────────────

class LibraryService {
    constructor() {
        this.init();
    }

    /** Ensure default folder structure exists on first run. */
    async init() {
        try {
            await fs.ensureDir(LIBRARY_PATH);
            const defaults = ['Theory', 'Exercises', 'Technique', 'Songs', 'Custom'];
            for (const folder of defaults) {
                await fs.ensureDir(path.join(LIBRARY_PATH, folder));
            }
            console.log('LibraryService initialised at:', LIBRARY_PATH);
        } catch (err) {
            console.error('Failed to init LibraryService:', err);
        }
    }

    // ─── Read ───────────────────────────────────────────────────────────────

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

    /**
     * Recursively scan for all sub-folders (excluding Smart Item folders).
     * Returns relative paths from LIBRARY_PATH, normalised to forward-slashes.
     */
    async getAllFolders() {
        const results = [];
        const scan = async (currentRelative) => {
            const absolutePath = path.join(LIBRARY_PATH, currentRelative);
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
            return ['Exercises', 'Songs', 'Technique', 'Theory', 'Etude'];
        }
    }

    /**
     * Return a flat catalog of all Smart Items across the entire Library.
     * Also collects unique tags and keys encountered.
     */
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
                parent: i.path.includes('Exercises')
                    ? 'exercises'
                    : i.path.includes('Songs')
                        ? 'songs'
                        : 'other'
            };
        });

        return {
            items: simplifiedItems,
            tags: Array.from(tags).sort(),
            keys: Array.from(keys).sort()
        };
    }

    // ─── Write ──────────────────────────────────────────────────────────────

    /**
     * Import a Guitar Pro file (and optional audio tracks) as a new Smart Item.
     *
     * @param {string|Object} filePaths - GP file path, or { gp, audioBacking, audioOriginal }
     * @param {string} targetFolderName - Relative folder inside LIBRARY_PATH
     * @param {Object} metadata - Optional metadata (title, bpm, tags, …)
     */
    async importGPFile(filePaths, targetFolderName, metadata = {}) {
        try {
            let gpPath = null;
            let audioBackingPath = null;
            let audioOriginalPath = null;

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
                files: {
                    tab: gpFileName,
                    backing: backingFileName,
                    original: originalFileName
                },
                stats: {
                    addedAt: new Date(),
                    lastPlayed: null,
                    playCount: 0
                }
            };

            if (metadata.tags && metadata.tags.length > 0) {
                await this._syncTags(metadata.tags);
            }

            await fs.writeJson(path.join(itemFolderPath, 'config.json'), config, { spaces: 2 });
            return { success: true, item: config };

        } catch (err) {
            console.error('Import failed:', err);
            return { success: false, error: err.message };
        }
    }

    /** Create a plain (non-Smart-Item) folder inside the Library. */
    async createFolder(name, parent = null) {
        try {
            const safeName = name.replace(/[<>:"/\\|?*]/g, '').trim();
            const folderPath = parent && parent !== '/'
                ? path.join(LIBRARY_PATH, parent, safeName)
                : path.join(LIBRARY_PATH, safeName);

            if (await fs.pathExists(folderPath)) {
                return { success: false, error: 'Folder already exists' };
            }

            await fs.ensureDir(folderPath);
            return { success: true, folder: { id: safeName, name: safeName, type: 'folder', itemCount: 0 } };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /** Delete a Library item or folder (recursive). */
    async deleteItem(id, parentFolder = null) {
        try {
            const targetPath = parentFolder
                ? path.join(LIBRARY_PATH, parentFolder, id)
                : path.join(LIBRARY_PATH, id);

            if (await fs.pathExists(targetPath)) {
                await fs.remove(targetPath);
                return { success: true };
            }
            return { success: false, error: 'Item not found' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /** Rename a Library item or folder. Also updates config.json title if Smart Item. */
    async renameItem(id, newName, parentFolder = null) {
        try {
            const currentPath = parentFolder && parentFolder !== '/'
                ? path.join(LIBRARY_PATH, parentFolder, id)
                : path.join(LIBRARY_PATH, id);

            if (!await fs.pathExists(currentPath)) {
                return { success: false, error: 'Item not found' };
            }

            const safeName = newName.replace(/[<>:"/\\|?*]/g, '').trim();
            const newPath = path.join(path.dirname(currentPath), safeName);

            if (await fs.pathExists(newPath)) {
                return { success: false, error: 'Name already exists' };
            }

            await fs.rename(currentPath, newPath);

            const configPath = path.join(newPath, 'config.json');
            if (await fs.pathExists(configPath)) {
                const config = await fs.readJson(configPath);
                config.title = newName;
                await fs.writeJson(configPath, config, { spaces: 2 });
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Update Smart Item metadata (title, BPM, tags, key, status).
     * Optionally move to a different folder and replace audio files.
     */
    async updateMetadata(fsName, metadata, parentFolder = null, targetFolder = null, newFiles = null) {
        try {
            let itemPath = parentFolder && parentFolder !== '/'
                ? path.join(LIBRARY_PATH, parentFolder, fsName)
                : path.join(LIBRARY_PATH, fsName);

            if (!await fs.pathExists(itemPath)) {
                return { success: false, error: 'Item not found' };
            }

            // Move to a different category folder
            if (targetFolder && targetFolder !== parentFolder) {
                const newParentPath = path.join(LIBRARY_PATH, targetFolder);
                await fs.ensureDir(newParentPath);

                const newItemPath = path.join(newParentPath, fsName);
                if (await fs.pathExists(newItemPath)) {
                    return { success: false, error: 'Item already exists in target folder' };
                }

                await fs.move(itemPath, newItemPath);
                itemPath = newItemPath;
            }

            const configPath = path.join(itemPath, 'config.json');
            if (!await fs.pathExists(configPath)) {
                return { success: false, error: 'Config not found (not a Smart Item)' };
            }

            const config = await fs.readJson(configPath);

            if (metadata.title) config.title = metadata.title;
            if (metadata.bpm !== undefined) config.bpm = Number(metadata.bpm);
            if (metadata.targetBPM !== undefined) config.targetBPM = Number(metadata.targetBPM);
            if (metadata.difficulty !== undefined) config.difficulty = Number(metadata.difficulty);

            config.key = metadata.key || null;

            if (metadata.tags) {
                config.tags = metadata.tags;
                await this._syncTags(metadata.tags);
            }
            if (metadata.status) {
                config.status = metadata.status;
            }

            if (newFiles) {
                if (newFiles.audioBacking) {
                    const fileName = path.basename(newFiles.audioBacking);
                    await fs.copy(newFiles.audioBacking, path.join(itemPath, fileName));
                    config.files.backing = fileName;
                }
                if (newFiles.audioOriginal) {
                    const fileName = path.basename(newFiles.audioOriginal);
                    await fs.copy(newFiles.audioOriginal, path.join(itemPath, fileName));
                    config.files.original = fileName;
                }
            }

            await fs.writeJson(configPath, config, { spaces: 2 });
            return { success: true, item: config };

        } catch (err) {
            console.error('updateMetadata failed:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Sync the BPM and a history entry to the physical config.json.
     * Called by ipc/db.js after a library:update-progress event.
     */
    async updateProgress(fsName, lastSuccessBPM, historyEntry, parentFolder = null) {
        try {
            const itemPath = parentFolder && parentFolder !== '/'
                ? path.join(LIBRARY_PATH, parentFolder, fsName)
                : path.join(LIBRARY_PATH, fsName);

            const configPath = path.join(itemPath, 'config.json');
            if (!await fs.pathExists(configPath)) {
                return { success: false, error: 'Config not found' };
            }

            const config = await fs.readJson(configPath);
            config.lastSuccessBPM = lastSuccessBPM;
            if (!config.history) config.history = [];
            config.history.push(historyEntry);

            await fs.writeJson(configPath, config, { spaces: 2 });
            return { success: true };
        } catch (err) {
            console.error('Failed to update physical config progress:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Update play statistics for a Smart Item (playCount, lastPlayed).
     * Called via `fs:update-stats` IPC channel.
     *
     * @param {string} id - Item UUID
     * @param {Object} sessionData - { actualDuration, rating }
     * @param {string|null} parentFolder - Relative folder path
     */
    async updateStats(id, sessionData, parentFolder = null) {
        try {
            // Locate by ID via catalog
            const catalog = await this.getCatalog();
            const catalogItem = catalog.items.find(i => i.id === id);
            if (!catalogItem) {
                return { success: false, error: 'Item not found in catalog' };
            }

            const configPath = path.join(catalogItem.path, 'config.json');
            if (!await fs.pathExists(configPath)) {
                return { success: false, error: 'Config not found' };
            }

            const config = await fs.readJson(configPath);
            if (!config.stats) config.stats = { playCount: 0, lastPlayed: null, addedAt: config.stats?.addedAt };

            config.stats.playCount = (config.stats.playCount || 0) + 1;
            config.stats.lastPlayed = new Date().toISOString();

            await fs.writeJson(configPath, config, { spaces: 2 });
            return { success: true };
        } catch (err) {
            console.error('Failed to update stats:', err);
            return { success: false, error: err.message };
        }
    }

    // ─── Tags ────────────────────────────────────────────────────────────────

    async getAllTags() {
        try {
            const tagsPath = path.join(LIBRARY_PATH, 'tags.json');
            if (!await fs.pathExists(tagsPath)) {
                await fs.writeJson(tagsPath, []);
                return [];
            }
            return await fs.readJson(tagsPath);
        } catch (err) {
            console.error('Failed to get tags:', err);
            return [];
        }
    }

    async _syncTags(newTags) {
        if (!newTags || !Array.isArray(newTags)) return;
        const currentTags = await this.getAllTags();
        const outputTags = new Set([...currentTags, ...newTags]);
        if (outputTags.size > currentTags.length) {
            await fs.writeJson(
                path.join(LIBRARY_PATH, 'tags.json'),
                Array.from(outputTags).sort()
            );
        }
    }

    // ─── Key normalisation ───────────────────────────────────────────────────

    /** Normalise shorthand key strings to the canonical "X Major / X Minor" form. */
    _normalizeKey(key) {
        if (!key) return null;
        const k = key.trim();

        if (k.endsWith('m') && !k.toLowerCase().endsWith('am')) {
            return `${k.slice(0, -1)} Minor`;
        }
        if (k.toLowerCase().endsWith('min')) {
            return `${k.slice(0, -3).trim()} Minor`;
        }
        if (k.toLowerCase().includes('minor')) {
            return `${k.split(' ')[0]} Minor`;
        }
        if (k.toLowerCase().endsWith('maj')) {
            return `${k.slice(0, -3).trim()} Major`;
        }
        if (k.toLowerCase().includes('major')) {
            return `${k.split(' ')[0]} Major`;
        }
        // Bare note letter(s) — assume Major
        if (k.length <= 2) {
            return `${k} Major`;
        }
        return k;
    }

    // ─── Internal scan ───────────────────────────────────────────────────────

    async _getAllSmartItems() {
        try {
            const rootItems = await fs.readdir(LIBRARY_PATH, { withFileTypes: true });
            const categories = rootItems.filter(d => d.isDirectory()).map(d => d.name);

            const allItems = [];
            for (const category of categories) {
                await this._scanDeep(path.join(LIBRARY_PATH, category), category, [], allItems);
            }
            return allItems;
        } catch (err) {
            console.error('Error getting all smart items:', err);
            return [];
        }
    }

    /**
     * Recursively descend into `currentPath`.
     * Stops at directories that contain a config.json (Smart Items).
     */
    async _scanDeep(currentPath, category, folderHierarchy, resultList) {
        const items = await fs.readdir(currentPath, { withFileTypes: true });

        for (const dirent of items) {
            if (!dirent.isDirectory()) continue;

            const itemPath = path.join(currentPath, dirent.name);
            const configPath = path.join(itemPath, 'config.json');

            if (await fs.pathExists(configPath)) {
                try {
                    const config = await fs.readJson(configPath);

                    if (config.key) config.key = this._normalizeKey(config.key);

                    const mergedTags = new Set([...(config.tags || []), ...folderHierarchy]);

                    const itemData = {
                        ...config,
                        tags: Array.from(mergedTags),
                        type: 'smart_item',
                        path: itemPath,
                        fsName: dirent.name,
                        category,
                        relPath: folderHierarchy.length > 0
                            ? `${category}/${folderHierarchy.join('/')}`
                            : category
                    };

                    // Resolve relative file paths to absolute
                    if (itemData.files) {
                        for (const key of ['backing', 'original', 'tab']) {
                            if (itemData.files[key] && !path.isAbsolute(itemData.files[key])) {
                                itemData.files[key] = path.join(itemPath, itemData.files[key]);
                            }
                        }
                    }

                    resultList.push(itemData);
                } catch (e) {
                    console.error(`Bad config.json in ${itemPath}:`, e);
                }
            } else {
                await this._scanDeep(itemPath, category, [...folderHierarchy, dirent.name], resultList);
            }
        }
    }

    /** Get all folder paths recursively (for ImportModal dropdown). */
    async getAllFolderPaths() {
        const result = [];
        try {
            const categories = await fs.readdir(LIBRARY_PATH, { withFileTypes: true });
            for (const cat of categories.filter(d => d.isDirectory())) {
                result.push(cat.name);
                const catPath = path.join(LIBRARY_PATH, cat.name);
                await this._collectFolders(catPath, cat.name, result);
            }
        } catch (err) {
            console.error('Error collecting folder paths:', err);
        }
        return result;
    }

    /** Recursive helper for getAllFolderPaths. */
    async _collectFolders(dirPath, prefix, result) {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        for (const item of items.filter(d => d.isDirectory())) {
            const configPath = path.join(dirPath, item.name, 'config.json');
            const isSmartItem = await fs.pathExists(configPath);
            if (!isSmartItem) {
                const fullRel = `${prefix}/${item.name}`;
                result.push(fullRel);
                await this._collectFolders(path.join(dirPath, item.name), fullRel, result);
            }
        }
    }
}

module.exports = new LibraryService();

