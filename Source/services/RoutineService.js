/**
 * RoutineService.js — Generates a time-distributed daily practice routine
 * based on the user's module configuration.
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const { initDB } = require('./db');
const LibraryService = require('./LibraryService');

class RoutineService {

    /**
     * Generate a practice routine.
     *
     * @param {number} totalMinutes - Total session length in minutes
     * @param {Array}  modules      - [{ id, type, target, percentage, strategy? }]
     * @returns {Array} Routine items with enriched metadata and DB-merged BPM
     */
    async generateRoutine(totalMinutes = 60, modules = []) {
        if (!modules || modules.length === 0) return [];

        const catalog = await LibraryService.getCatalog();
        const allItems = catalog.items;
        const pick = arr => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

        // 1. Build pools for each module
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

        // 2. Distribute time proportionally and pick items
        const routine = [];
        for (const vm of validModules) {
            const adjustedRatio = vm.config.percentage / totalValidWeight;
            const duration = Math.floor(totalMinutes * 60 * adjustedRatio);

            if (duration < 60) continue; // Skip slots shorter than 1 minute

            const selectedItem = pick(vm.pool);
            const fullItem = await this._enrichItemConfig(selectedItem);

            routine.push({ ...fullItem, duration, slotType: vm.slotType, moduleId: vm.config.id });
        }

        // 3. Merge current BPM from the DB (progression engine)
        return await this._mergeProgressionData(routine);
    }

    // ─── Pool builders ───────────────────────────────────────────────────────

    /**
     * Build the candidate pool for a single module.
     * @returns {{ pool: Array, itemName: string }}
     */
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
                return {
                    pool: allItems.filter(i => i.path.includes('Technique')),
                    itemName: 'Technique (Random)'
                };
            }

            case 'folder': {
                return {
                    pool: allItems.filter(i => i.path.includes(mod.target)),
                    itemName: mod.target
                };
            }

            case 'exercise': {
                return this._buildExercisePool(mod, allItems);
            }

            case 'repertoire':
            case 'song': {
                if (mod.target) {
                    const preciseItem = allItems.find(i => i.id === mod.target);
                    if (preciseItem) return { pool: [preciseItem], itemName: preciseItem.title };
                }
                return {
                    pool: allItems.filter(i => i.parent === 'songs' || i.category === 'Songs'),
                    itemName: 'Random Song'
                };
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
            return { pool, itemName: targetFolder ? `Folder: ${targetFolder}` : 'Random Folder' };
        }

        if (strategy === 'tag') {
            const tags = mod.target;
            if (tags && tags.length > 0) {
                const targetTags = Array.isArray(tags) ? tags : [tags];
                const pool = allItems.filter(i => i.tags && targetTags.some(t => i.tags.includes(t)));
                return { pool, itemName: `Exercise (${targetTags.join(', ')})` };
            }
            const pool = allItems.filter(i =>
                i.parent === 'exercises' ||
                i.category === 'Exercises' ||
                (i.parent === 'other' && !i.path.includes('Songs') && !i.path.includes('Theory'))
            );
            return { pool, itemName: 'Exercise (Random)' };
        }

        if (strategy === 'key') {
            const keyTarget = mod.target;
            const pool = keyTarget
                ? allItems.filter(i => i.key === keyTarget)
                : allItems.filter(i => i.parent === 'exercises' || i.category === 'Exercises');
            return { pool, itemName: `Exercise (${keyTarget || 'Random'})` };
        }

        // Default: specific item
        if (mod.target) {
            const preciseItem = allItems.find(i => i.id === mod.target);
            if (preciseItem) return { pool: [preciseItem], itemName: preciseItem.title };
        }
        return { pool: [], itemName: 'Unknown Exercise' };
    }

    // ─── Enrichment ──────────────────────────────────────────────────────────

    /** Read the full config.json for an item and merge with catalog data. */
    async _enrichItemConfig(item) {
        try {
            const configPath = path.join(item.path, 'config.json');
            if (await fs.pathExists(configPath)) {
                const config = await fs.readJson(configPath);
                return { ...config, id: item.id, path: item.path, fsName: item.fsName };
            }
        } catch {
            console.warn(`Failed to read config for ${item.id} — using catalog data.`);
        }
        return item;
    }

    /** Merge current BPM and history from the DB into each routine item. */
    async _mergeProgressionData(routine) {
        try {
            const db = await initDB();
            await db.read();
            const dbExercises = db.data.exercises || [];

            return routine.map(item => {
                const dbItem = dbExercises.find(e => e.id === item.id);
                const originalBpm = item.bpm || 120;
                const progressBpm = dbItem ? dbItem.bpm : null;
                const lastSuccessBPM = dbItem ? dbItem.bpm : null;

                return {
                    ...item,
                    originalBpm,
                    lastSuccessBPM,
                    bpm: originalBpm,
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
