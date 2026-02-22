const LibraryService = require('./services/LibraryService');
const path = require('path');
const fs = require('fs-extra');

async function test() {
    console.log("--- Starting Import Tag Test ---");

    // Create a dummy GP file
    const dummyGP = path.join(__dirname, 'test.gp');
    await fs.writeFile(dummyGP, 'dummy content');

    console.log("Importing...");
    const res = await LibraryService.importGPFile({ gp: dummyGP }, 'Technique', {
        title: 'Import Tag Test',
        bpm: 120,
        tags: ['New-Manual-Tag']
    });

    if (res.success) {
        console.log("Import Success!");
        const config = res.item;
        console.log(`Saved Tags: ${config.tags.join(', ')}`);

        // Verify tags.json
        const tags = await LibraryService.getAllTags();
        console.log(`Global Tags in tags.json: ${tags.join(', ')}`);

        if (tags.includes('New-Manual-Tag')) {
            console.log("SUCCESS: Tag found in tags.json");
        } else {
            console.log("FAILURE: Tag NOT found in tags.json");
        }
    } else {
        console.error("Import Failed:", res.error);
    }

    // Cleanup
    await fs.remove(dummyGP);
    console.log("--- Test Complete ---");
}

test().catch(console.error);
