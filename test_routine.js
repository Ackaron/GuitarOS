const mockElectron = {
    app: {
        isPackaged: false,
        getPath: () => 'D:/Project/GuitarOS1/Data'
    }
};
require('module').prototype.require = new Proxy(require('module').prototype.require, {
    apply(target, thisArg, argumentsList) {
        if (argumentsList[0] === 'electron') return mockElectron;
        return Reflect.apply(target, thisArg, argumentsList);
    }
});

const RoutineService = require('./Source/services/RoutineService');
const LibraryService = require('./Source/services/LibraryService');

(async () => {
    try {
        console.log("Initializing Library...");
        await LibraryService.init();

        console.log("Generating Routine...");
        // Simulate a simple routine request
        const routine = await RoutineService.generateRoutine(60, [
            { type: 'theory', target: 'E Minor', percentage: 100 }
        ]);

        console.log("Generated Routine Items:");
        routine.forEach(item => {
            console.log(`ID: ${item.id}`);
            console.log(`Title: ${item.title}`);
            console.log(`BPM (Current): ${item.bpm}`);
            console.log(`BPM (Original): ${item.originalBpm}`);
            console.log(`History Len: ${item.history ? item.history.length : 0}`);
            console.log('---');
        });

    } catch (e) {
        console.error(e);
    }
})();
