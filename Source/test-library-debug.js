const LibraryService = require('./services/LibraryService');

(async () => {
    try {
        const catalog = await LibraryService.getCatalog();
        console.log('Total Items:', catalog.items.length);
        console.log('--- Items in Exercises ---');
        const exercises = catalog.items.filter(i => i.parent === 'exercises' || i.category === 'Exercises');
        console.log(JSON.stringify(exercises.map(i => ({ title: i.title, id: i.id, parent: i.parent, category: i.category, path: i.path })), null, 2));

        console.log('--- ALL PARENTS/CATEGORIES ---');
        catalog.items.forEach(i => {
            console.log(`[${i.title}] Parent: ${i.parent}, Category: ${i.category}, Path includes 'Exercises': ${i.path.includes('Exercises')}`);
        });

    } catch (e) {
        console.error(e);
    }
})();
