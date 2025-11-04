// Debug script to test audio proxy and log everything
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'audio-debug-logs.txt');
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function writeToFile(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}\n`;
  fs.appendFileSync(logFile, logEntry);
  // Also output to console
  if (level === 'ERROR') {
    originalConsoleError(message);
  } else if (level === 'WARN') {
    originalConsoleWarn(message);
  } else {
    originalConsoleLog(message);
  }
}

// Override console methods
console.log = (...args) => {
  writeToFile(args.join(' '), 'INFO');
};

console.error = (...args) => {
  writeToFile(args.join(' '), 'ERROR');
};

console.warn = (...args) => {
  writeToFile(args.join(' '), 'WARN');
};

console.debug = (...args) => {
  writeToFile(args.join(' '), 'DEBUG');
};

// Clear previous log file
if (fs.existsSync(logFile)) {
  fs.unlinkSync(logFile);
}

writeToFile('=== AUDIO DEBUG LOGS STARTED ===');

// Test the HEAD request
const testUrl = 'http://localhost:3000/api/media/audio/1761864661730_g0fd7dfbf_audio_AC3C95447585C5CD844AC0CA5FC028BA_q60saanej_1761864661730.ogg';

writeToFile(`Testing HEAD request to: ${testUrl}`);

fetch(testUrl, { method: 'HEAD' })
  .then(response => {
    writeToFile(`HEAD Response Status: ${response.status}`);
    writeToFile(`HEAD Response Status Text: ${response.statusText}`);
    writeToFile(`HEAD Response Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);
    writeToFile(`HEAD Response OK: ${response.ok}`);

    if (!response.ok) {
      writeToFile('HEAD request failed - this is the source of the error!', 'ERROR');
    } else {
      writeToFile('HEAD request succeeded');
    }
  })
  .catch(error => {
    writeToFile(`HEAD request failed with error: ${error.message}`, 'ERROR');
    writeToFile(`Error name: ${error.name}`, 'ERROR');
    writeToFile(`Error stack: ${error.stack}`, 'ERROR');
  })
  .finally(() => {
    writeToFile('=== AUDIO DEBUG LOGS COMPLETED ===');
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });