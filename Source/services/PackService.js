/**
 * PackService.js — Handles .gpack importing, exporting, and routine zipping.
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

class PackService {

    /** Export a specific folder (relative path) to a .gpack zip file */
    async exportPack(folderRelPath, outputPath, libraryPath) {
        try {
            const zip = new AdmZip();

            if (folderRelPath === '') {
                // Export the entire library
                const manifest = {
                    packName: "Full_Library_Backup",
                    exportedAt: new Date().toISOString(),
                    version: "1.0",
                    type: "guitaros_pack_full",
                    originalPath: ""
                };

                zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));
                zip.addLocalFolder(libraryPath, "Library");
                zip.writeZip(outputPath);
                return { success: true, path: outputPath };
            }

            const sourcePath = path.join(libraryPath, folderRelPath);

            if (!await fs.pathExists(sourcePath)) {
                return { success: false, error: `Source folder not found: ${sourcePath}` };
            }

            // Generate a simple manifest
            const manifest = {
                packName: path.basename(sourcePath),
                exportedAt: new Date().toISOString(),
                version: "1.0",
                type: "guitaros_pack",
                originalPath: folderRelPath
            };

            zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));
            zip.addLocalFolder(sourcePath);
            zip.writeZip(outputPath);

            return { success: true, path: outputPath };
        } catch (err) {
            console.error('Failed to export pack:', err);
            return { success: false, error: err.message };
        }
    }

    /** Export a generated routine (playlist) to a strict .gpack course */
    async exportRoutine(payload, outputPath) {
        try {
            const zip = new AdmZip();

            const isMultiDay = payload.type === 'multi_day_course';
            const packName = isMultiDay ? payload.packName : path.basename(outputPath, '.gcourse');

            // Build the course manifest structure
            const manifest = {
                packName: packName,
                exportedAt: new Date().toISOString(),
                version: "1.0",
                type: isMultiDay ? "multi_day_course" : "routine",
                author: payload.author || ''
            };

            const addedFiles = new Set();

            if (isMultiDay) {
                manifest.days = [];
                for (let d = 0; d < payload.days.length; d++) {
                    const dayObj = payload.days[d];
                    const dayManifest = {
                        day: dayObj.day, // ensure property is assigned
                        title: dayObj.title,
                        items: []
                    };

                    for (let i = 0; i < dayObj.items.length; i++) {
                        const item = dayObj.items[i];
                        const itemEntry = await this._processExportItem(item, i, `d${dayObj.day}`, zip, addedFiles);
                        dayManifest.items.push(itemEntry);
                    }
                    manifest.days.push(dayManifest);
                }
            } else {
                manifest.items = [];
                for (let i = 0; i < payload.length; i++) {
                    const item = payload[i];
                    const itemEntry = await this._processExportItem(item, i, 'r', zip, addedFiles);
                    manifest.items.push(itemEntry);
                }
            }

            zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));
            zip.writeZip(outputPath);

            return { success: true, path: outputPath };
        } catch (err) {
            console.error('Failed to export routine/course:', err);
            return { success: false, error: err.message };
        }
    }

    async _processExportItem(item, index, prefix, zip, addedFiles) {
        const itemEntry = {
            id: `step_${prefix}_${index + 1}`,
            name: item.name || item.title,
            title: item.title || item.name,
            duration: item.duration, // Exact prescribed time
            category: item.category || 'Mixed',
            slotType: item.slotType || 'Exercise',
            files: {}
        };

        if (item.files) {
            for (const key of ['backing', 'original', 'tab', 'rpp']) {
                if (item.files[key] && await fs.pathExists(item.files[key])) {
                    const safeFileName = `${prefix}_${index + 1}_${path.basename(item.files[key])}`;

                    if (!addedFiles.has(item.files[key])) {
                        zip.addLocalFile(item.files[key], "media", safeFileName);
                        addedFiles.add(item.files[key]);
                    } else {
                        zip.addLocalFile(item.files[key], "media", safeFileName);
                    }

                    itemEntry.files[key] = `media/${safeFileName}`;
                }
            }
        }
        return itemEntry;
    }

    /** Import a .gpack zip file into the library */
    async importPack(filePath, libraryPath) {
        const tempExtractPath = path.join(libraryPath, '.tmp_import_' + crypto.randomUUID());
        try {
            const zip = new AdmZip(filePath);

            await fs.ensureDir(tempExtractPath);

            // Extract all contents to temp folder first
            zip.extractAllTo(tempExtractPath, true);

            let manifest = null;
            const manifestPath = path.join(tempExtractPath, 'manifest.json');
            if (await fs.pathExists(manifestPath)) {
                manifest = await fs.readJson(manifestPath);
            }

            let packName = path.parse(filePath).name;
            let packType = 'guitaros_pack';

            if (manifest) {
                if (manifest.packName) packName = manifest.packName;
                if (manifest.type) packType = manifest.type;
            }

            let finalTargetRoot;

            if (packType === 'routine' || packType === 'multi_day_course') {
                // Courses go into Imports/Courses/[PackName]
                const coursesRoot = path.join(libraryPath, 'Imports', 'Courses');
                await fs.ensureDir(coursesRoot);

                let targetPath = path.join(coursesRoot, packName);
                let counter = 1;
                while (await fs.pathExists(targetPath)) {
                    targetPath = path.join(coursesRoot, `${packName} (${counter})`);
                    counter++;
                }

                await fs.move(tempExtractPath, targetPath);
                return { success: true, folder: path.basename(targetPath) };
            } else if (packType === 'guitaros_pack' || !manifest) {
                // Regenerate IDs safely in the temp folder first
                await this._regenerateIdsAndPaths(tempExtractPath);

                // Determine target directory structure based on originalPath
                if (manifest && manifest.originalPath && typeof manifest.originalPath === 'string' && manifest.originalPath.trim() !== '') {
                    const sanitizedRelPath = manifest.originalPath.replace(/(\.\.[\/\\])+/g, '').trim();
                    finalTargetRoot = path.join(libraryPath, sanitizedRelPath);
                } else {
                    finalTargetRoot = path.join(libraryPath, 'Imports', packName);
                }

                await fs.ensureDir(finalTargetRoot);

                // Move individual item folders from tempExtractPath to finalTargetRoot
                const tempItems = await fs.readdir(tempExtractPath, { withFileTypes: true });
                for (const dirent of tempItems) {
                    if (dirent.isDirectory()) {
                        const sourceItemFolder = path.join(tempExtractPath, dirent.name);
                        let destItemFolder = path.join(finalTargetRoot, dirent.name);

                        // Prevent overwriting existing items
                        let counter = 1;
                        while (await fs.pathExists(destItemFolder)) {
                            destItemFolder = path.join(finalTargetRoot, `${dirent.name} (${counter})`);
                            counter++;
                        }

                        await fs.move(sourceItemFolder, destItemFolder);
                    }
                }

                // Cleanup temp
                await fs.remove(tempExtractPath);
                return { success: true, folder: path.basename(finalTargetRoot) };
            } else {
                await fs.remove(tempExtractPath);
                return { success: false, error: 'Unsupported pack type' };
            }
        } catch (err) {
            console.error('Failed to import pack:', err);
            // Ensure temp is cleaned up on error
            if (await fs.pathExists(tempExtractPath)) {
                await fs.remove(tempExtractPath);
            }
            return { success: false, error: err.message };
        }
    }

    async _regenerateIdsAndPaths(folderPath) {
        const scan = async (currentPath) => {
            const items = await fs.readdir(currentPath, { withFileTypes: true });
            for (const dirent of items) {
                if (dirent.isDirectory()) {
                    await scan(path.join(currentPath, dirent.name));
                } else if (dirent.name === 'config.json') {
                    const configPath = path.join(currentPath, 'config.json');
                    const config = await fs.readJson(configPath);
                    config.id = crypto.randomUUID(); // New ID for imported item
                    config.stats = { addedAt: new Date(), lastPlayed: null, playCount: 0 }; // Reset history
                    await fs.writeJson(configPath, config, { spaces: 2 });
                }
            }
        };
        await scan(folderPath);
    }
}

module.exports = new PackService();
