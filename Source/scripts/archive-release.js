/**
 * archive-release.js
 * 
 * Script to archive win-unpacked folder and include empty Data/Apps templates.
 */
const archiver = require('archiver');
const fs = require('fs-extra');
const path = require('path');
const pkg = require('../package.json');

async function archiveRelease() {
    const version = pkg.version;
    const outputDir = path.join(__dirname, '../dist');
    const sourceDir = path.join(outputDir, 'win-unpacked');
    const outputFileName = `GuitarOS_v${version}_Portable.zip`;
    const outputPath = path.join(outputDir, outputFileName);

    if (!fs.existsSync(sourceDir)) {
        console.error('Error: win-unpacked directory not found. Run npm run dist:installer (or build) first.');
        process.exit(1);
    }

    console.log(`Archiving ${sourceDir} to ${outputPath}...`);

    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    output.on('close', () => {
        console.log(`Archive created successfully: ${outputFileName} (${archive.pointer()} total bytes)`);
    });

    archive.on('error', (err) => {
        throw err;
    });

    archive.pipe(output);

    // Add everything from win-unpacked
    archive.directory(sourceDir, false);

    // Ensure Data and Apps folders exist in the zip root (even if empty)
    // Actually, we don't want to overwrite user data, but providing templates is good.
    // electron-builder's extraFiles might already handle this, but the task asked for it explicitly.

    // Create temporary template directories if they don't exist
    const tempDir = path.join(__dirname, '../temp_templates');
    await fs.ensureDir(path.join(tempDir, 'Data'));
    await fs.ensureDir(path.join(tempDir, 'Apps'));

    // Add empty directories to the archive
    archive.directory(path.join(tempDir, 'Data'), 'Data');
    archive.directory(path.join(tempDir, 'Apps'), 'Apps');

    await archive.finalize();

    // Cleanup
    await fs.remove(tempDir);
}

archiveRelease().catch(err => {
    console.error('Archive failed:', err);
    process.exit(1);
});
