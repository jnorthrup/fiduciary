import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DOCS_PATH = path.join(__dirname, '../docs');

// Middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Cache control for immutable assets (hashed files)
const cacheControlMiddleware = (req, res, next) => {
  if (req.path.match(/\.[a-f0-9]{8,}\.[a-z]+$/i)) {
    // Files with hash in name - cache for 1 year
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.path.endsWith('.html') || req.path === '/') {
    // HTML files - no cache
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  } else {
    // Other static files (css, js, images) - cache for 1 day
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
  next();
};

// Serve static files with cache control
app.use(cacheControlMiddleware);
app.use(express.static(DOCS_PATH, {
  index: 'index.html',
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// SPA fallback - serve index.html for all non-matching routes
app.get('*', (req, res) => {
  res.sendFile(path.join(DOCS_PATH, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Fiduciary documentation server running at http://localhost:${PORT}`);
  console.log(`Serving files from: ${DOCS_PATH}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  
  // Verify docs path exists
  try {
    const fs = await import('fs');
    if (fs.existsSync(DOCS_PATH)) {
      const files = fs.readdirSync(DOCS_PATH);
      console.log(`Found ${files.length} files in docs directory`);
    } else {
      console.error(`ERROR: Docs directory not found: ${DOCS_PATH}`);
    }
  } catch (err) {
    console.error(`Error checking docs directory: ${err.message}`);
  }
});

export default app;
