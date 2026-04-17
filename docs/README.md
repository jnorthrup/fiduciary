# Fiduciary Documentation Site

This is a static GitHub Pages site hosting the Fiduciary project documentation.

## Files Created

- `.nojekyll` - Tells GitHub Pages to bypass Jekyll processing
- `index.html` - Main documentation landing page
- `styles.css` - Professional styling with responsive design
- `test_site.py` - Automated test script to validate the site

## Structure

The site is organized into sections:
- **Overview** - Introduction to the Fiduciary system
- **Architecture** - System architecture documentation
- **API** - API reference and integration guides
- **User Guides** - Detailed user guides

## Deployment

To deploy to GitHub Pages using the automated deployment script:

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

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Manual Deployment

To deploy manually:

1. Ensure the repository settings have GitHub Pages enabled
2. Set the source to `gh-pages` branch (created by deployment script)
3. The site will be available at `https://<username>.github.io/<repo>/`

## Local Testing

### Quick Validation
```bash
npm run test:gh-pages
```

### Express Server (Recommended)
Run the full Express server locally:
```bash
cd server-static
npm install
npm start
```

Then open http://localhost:3000 in your browser.

### Simple HTTP Server
Or serve the site locally with any static file server:
```bash
python3 -m http.server 8000 --directory docs
```

Then open http://localhost:8000 in your browser.

### Python Test Script
Run the Python validation script:
```bash
python3 docs/test_site.py
```
