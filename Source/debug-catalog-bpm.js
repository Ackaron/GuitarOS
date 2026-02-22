const LibraryService = require('./services/LibraryService');

(async () => {
    console.log("Loading Catalog...");
    const catalog = await LibraryService.getCatalog();

    const ids = [
        '825831aa-d771-4efb-ada1-504a00b99e57',
        'ba533952-9d5d-4865-a0e7-99142708128d',
        'e3ad03c8-4207-410d-81aa-c47e95a287fb'
    ];

    ids.forEach(id => {
        const item = catalog.items.find(i => i.id === id);
        if (item) {
            console.log(`\nID: ${id}`);
            console.log(`Title: ${item.title}`);
            console.log(`Original BPM: ${item.originalBpm}`);
            console.log(`Target BPM: ${item.targetBPM}`);
            console.log(`Current Config BPM: ${item.bpm}`); // Default in file

            // Logic replication
            const target = item.targetBPM || item.originalBpm || item.bpm || 120;
            console.log(`-> Resolved Target BPM: ${target}`);
        } else {
            console.log(`\nID: ${id} NOT FOUND`);
        }
    });
})();
