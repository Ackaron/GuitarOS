const GPService = require('./services/GPService');
const path = require('path');

// Create a dummy file to test
const testFile = path.resolve(__dirname, '../Data/test.gp');
require('fs').writeFileSync(testFile, 'dummy content');

console.log('Testing GP Launch...');
GPService.openFile(testFile);
