const ReaperService = require('./services/ReaperService');

console.log('Testing REAPER Connection...');

async function test() {
    try {
        // 40044 is the Command ID for Transport: Play/Stop
        console.log('Sending Play/Stop command (40044)...');
        const result = await ReaperService.sendCommand('40044');
        console.log('Response:', result);

        // Test BPM change as requested in plan
        // console.log('Setting BPM to 120...');
        // await ReaperService.setBpm(120);
        // console.log('BPM command sent.');

    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

test();
