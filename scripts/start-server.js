const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const serverScript = path.join(__dirname, '../server/index.js');
const logFile = path.join(__dirname, '../server.log');
const out = fs.openSync(logFile, 'a');
const err = fs.openSync(logFile, 'a');

console.log('Starting server in background...');

const child = spawn('node', [serverScript], {
  detached: true,
  stdio: ['ignore', out, err]
});

child.unref();

console.log(`Server started with PID: ${child.pid}`);
console.log(`Logs are being written to ${logFile}`);
console.log('You can close this terminal now.');
