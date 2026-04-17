#!/usr/bin/env node

/**
 * Test script for GitHub Pages deployment
 * 
 * This script validates:
 * 1. Documentation directory structure
 * 2. Required files exist
 * 3. Symlink configuration
 * 4. Express server can serve the docs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);
const docsDir = path.join(rootDir, 'docs');
const serverStaticDir = path.join(rootDir, 'server-static');

// ANSI color codes
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

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

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

// Test 1: Check docs directory exists
log('\n=== Test 1: Documentation Directory ===', 'blue');
assert(fs.existsSync(docsDir), 'docs directory exists');
assert(fs.statSync(docsDir).isDirectory(), 'docs is a directory');

// Test 2: Check required files
log('\n=== Test 2: Required Files ===', 'blue');
const requiredFiles = [
  { name: 'index.html', canBeEmpty: false },
  { name: 'styles.css', canBeEmpty: false },
  { name: '.nojekyll', canBeEmpty: true },  // .nojekyll is just a marker, can be empty
  { name: 'README.md', canBeEmpty: false }
];

for (const fileConfig of requiredFiles) {
  const file = fileConfig.name;
  const filePath = path.join(docsDir, file);
  assert(
    fs.existsSync(filePath),
    `Required file exists: ${file}`
  );
  
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    assert(stats.isFile(), `${file} is a file`);
    if (!fileConfig.canBeEmpty) {
      assert(stats.size > 0, `${file} is not empty`);
    } else {
      success(`${file} exists (can be empty)`);
    }
  }
}

// Test 3: Check documentation subdirectories
log('\n=== Test 3: Documentation Structure ===', 'blue');
const subdirs = ['api', 'architecture', 'user-guides', 'research'];
for (const dir of subdirs) {
  const dirPath = path.join(docsDir, dir);
  if (fs.existsSync(dirPath)) {
    success(`Subdirectory exists: ${dir}`);
  } else {
    warning(`Subdirectory missing: ${dir}`);
  }
}

// Test 4: Check index.html content
log('\n=== Test 4: Index HTML Content ===', 'blue');
const indexHtml = path.join(docsDir, 'index.html');
if (fs.existsSync(indexHtml)) {
  const content = fs.readFileSync(indexHtml, 'utf-8');
  assert(content.includes('<!DOCTYPE html>'), 'index.html has valid DOCTYPE');
  assert(content.includes('<title>'), 'index.html has title tag');
  assert(content.includes('Fiduciary'), 'index.html contains "Fiduciary"');
  assert(content.includes('styles.css'), 'index.html references styles.css');
}

// Test 5: Check .nojekyll file
log('\n=== Test 5: Jekyll Configuration ===', 'blue');
const nojekyllFile = path.join(docsDir, '.nojekyll');
if (fs.existsSync(nojekyllFile)) {
  success('.nojekyll file exists (prevents Jekyll processing)');
} else {
  error('.nojekyll file missing');
  testFailed = true;
  testPassed = false;
}

// Test 6: Check symlink configuration
log('\n=== Test 6: Symlink Configuration ===', 'blue');
const symlinkPath = path.join(docsDir, 'docs');
try {
  if (fs.existsSync(symlinkPath)) {
    const stats = fs.lstatSync(symlinkPath);
    assert(stats.isSymbolicLink(), 'docs/docs symlink is a symbolic link');
    
    if (stats.isSymbolicLink()) {
      const target = fs.readlinkSync(symlinkPath);
      assert(target === '.', 'symlink points to current directory');
      success(`Symlink target: ${target}`);
    }
  } else {
    warning('Symlink docs/docs not found (will be created during deployment)');
  }
} catch (err) {
  warning(`Could not verify symlink: ${err.message}`);
}

// Test 7: Check Express server configuration
log('\n=== Test 7: Express Server Configuration ===', 'blue');
const serverFile = path.join(serverStaticDir, 'server.js');
assert(fs.existsSync(serverFile), 'Express server file exists');
assert(fs.existsSync(path.join(serverStaticDir, 'package.json')), 'server-static package.json exists');

if (fs.existsSync(serverFile)) {
  const serverContent = fs.readFileSync(serverFile, 'utf-8');
  assert(serverContent.includes('express'), 'server.js uses express');
  assert(serverContent.includes('DOCS_PATH'), 'server.js defines DOCS_PATH');
  assert(serverContent.includes("../docs"), 'server.js references ../docs directory');
}

// Test 8: Check deployment script
log('\n=== Test 8: Deployment Script ===', 'blue');
const deployScript = path.join(rootDir, 'scripts', 'deploy-gh-pages.js');
assert(fs.existsSync(deployScript), 'Deployment script exists');
assert(fs.existsSync(path.join(rootDir, 'package.json')), 'Root package.json exists');

if (fs.existsSync(path.join(rootDir, 'package.json'))) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  assert(packageJson.scripts['deploy:docs'], 'deploy:docs script exists in package.json');
  assert(packageJson.devDependencies && packageJson.devDependencies['gh-pages'], 'gh-pages is in devDependencies');
}

// Test 9: Check git repository
log('\n=== Test 9: Git Configuration ===', 'blue');
assert(fs.existsSync(path.join(rootDir, '.git')), 'Git repository exists');

try {
  const remote = spawn('git', ['remote', '-v'], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'ignore']
  });
  
  let remoteOutput = '';
  remote.stdout.on('data', (data) => {
    remoteOutput += data.toString();
  });
  
  await new Promise((resolve) => {
    remote.on('close', (code) => {
      if (code === 0 && remoteOutput.includes('github')) {
        success('GitHub remote configured');
      } else {
        warning('GitHub remote not found or not configured');
      }
      resolve();
    });
  });
} catch (err) {
  warning('Could not verify git remote: ' + err.message);
}

// Test 10: File permissions
log('\n=== Test 10: File Permissions ===', 'blue');
try {
  const deployScriptStats = fs.statSync(deployScript);
  const isExecutable = !!(deployScriptStats.mode & parseInt('0100', 8));
  assert(isExecutable, 'Deployment script is executable');
} catch (err) {
  warning('Could not verify file permissions');
}

// Summary
log('\n' + '='.repeat(60), 'blue');
log('Test Summary', 'blue');
log('='.repeat(60), 'blue');

if (testPassed && !testFailed) {
  log('\n✓ All tests passed!', 'green');
  log('\nYour gh-pages deployment setup is ready!', 'green');
  log('\nTo deploy, run:', 'blue');
  log('  npm run deploy:docs', 'green');
  log('\nOr from server-static directory:', 'blue');
  log('  npm run deploy', 'green');
  process.exit(0);
} else {
  log('\n✗ Some tests failed!', 'red');
  log('\nPlease fix the issues above before deploying.', 'yellow');
  process.exit(1);
}
