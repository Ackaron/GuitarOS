const { initDB } = require('./services/db');

console.log('Testing DB Service...');

async function test() {
    try {
        const db = await initDB();
        console.log('DB Initialized successfully.');
        console.log('User:', db.data.user);
        // Write something to test persistence
        db.data.user.totalCheckins += 1;
        await db.write();
        console.log('DB Write successful.');
    } catch (error) {
        console.error('DB Test Failed:', error);
    }
}

test();
