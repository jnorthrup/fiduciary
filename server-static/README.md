# Fiduciary Static Site Server

Express-based static site server for serving Fiduciary documentation.

## Features

- Serves static documentation from `docs/` folder
- Cache control headers (no-cache for HTML, 1-year for hashed assets)
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Gzip compression
- SPA fallback for client-side routing
- Simple, fast, and production-ready

## Installation

```bash
cd server-static
npm install
```

## Usage

Start the server:
```bash
npm start
```

Run in development mode with auto-reload:
```bash
npm run dev
```

The server will start at `http://localhost:3000`

## Running Tests

```bash
# Terminal 1: Start the server
npm start

# Terminal 2: Run tests
npm test
```

## Configuration

Environment variables:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

## Deployment

The server can be deployed to:
- Google Cloud Functions
- Google Cloud Run
- Any Node.js hosting service

Example Cloud Run deployment:
```bash
gcloud run deploy fiduciary-docs \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Cache Strategy

- **HTML files**: `no-cache, must-revalidate` (always fresh)
- **Hashed assets** (e.g., `app.abc123.js`): `max-age=31536000, immutable` (1 year)
- **Other static files**: `max-age=86400` (1 day)

This mirrors the `clearflow.app` caching behavior for optimal performance.
