#!/usr/bin/env node

/**
 * Quick validation script for gh-pages setup
 * Runs without starting server
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

let allPassed = true;

// Test 1: Check package.json has gh-pages
log('\n=== Validating gh-pages setup ===', 'blue');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
if (packageJson.devDependencies?.['gh-pages']) {
  log('✓ gh-pages installed', 'green');
} else {
  log('✗ gh-pages not in devDependencies', 'red');
  allPassed = false;
}

if (packageJson.scripts?.['deploy:docs']) {
  log('✓ deploy:docs script exists', 'green');
} else {
  log('✗ deploy:docs script missing', 'red');
  allPassed = false;
}

// Test 2: Check docs directory
log('\n=== Validating docs directory ===', 'blue');
const docsDir = path.join(rootDir, 'docs');
if (fs.existsSync(docsDir) && fs.statSync(docsDir).isDirectory()) {
  log('✓ docs directory exists', 'green');
  
  // Check for index.html
  const indexHtml = path.join(docsDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    log('✓ index.html exists', 'green');
  } else {
    log('✗ index.html missing', 'red');
    allPassed = false;
  }
  
  // Check for .nojekyll
  const nojekyll = path.join(docsDir, '.nojekyll');
  if (fs.existsSync(nojekyll)) {
    log('✓ .nojekyll exists', 'green');
  } else {
    log('✗ .nojekyll missing', 'red');
    allPassed = false;
  }
} else {
  log('✗ docs directory missing', 'red');
  allPassed = false;
}

// Test 3: Check deployment scripts
log('\n=== Validating deployment scripts ===', 'blue');
const deployScript = path.join(rootDir, 'scripts', 'deploy-gh-pages.js');
const testScript = path.join(rootDir, 'scripts', 'test-gh-pages-setup.js');

if (fs.existsSync(deployScript)) {
  log('✓ Deployment script exists', 'green');
} else {
  log('✗ Deployment script missing', 'red');
  allPassed = false;
}

if (fs.existsSync(testScript)) {
  log('✓ Test script exists', 'green');
} else {
  log('✗ Test script missing', 'red');
  allPassed = false;
}

// Test 4: Check git repository
log('\n=== Validating git setup ===', 'blue');
const gitDir = path.join(rootDir, '.git');
if (fs.existsSync(gitDir)) {
  log('✓ Git repository initialized', 'green');
  
  // Check for remote
  const gitResult = spawnSync('git', ['remote', '-v'], {
    cwd: rootDir,
    encoding: 'utf-8'
  });
  
  if (gitResult.stdout.includes('github')) {
    log('✓ GitHub remote configured', 'green');
  } else {
    log('⚠ No GitHub remote found', 'blue');
  }
} else {
  log('✗ Not a git repository', 'red');
  allPassed = false;
}

// Summary
log('\n' + '='.repeat(50), 'blue');
if (allPassed) {
  log('✓ All validations passed!', 'green');
  log('\nReady to deploy with: npm run deploy:docs', 'blue');
  process.exit(0);
} else {
  log('✗ Some validations failed', 'red');
  process.exit(1);
}
