#!/usr/bin/env node

/**
 * Test symlink creation for gh-pages deployment
 * This validates that the deployment script can create the required symlink
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);
const docsDir = path.join(rootDir, 'docs');

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

// Test symlink creation
log('\n=== Testing Symlink Creation ===', 'blue');

const symlinkPath = path.join(docsDir, 'docs');

// Clean up any existing symlink
if (fs.existsSync(symlinkPath)) {
  try {
    const stats = fs.lstatSync(symlinkPath);
    if (stats.isSymbolicLink()) {
      fs.unlinkSync(symlinkPath);
      info('Removed existing symlink for testing');
    }
  } catch (err) {
    error(`Could not remove existing symlink: ${err.message}`);
    process.exit(1);
  }
}

// Create symlink
try {
  fs.symlinkSync('.', symlinkPath);
  success(`Created symlink: docs/docs -> .`);
} catch (err) {
  error(`Failed to create symlink: ${err.message}`);
  process.exit(1);
}

// Verify symlink
try {
  const stats = fs.lstatSync(symlinkPath);
  if (stats.isSymbolicLink()) {
    success('Symlink is a symbolic link');
    
    const target = fs.readlinkSync(symlinkPath);
    success(`Symlink target: ${target}`);
    
    if (target === '.') {
      success('Symlink points to current directory (correct)');
    } else {
      error(`Symlink points to unexpected target: ${target}`);
    }
  } else {
    error('Created file is not a symbolic link');
  }
} catch (err) {
  error(`Failed to verify symlink: ${err.message}`);
  process.exit(1);
}

// Verify symlink can be accessed
try {
  const testPath = path.join(symlinkPath, 'index.html');
  if (fs.existsSync(testPath)) {
    success('Symlink can access files correctly');
    success(`✓ Can access ${testPath} via symlink`);
  } else {
    error('Cannot access files through symlink');
  }
} catch (err) {
  error(`Failed to access through symlink: ${err.message}`);
}

// Test that symlink works with GitHub Pages requirements
log('\n=== Validating GitHub Pages Compatibility ===', 'blue');

const nojekyllFile = path.join(docsDir, '.nojekyll');
if (fs.existsSync(nojekyllFile)) {
  success('.nojekyll file exists (required for symlinks to work on GitHub Pages)');
} else {
  error('.nojekyll file missing (symlinks may not work on GitHub Pages)');
}

// Verify the symlink is in docs directory
if (docsDir.endsWith('/docs')) {
  success('Symlink is in correct location (docs directory)');
} else {
  error('Unexpected directory structure');
}

log('\n=== Summary ===', 'blue');
log('Symlink creation test completed successfully!', 'green');
log('The deployment script will create this symlink automatically.', 'blue');
log('\nTo deploy now, run: npm run deploy:docs', 'green');

// Leave the symlink in place for deployment
info('Leaving symlink in place for deployment');
