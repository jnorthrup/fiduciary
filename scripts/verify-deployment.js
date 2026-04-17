#!/usr/bin/env node

/**
 * Post-deployment verification script
 * Run this after deploying to verify the gh-pages branch is correct
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

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

function exec(command, description) {
  log(`\n${description}...`, 'blue');
  try {
    const output = execSync(command, {
      cwd: rootDir,
      encoding: 'utf-8'
    });
    return output.trim();
  } catch (error) {
    return null;
  }
}

log('\n=== Post-Deployment Verification ===', 'blue');
log('='.repeat(60), 'blue');

// Check if gh-pages branch exists
log('\nChecking gh-pages branch...', 'blue');
const branches = exec('git branch -a', 'Listing branches');
if (branches && branches.includes('gh-pages')) {
  log('✓ gh-pages branch exists locally', 'green');
} else if (branches && branches.includes('remotes/origin/gh-pages')) {
  log('✓ gh-pages branch exists on remote', 'green');
} else {
  log('⚠ gh-pages branch not found', 'yellow');
  log('This is normal if you haven\'t deployed yet', 'yellow');
  log('Run: npm run deploy:docs', 'blue');
  process.exit(0);
}

// Check latest commit on gh-pages
const latestCommit = exec('git log gh-pages -1 --oneline', 'Getting latest commit');
if (latestCommit) {
  log(`✓ Latest commit on gh-pages: ${latestCommit}`, 'green');
}

// Check files in gh-pages branch
log('\nChecking files in gh-pages branch...', 'blue');
const files = exec('git ls-tree -r --name-only gh-pages', 'Listing files');
if (files) {
  const fileList = files.split('\n');
  log(`✓ Found ${fileList.length} files in gh-pages branch`, 'green');
  
  // Check for required files
  const requiredFiles = ['.nojekyll', 'index.html', 'styles.css'];
  for (const file of requiredFiles) {
    if (fileList.includes(file)) {
      log(`✓ Required file present: ${file}`, 'green');
    } else {
      log(`✗ Missing required file: ${file}`, 'red');
    }
  }
  
  // Check for symlink
  if (fileList.includes('docs')) {
    log('✓ Symlink present in gh-pages branch', 'green');
  } else {
    log('⚠ Symlink not found in gh-pages branch', 'yellow');
  }
}

// Check if gh-pages branch is ahead of main
log('\nChecking branch status...', 'blue');
const revCount = exec('git rev-list --count gh-pages', 'Counting commits on gh-pages');
if (revCount) {
  log(`✓ gh-pages branch has ${revCount} commits`, 'green');
}

// Get remote URL
const remoteUrl = exec('git config --get remote.origin.url', 'Getting remote URL');
if (remoteUrl) {
  log(`\n✓ Remote: ${remoteUrl}`, 'green');
  
  // Extract repo info
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (match) {
    const username = match[1];
    const repo = match[2];
    const ghPagesUrl = `https://${username}.github.io/${repo}/`;
    log(`\n🚀 Your documentation should be available at:`, 'blue');
    log(`   ${ghPagesUrl}`, 'green');
  }
}

log('\n' + '='.repeat(60), 'green');
log('✓ Verification complete!', 'green');
log('='.repeat(60), 'green');

log('\nNext steps:', 'blue');
log('1. Enable GitHub Pages in repository settings', 'yellow');
log('2. Set source to: gh-pages branch, root directory', 'yellow');
log('3. Visit your GitHub Pages URL', 'yellow');
log('4. Allow a few minutes for GitHub to process the deployment', 'yellow');
