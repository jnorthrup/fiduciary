# GitHub Pages Deployment

This repository is configured to deploy documentation to GitHub Pages using the `/docs` directory.

## Setup

The deployment setup includes:

1. **Documentation Directory**: `/docs` - Contains the static HTML documentation
2. **Express Server**: `/server-static` - Express.js server for local development
3. **Deployment Scripts**: `/scripts/deploy-gh-pages.js` - Automated deployment script
4. **Symlink Configuration**: Self-referential symlink for gh-pages compatibility

## Local Development

To run the documentation site locally:

```bash
cd server-static
npm install
npm start
```

The site will be available at http://localhost:3000

## Testing

Run the deployment setup tests:

```bash
npm run test:gh-pages
```

This validates:
- Documentation directory structure
- Required files exist
- Symlink configuration
- Express server configuration
- Git and GitHub setup

## Deployment

Deploy documentation to GitHub Pages:

```bash
npm run deploy:docs
```

For force deployment (if gh-pages branch already exists):

```bash
npm run deploy:docs:force
```

Or from the server-static directory:

```bash
cd server-static
npm run deploy
```

## What Gets Deployed

The deployment script:
1. Validates the docs directory structure
2. Creates a symlink at `docs/docs` pointing to `.` (for path compatibility)
3. Deploys the contents of `/docs` to the `gh-pages` branch
4. The `gh-pages` branch will be served at `https://<username>.github.io/<repository>/`

## Symlink Structure

The deployment creates a symlink structure:
- `docs/docs` → `.` (self-referential)

This ensures proper path resolution when GitHub Pages serves the content.

## Files

### Required Files in `/docs`:
- `index.html` - Main documentation page
- `styles.css` - Stylesheet
- `.nojekyll` - Prevents Jekyll processing (allows symlinks and underscores)
- `README.md` - Documentation README

### Configuration Files:
- `scripts/deploy-gh-pages.js` - Main deployment script
- `scripts/test-gh-pages-setup.js` - Test script for deployment setup

## Troubleshooting

### Deployment Fails

1. **Check Git Remote**: Ensure you have a GitHub remote configured
   ```bash
   git remote -v
   ```

2. **Check Permissions**: Ensure you have push permissions to the repository

3. **Force Deploy**: Try using the force flag
   ```bash
   npm run deploy:docs:force
   ```

### Symlink Issues

If symlinks don't work on GitHub Pages:
- Ensure `.nojekyll` file exists in `/docs`
- Check that the symlink was created during deployment
- GitHub Pages supports symlinks when `.nojekyll` is present

### Local Server Issues

If the Express server doesn't start:
1. Check that Node.js is installed: `node --version`
2. Install dependencies: `cd server-static && npm install`
3. Check port 3000 is available: `lsof -i :3000` (macOS/Linux)

## GitHub Pages Settings

After first deployment:

1. Go to repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: `gh-pages` / `root`
4. Click Save

Your documentation will be available at:
```
https://<username>.github.io/<repository>/
```

## Automation

For CI/CD integration, the deployment can be automated:

```yaml
# Example GitHub Actions workflow
- name: Deploy to GitHub Pages
  run: npm run deploy:docs
```

See `.github/workflows/` for workflow examples (if configured).
