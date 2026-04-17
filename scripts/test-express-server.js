#!/usr/bin/env node

/**
 * Integration test for Express server serving docs
 * 
 * This test verifies that the Express server can:
 * 1. Start successfully
 * 2. Serve the documentation
 * 3. Handle static files
 * 4. Handle SPA routing
 */

import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);
const serverStaticDir = path.join(rootDir, 'server-static');
const PORT = 3001; // Use different port to avoid conflicts

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

let serverProcess = null;
let testPassed = true;
let testFailed = false;

function assert(condition, message) {
  if (condition) {
    success(message);
  } else {
    error(message);
    testFailed = true;
    testPassed = false;
  }
}

// Cleanup function
async function cleanup() {
  if (serverProcess) {
    info('Stopping server...');
    serverProcess.kill('SIGTERM');
    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 1000));
    serverProcess.kill('SIGKILL');
    serverProcess = null;
  }
}

// Make a simple HTTP request
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// Wait for server to be ready
async function waitForServer(maxAttempts = 30, delay = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await makeRequest('/');
      return true;
    } catch (err) {
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error('Server failed to start');
}

// Main test function
async function runTests() {
  log('\n=== Express Server Integration Tests ===', 'blue');
  log('='.repeat(60), 'blue');

  try {
    // Test 1: Check server file exists
    log('\nTest 1: Server File Check', 'blue');
    const serverFile = path.join(serverStaticDir, 'server.js');
    const packageFile = path.join(serverStaticDir, 'package.json');
    
    assert(fs.existsSync(serverFile), 'server.js exists');
    assert(fs.existsSync(packageFile), 'package.json exists');

    // Test 2: Start server
    log('\nTest 2: Starting Server', 'blue');
    info(`Starting server on port ${PORT}...`);
    
    serverProcess = spawn('node', ['server.js'], {
      cwd: serverStaticDir,
      env: { ...process.env, PORT: PORT.toString() },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverOutput = '';
    serverProcess.stdout.on('data', (data) => {
      serverOutput += data.toString();
    });
    serverProcess.stderr.on('data', (data) => {
      serverOutput += data.toString();
    });

    // Wait for server to start
    try {
      await waitForServer();
      success(`Server started successfully on port ${PORT}`);
    } catch (err) {
      error(`Server failed to start: ${err.message}`);
      if (serverOutput) {
        info('Server output:');
        console.log(serverOutput);
      }
      throw err;
    }

    // Test 3: Serve index.html
    log('\nTest 3: Serving Index Page', 'blue');
    try {
      const response = await makeRequest('/');
      assert(response.statusCode === 200, 'Index page returns 200');
      assert(response.body.includes('<!DOCTYPE html>'), 'Response is HTML');
      assert(response.body.includes('Fiduciary'), 'Response contains expected content');
      assert(
        response.headers['content-type'] && response.headers['content-type'].includes('text/html'),
        'Content-Type is text/html'
      );
    } catch (err) {
      error(`Failed to fetch index page: ${err.message}`);
      throw err;
    }

    // Test 4: Serve static CSS
    log('\nTest 4: Serving Static Files', 'blue');
    try {
      const response = await makeRequest('/styles.css');
      assert(response.statusCode === 200, 'CSS file returns 200');
      assert(response.body.includes('css') || response.body.length > 0, 'CSS file has content');
      assert(
        response.headers['content-type'] && response.headers['content-type'].includes('text/css'),
        'Content-Type is text/css'
      );
    } catch (err) {
      error(`Failed to fetch CSS: ${err.message}`);
      throw err;
    }

    // Test 5: SPA fallback (non-existent route)
    log('\nTest 5: SPA Fallback', 'blue');
    try {
      const response = await makeRequest('/non-existent-route');
      assert(response.statusCode === 200, 'Non-existent route falls back to index');
      assert(response.body.includes('<!DOCTYPE html>'), 'Fallback serves HTML');
    } catch (err) {
      error(`SPA fallback failed: ${err.message}`);
      throw err;
    }

    // Test 6: Security headers
    log('\nTest 6: Security Headers', 'blue');
    try {
      const response = await makeRequest('/');
      assert(
        response.headers['x-content-type-options'] === 'nosniff',
        'X-Content-Type-Options header present'
      );
      assert(
        response.headers['x-frame-options'] === 'DENY',
        'X-Frame-Options header present'
      );
    } catch (err) {
      error(`Security headers check failed: ${err.message}`);
    }

    // Test 7: Cache control
    log('\nTest 7: Cache Control', 'blue');
    try {
      const htmlResponse = await makeRequest('/');
      assert(
        htmlResponse.headers['cache-control'],
        'Cache-Control header present for HTML'
      );
      
      const cssResponse = await makeRequest('/styles.css');
      assert(
        cssResponse.headers['cache-control'],
        'Cache-Control header present for CSS'
      );
    } catch (err) {
      error(`Cache control check failed: ${err.message}`);
    }

  } catch (err) {
    error(`Test execution error: ${err.message}`);
    testFailed = true;
    testPassed = false;
  } finally {
    await cleanup();
  }

  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log('Test Summary', 'blue');
  log('='.repeat(60), 'blue');

  if (testPassed && !testFailed) {
    log('\n✓ All integration tests passed!', 'green');
    log('\nThe Express server is correctly configured to serve documentation.', 'green');
    process.exit(0);
  } else {
    log('\n✗ Some integration tests failed!', 'red');
    log('\nPlease fix the issues above.', 'yellow');
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  error(`Fatal error: ${err.message}`);
  cleanup();
  process.exit(1);
});

// Handle cleanup on exit
process.on('SIGINT', async () => {
  info('\nReceived SIGINT, cleaning up...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  info('\nReceived SIGTERM, cleaning up...');
  await cleanup();
  process.exit(0);
});
