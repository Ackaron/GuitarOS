/**
 * RoutineService.js — Generates a time-distributed daily practice routine
 * based on the user's module configuration.
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const { getUserDB } = require('./db');
const LibraryService = require('./LibraryService');

class RoutineService {

    /**
     * Generate a practice routine.
     */
    async generateRoutine(totalMinutes = 60, modules = [], smartReview = false) {
        if (!modules || modules.length === 0) return [];

        const catalog = await LibraryService.getCatalog();
        const allItems = catalog.items;
        const pick = arr => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

        // --- Smart Review Items Logic ---
        const reviewItems = [];
        let allocatedReviewTime = 0;
        if (smartReview) {
            const reviewQueue = await LibraryService.getReviewQueue(2, 60);
            for (const review of reviewQueue) {
                const catalogItem = allItems.find(i => i.id === review.id);
                if (catalogItem) {
                    const fullItem = await this._enrichItemConfig(catalogItem);
                    reviewItems.push({
                        ...fullItem,
                        isReview: true,
                        duration: 300, // 5 mins
                        slotType: 'Smart Review',
                        moduleId: 'smart_review'
                    });
                    allocatedReviewTime += 5;
                }
                if (reviewItems.length >= 2) break; // cap at 2 items (10 mins)
            }
        }

        // Adjust remaining time for regular modules
        const remainingMinutes = Math.max(10, totalMinutes - allocatedReviewTime);

        const validModules = [];
        let totalValidWeight = 0;

        for (const mod of modules) {
            const { pool, itemName } = this._buildPool(mod, allItems);
            if (pool.length > 0) {
                validModules.push({ config: mod, pool, slotType: itemName });
                totalValidWeight += (mod.percentage || 0);
            }
        }

        if (validModules.length === 0) return [];

        const routine = [];
        for (const vm of validModules) {
            const adjustedRatio = vm.config.percentage / totalValidWeight;
            const duration = Math.floor(remainingMinutes * 60 * adjustedRatio);

            if (duration < 60) continue;

            // Remove items that are already in Smart Review from the pool
            const pool = vm.pool.filter(item => !reviewItems.some(ri => ri.id === item.id));
            if (pool.length === 0) continue;

            const selectedItem = pick(pool);
            const fullItem = await this._enrichItemConfig(selectedItem);

            routine.push({ ...fullItem, duration, slotType: vm.slotType, moduleId: vm.config.id });
        }

        // Prepend review items so they appear first
        if (reviewItems.length > 0) {
            routine.unshift(...reviewItems);
        }

        return await this._mergeProgressionData(routine);
    }

    _buildPool(mod, allItems) {
        switch (mod.type) {
            case 'theory': {
                const keyTarget = mod.target;
                const pool = keyTarget
                    ? allItems.filter(i => i.key === keyTarget)
                    : allItems.filter(i => i.path.includes('Theory') || (i.tags && i.tags.includes('Theory')));
                return { pool, itemName: `Theory (${keyTarget || 'Random'})` };
            }
            case 'technique': {
                const tags = mod.target;
                if (tags && tags.length > 0) {
                    const targetTags = Array.isArray(tags) ? tags : [tags];
                    const pool = allItems.filter(i => i.tags && targetTags.some(t => i.tags.includes(t)));
                    return { pool, itemName: `Technique (${targetTags.join(', ')})` };
                }
                return { pool: allItems.filter(i => i.path.includes('Technique')), itemName: 'Technique (Random)' };
            }
            case 'folder': {
                return { pool: allItems.filter(i => i.path.includes(mod.target)), itemName: mod.target };
            }
            case 'exercise':
                return this._buildExercisePool(mod, allItems);
            case 'repertoire':
            case 'song': {
                if (mod.target) {
                    const preciseItem = allItems.find(i => i.id === mod.target);
                    if (preciseItem) return { pool: [preciseItem], itemName: preciseItem.title };
                }
                return { pool: allItems.filter(i => i.parent === 'songs' || i.category === 'Songs'), itemName: 'Random Song' };
            }
            default:
                return { pool: [], itemName: 'Unknown' };
        }
    }

    _buildExercisePool(mod, allItems) {
        const strategy = mod.strategy || 'item';

        if (strategy === 'folder') {
            const targetFolder = mod.target;
            const pool = targetFolder
                ? allItems.filter(i => i.category === targetFolder)
                : allItems.filter(i => i.parent === 'exercises' || i.category === 'Exercises');
            return { pool, itemName: `Exercise (Folder: ${targetFolder || 'Random'})` };
        }

        if (strategy === 'tag') {
            const tags = mod.target;
            const targetTags = Array.isArray(tags) ? tags : [tags].filter(Boolean);
            const pool = targetTags.length > 0
                ? allItems.filter(i => i.tags && targetTags.some(t => i.tags.includes(t)))
                : allItems.filter(i => i.parent === 'exercises' || i.category === 'Exercises');
            return { pool, itemName: `Exercise (Tags: ${targetTags.join(', ') || 'Random'})` };
        }

        if (strategy === 'key') {
            const keyTarget = mod.target;
            const pool = keyTarget
                ? allItems.filter(i => i.key === keyTarget)
                : allItems.filter(i => i.parent === 'exercises' || i.category === 'Exercises');
            return { pool, itemName: `Exercise (Key: ${keyTarget || 'Random'})` };
        }

        if (mod.target) {
            const preciseItem = allItems.find(i => i.id === mod.target);
            if (preciseItem) return { pool: [preciseItem], itemName: preciseItem.title };
        }

        return { pool: [], itemName: 'Unknown Exercise' };
    }

    async _enrichItemConfig(item) {
        try {
            const configPath = path.join(item.path, 'config.json');
            if (await fs.pathExists(configPath)) {
                const config = await fs.readJson(configPath);
                const enriched = { ...config, id: item.id, path: item.path, fsName: item.fsName };
                if (enriched.files) {
                    ['tab', 'backing', 'original'].forEach(key => {
                        if (enriched.files[key] && !path.isAbsolute(enriched.files[key])) {
                            enriched.files[key] = path.join(item.path, enriched.files[key]).replace(/\\/g, '/');
                        }
                    });
                }
                return enriched;
            }
        } catch { }
        return item;
    }

    async _mergeProgressionData(routine) {
        try {
            const db = getUserDB();
            await db.read();
            const dbExercises = db.data.exercises || [];

            return routine.map(item => {
                const dbItem = dbExercises.find(e => e.id === item.id);
                const originalBpm = item.bpm || 120;
                return {
                    ...item,
                    originalBpm,
                    lastSuccessBPM: dbItem ? dbItem.bpm : null,
                    bpm: dbItem ? dbItem.bpm : originalBpm,
                    history: dbItem ? (dbItem.history || []) : []
                };
            });
        } catch (e) {
            console.error('Failed to merge progression data:', e);
            return routine;
        }
    }
}

module.exports = new RoutineService();
