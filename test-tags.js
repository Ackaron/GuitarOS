const LibraryService = require('./Source/services/LibraryService');
const path = require('path');
const fs = require('fs-extra');

async function test() {
    console.log("--- Starting Folder-Based Tagging Test ---");

    // 1. Get current catalog
    const catalog = await LibraryService.getCatalog();
    console.log(`Global Tags: ${catalog.tags.join(', ')}`);

    const techniqueItems = catalog.items.filter(i => i.category === 'Technique');
    console.log(`Found ${techniqueItems.length} items in Technique.`);

    techniqueItems.forEach(item => {
        console.log(`- Item: ${item.title}, Tags: ${item.tags.join(', ')}`);
    });

    console.log("--- Test Complete ---");
}

test().catch(console.error);
