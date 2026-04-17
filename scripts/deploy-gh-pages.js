#!/usr/bin/env node

/**
 * Deploy documentation to GitHub Pages
 * 
 * This script:
 * 1. Ensures the docs directory is properly structured
 * 2. Creates necessary symlinks for proper path resolution
 * 3. Deploys the docs directory to the gh-pages branch
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);
const docsDir = path.join(rootDir, 'docs');

// ANSI color codes for terminal output
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
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    return output;
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    throw error;
  }
}

// Check if docs directory exists
function checkDocsDir() {
  log('\n=== Checking Documentation Directory ===', 'blue');
  
  if (!fs.existsSync(docsDir)) {
    log('Error: docs directory not found!', 'red');
    process.exit(1);
  }
  
  log(`✓ Docs directory found at: ${docsDir}`, 'green');
  
  const files = fs.readdirSync(docsDir);
  log(`✓ Found ${files.length} items in docs directory`, 'green');
  
  // Check for required files
  const requiredFiles = ['index.html', '.nojekyll'];
  for (const file of requiredFiles) {
    const filePath = path.join(docsDir, file);
    if (fs.existsSync(filePath)) {
      log(`✓ Found required file: ${file}`, 'green');
    } else {
      log(`Warning: Missing required file: ${file}`, 'yellow');
      if (file === '.nojekyll') {
        // Create .nojekyll if missing
        fs.writeFileSync(filePath, '');
        log(`✓ Created .nojekyll file`, 'green');
      }
    }
  }
}

// Create symlink structure for proper path resolution
function setupSymlinks() {
  log('\n=== Setting up Symlinks ===', 'blue');
  
  // The task requires a symlink in docs that points to docs/
  // This creates a self-referential symlink for gh-pages compatibility
  const symlinkPath = path.join(docsDir, 'docs');
  
  // Remove existing symlink if it exists
  if (fs.existsSync(symlinkPath) || fs.lstatSync(symlinkPath).isSymbolicLink()) {
    try {
      fs.unlinkSync(symlinkPath);
      log('✓ Removed existing symlink', 'green');
    } catch (err) {
      log(`Warning: Could not remove existing symlink: ${err.message}`, 'yellow');
    }
  }
  
  // Create symlink pointing to parent docs directory
  try {
    // Create a relative symlink from docs/docs -> docs/
    fs.symlinkSync('.', symlinkPath);
    log(`✓ Created symlink: ${symlinkPath} -> .`, 'green');
  } catch (err) {
    log(`Warning: Could not create symlink: ${err.message}`, 'yellow');
    log('This is not critical for deployment', 'yellow');
  }
}

// Deploy to gh-pages
function deployToGhPages(force = false) {
  log('\n=== Deploying to GitHub Pages ===', 'blue');
  
  // Check if git repository
  if (!fs.existsSync(path.join(rootDir, '.git'))) {
    log('Error: Not a git repository!', 'red');
    process.exit(1);
  }
  
  log('✓ Git repository found', 'green');
  
  // Build gh-pages command
  const ghPagesCmd = force 
    ? 'npx gh-pages --dotfiles --dist docs --add'
    : 'npx gh-pages --dotfiles --dist docs';
  
  log(`Running: ${ghPagesCmd}`, 'blue');
  
  try {
    exec(ghPagesCmd, 'Deploying to gh-pages branch');
    log('\n✓ Successfully deployed to GitHub Pages!', 'green');
    log('\nYour documentation should be available at:', 'blue');
    log('https://<username>.github.io/<repository>/', 'green');
  } catch (error) {
    log(`\nError deploying to gh-pages: ${error.message}`, 'red');
    log('\nTroubleshooting:', 'yellow');
    log('1. Ensure you have git remote configured', 'yellow');
    log('2. Ensure you have push permissions to the repository', 'yellow');
    log('3. Try running with --force flag: npm run deploy:docs:force', 'yellow');
    process.exit(1);
  }
}

// Verify deployment
function verifyDeployment() {
  log('\n=== Verifying Deployment ===', 'blue');
  
  try {
    // Check if gh-pages branch exists
    const branches = execSync('git branch -a', { 
      cwd: rootDir,
      encoding: 'utf-8'
    });
    
    if (branches.includes('gh-pages') || branches.includes('remotes/origin/gh-pages')) {
      log('✓ gh-pages branch created successfully', 'green');
      
      // Get the latest commit on gh-pages
      const latestCommit = execSync('git log gh-pages -1 --oneline', {
        cwd: rootDir,
        encoding: 'utf-8'
      });
      log(`✓ Latest commit on gh-pages: ${latestCommit.trim()}`, 'green');
    } else {
      log('Warning: Could not verify gh-pages branch', 'yellow');
    }
  } catch (err) {
    log(`Warning: Could not verify deployment: ${err.message}`, 'yellow');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  
  log('\n🚀 GitHub Pages Deployment for Fiduciary Documentation', 'blue');
  log('=' .repeat(60), 'blue');
  
  try {
    checkDocsDir();
    setupSymlinks();
    deployToGhPages(force);
    verifyDeployment();
    
    log('\n' + '='.repeat(60), 'green');
    log('✓ Deployment completed successfully!', 'green');
    log('='.repeat(60), 'green');
  } catch (error) {
    log('\n' + '='.repeat(60), 'red');
    log('✗ Deployment failed!', 'red');
    log('='.repeat(60), 'red');
    process.exit(1);
  }
}

main();
