const LibraryService = require('./services/LibraryService');
const UserPreferencesService = require('./services/UserPreferencesService');
const fs = require('fs-extra');
const path = require('path');

async function test() {
    console.log("--- Starting Verification ---");

    // 1. Test Preferences
    console.log("\n1. Testing Preferences (Language)...");
    await UserPreferencesService.init();
    await UserPreferencesService.savePreferences({ general: { language: 'ru' } });
    const prefs = await UserPreferencesService.getPreferences();
    if (prefs.general && prefs.general.language === 'ru') {
        console.log("PASS: Language preference saved and retrieved.");
    } else {
        console.error("FAIL: Language preference not saved correctly.", prefs);
    }

    // 2. Test Russian Path Support
    console.log("\n2. Testing Russian Path Support...");
    const russianFolderName = "ТестоваяПапка";
    const russianRename = "НоваяПапка";

    // Cleanup previous runs
    const libPath = path.join(process.cwd(), '../Data/Library');
    await fs.remove(path.join(libPath, russianFolderName));
    await fs.remove(path.join(libPath, russianRename));

    // Create
    const createRes = await LibraryService.createFolder(russianFolderName);
    if (createRes.success && await fs.pathExists(path.join(libPath, russianFolderName))) {
        console.log(`PASS: Created folder "${russianFolderName}"`);
    } else {
        console.error(`FAIL: Failed to create folder "${russianFolderName}"`, createRes);
    }

    // Rename
    const renameRes = await LibraryService.renameItem(russianFolderName, russianRename);
    if (renameRes.success && await fs.pathExists(path.join(libPath, russianRename)) && !(await fs.pathExists(path.join(libPath, russianFolderName)))) {
        console.log(`PASS: Renamed to "${russianRename}"`);
    } else {
        console.error(`FAIL: Failed to rename to "${russianRename}"`, renameRes);
    }

    // Cleanup
    await fs.remove(path.join(libPath, russianRename));
    console.log("\n--- Verification Complete ---");
}

test().catch(console.error);
