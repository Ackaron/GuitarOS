const LibraryService = require('./services/LibraryService');

(async () => {
    const catalog = await LibraryService.getCatalog();
    console.log("Catalog Items Summary:");
    catalog.items.forEach(i => {
        console.log(`- Title: ${i.title} | Category: ${i.category} | Parent: ${i.parent} | Path: ${i.path}`);
    });
})();
