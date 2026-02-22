const LibraryService = require('./services/LibraryService');

async function test() {
    console.log("--- Starting Recursive Folder Test ---");
    const folders = await LibraryService.getAllFolders();
    console.log("All Available Folders:");
    folders.forEach(f => console.log(`- ${f}`));
    console.log("--- Test Complete ---");
}

test().catch(console.error);
