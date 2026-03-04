/**
 * copy-alphatab-assets.js
 *
 * Copies AlphaTab worker/worklet/core files from node_modules into public/alphatab/
 * so they are available at runtime in the Electron production build.
 *
 * Run: node scripts/copy-alphatab-assets.js
 * Or automatically via "postinstall" npm script.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'node_modules', '@coderline', 'alphatab', 'dist');
const DST = path.join(__dirname, '..', 'public', 'alphatab');

const FILES_TO_COPY = [
    'alphaTab.mjs',
    'alphaTab.min.js',       // UMD build — sets window.alphaTab globally
    'alphaTab.core.mjs',
    'alphaTab.core.min.mjs',
    'alphaTab.worker.mjs',
    'alphaTab.worker.min.mjs',
    'alphaTab.worklet.mjs',
    'alphaTab.worklet.min.mjs',
];

// Ensure destination exists
if (!fs.existsSync(DST)) {
    fs.mkdirSync(DST, { recursive: true });
}

let copied = 0;
for (const file of FILES_TO_COPY) {
    const src = path.join(SRC, file);
    const dst = path.join(DST, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
        console.log(`  ✓ ${file}`);
        copied++;
    } else {
        console.warn(`  ⚠ ${file} not found in ${SRC}`);
    }
}

console.log(`\nCopied ${copied}/${FILES_TO_COPY.length} AlphaTab assets to public/alphatab/`);
