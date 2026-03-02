/**
 * LibraryCache.js — Handles deep scanning, caching, and metadata extraction of the Library.
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');

const STANDARD_KEYS = [
    'C Major', 'G Major', 'D Major', 'A Major', 'E Major', 'B Major', 'F# Major', 'C# Major', 'F Major', 'Bb Major', 'Eb Major', 'Ab Major', 'Db Major', 'Gb Major', 'Cb Major',
    'A Minor', 'E Minor', 'B Minor', 'F# Minor', 'C# Minor', 'G# Minor', 'D# Minor', 'A# Minor', 'D Minor', 'G Minor', 'C Minor', 'F Minor', 'Bb Minor', 'Eb Minor', 'Ab Minor'
];

const STANDARD_TAGS = [
    'Alternate Picking', 'Economy Picking', 'Sweep Picking', 'Hybrid Picking',
    'Legato', 'Tapping', 'Fingerstyle', 'Bending', 'Vibrato', 'Strumming',
    'Rhythm', 'Chords', 'Scales', 'Arpeggios'
];

class LibraryCache {
    /** Helper to normalize music keys */
    normalizeKey(key) {
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

    /** Recursively scan for all sub-folders ignoring items with config.json. */
    async getAllFolders(libraryPath) {
        const results = [];
        const scan = async (currentRelative) => {
            const absolutePath = path.join(libraryPath, currentRelative);
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
    async getCatalog(libraryPath) {
        const items = await this.getAllSmartItems(libraryPath);
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

    async getAllSmartItems(libraryPath) {
        try {
            if (!await fs.pathExists(libraryPath)) return [];
            const rootItems = await fs.readdir(libraryPath, { withFileTypes: true });
            const categories = rootItems.filter(d => d.isDirectory()).map(d => d.name);
            const allItems = [];
            for (const category of categories) {
                await this._scanDeep(path.join(libraryPath, category), category, [], allItems);
            }
            return allItems;
        } catch (err) { return []; }
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
                    if (config.key) config.key = this.normalizeKey(config.key);

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
}

module.exports = new LibraryCache();
