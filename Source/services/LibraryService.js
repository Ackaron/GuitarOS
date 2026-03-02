/**
 * LibraryService.js — High-level coordinator for the GuitarOS file-system library.
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { ASSETS_PATH, USER_DATA_PATH } = require('../config/dataPath');

const LibraryCache = require('./LibraryCache');
const PackService = require('./PackService');

// The Library lives in the writable USER_DATA_PATH
const LIBRARY_PATH = path.join(USER_DATA_PATH, 'Library');
// The bundled library (read-only) lives in ASSETS_PATH
const BUNDLED_LIBRARY_PATH = path.join(ASSETS_PATH, 'Library');

class LibraryService {
    constructor() {
        this.init();
    }

    getLibraryPath() { return LIBRARY_PATH; }

    /** Ensure default folder structure exists. */
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

    /** Delegate caching operations to LibraryCache */
    async getAllFolders() {
        return await LibraryCache.getAllFolders(LIBRARY_PATH);
    }

    async getCatalog() {
        return await LibraryCache.getCatalog(LIBRARY_PATH);
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
                key: LibraryCache.normalizeKey(metadata.key) || null,
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

    /**
     * Smart Review Engine
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

                const sortedHistory = [...ex.history].sort((a, b) => new Date(b.date) - new Date(a.date));
                const lastSession = sortedHistory[0];
                const sessionDate = new Date(lastSession.date).getTime();

                if (sessionDate >= cutoffTime) {
                    const score = lastSession.score !== undefined ? lastSession.score : 100;
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

            return reviewItems.sort((a, b) => a.score - b.score);
        } catch (err) {
            console.error('Error fetching review queue:', err);
            return [];
        }
    }

    /** Delegate pack operations to PackService */
    async exportPack(folderRelPath, outputPath) {
        return await PackService.exportPack(folderRelPath, outputPath, LIBRARY_PATH);
    }

    async exportRoutine(payload, outputPath) {
        return await PackService.exportRoutine(payload, outputPath);
    }

    async importPack(filePath) {
        return await PackService.importPack(filePath, LIBRARY_PATH);
    }

    /** Returns all strict courses (routines) imported into Imports/Courses/ */
    async getCourses() {
        const coursesDir = path.join(LIBRARY_PATH, 'Imports', 'Courses');
        if (!await fs.pathExists(coursesDir)) return [];

        const courses = [];
        const folders = await fs.readdir(coursesDir, { withFileTypes: true });

        for (const f of folders) {
            if (f.isDirectory()) {
                const manifestPath = path.join(coursesDir, f.name, 'manifest.json');
                if (await fs.pathExists(manifestPath)) {
                    try {
                        const manifest = await fs.readJson(manifestPath);
                        if (manifest.type === 'routine' || manifest.type === 'multi_day_course') {
                            const courseAbsPath = path.join(coursesDir, f.name);

                            const db = require('./db');
                            const userDB = db.getUserDB();
                            await userDB.read();
                            const progress = userDB.data.courseProgress?.[f.name] || { highestUnlockedDay: 1 };

                            courses.push({
                                id: f.name,
                                name: manifest.packName || f.name,
                                type: manifest.type,
                                importedAt: manifest.exportedAt,
                                highestUnlockedDay: progress.highestUnlockedDay,

                                itemsCount: manifest.items?.length || 0,
                                playlist: manifest.items ? manifest.items.map(item => ({
                                    ...item,
                                    path: courseAbsPath
                                })) : [],

                                days: manifest.days ? manifest.days.map(day => ({
                                    ...day,
                                    items: day.items.map(item => ({
                                        ...item,
                                        path: courseAbsPath
                                    }))
                                })) : [],

                                folderPath: path.join('Imports', 'Courses', f.name)
                            });
                        }
                    } catch (e) {
                        console.error('Failed to parse course manifest:', e);
                    }
                }
            }
        }
        return courses;
    }

    async deleteCourse(courseId) {
        try {
            const courseDir = path.join(LIBRARY_PATH, 'Imports', 'Courses', courseId);
            if (await fs.pathExists(courseDir)) {
                await fs.remove(courseDir);

                const db = require('./db');
                const userDB = db.getUserDB();
                if (userDB && userDB.data && userDB.data.courseProgress && userDB.data.courseProgress[courseId]) {
                    delete userDB.data.courseProgress[courseId];
                    await userDB.write();
                }

                return { success: true };
            }
            return { success: false, error: 'Course not found' };
        } catch (err) {
            console.error('Failed to delete course:', err);
            return { success: false, error: err.message };
        }
    }

    async updateCourseProgress(courseId, highestUnlockedDay) {
        try {
            const db = require('./db');
            const userDB = db.getUserDB();
            await userDB.read();

            if (!userDB.data.courseProgress) {
                userDB.data.courseProgress = {};
            }

            const currentProgress = userDB.data.courseProgress[courseId] || { highestUnlockedDay: 1 };
            if (highestUnlockedDay > currentProgress.highestUnlockedDay) {
                userDB.data.courseProgress[courseId] = { highestUnlockedDay };
                await userDB.write();
            }
            return { success: true };
        } catch (err) {
            console.error('Failed to update course progress:', err);
            return { success: false, error: err.message };
        }
    }
}

module.exports = new LibraryService();
