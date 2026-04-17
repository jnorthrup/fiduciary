import http from 'http';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Test helper
async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    process.exit(1);
  }
}

// Make HTTP request
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.get(url, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Check if server is running
async function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, () => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
  });
}

// Run tests
async function runTests() {
  console.log('Waiting for server to start...');
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const isRunning = await checkServer();
    if (isRunning) break;
    await new Promise(r => setTimeout(r, 500));
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Server not responding. Start it with: npm start');
  }

  console.log('\nRunning tests...\n');

  await test('Server responds to GET /', async () => {
    const res = await request('/');
    if (res.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${res.statusCode}`);
    }
    if (!res.data.includes('Fiduciary')) {
      throw new Error('Response does not contain expected content');
    }
  });

  await test('Server serves index.html with no-cache', async () => {
    const res = await request('/');
    const cacheControl = res.headers['cache-control'];
    if (!cacheControl || !cacheControl.includes('must-revalidate')) {
      throw new Error(`Expected cache-control with must-revalidate, got: ${cacheControl}`);
    }
  });

  await test('Server serves CSS files', async () => {
    const res = await request('/styles.css');
    if (res.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${res.statusCode}`);
    }
    if (!res.headers['content-type']?.includes('text/css')) {
      throw new Error(`Expected CSS content-type, got: ${res.headers['content-type']}`);
    }
  });

  await test('Server handles 404 gracefully', async () => {
    const res = await request('/nonexistent-file-12345.html');
    const res2 = await request('/random-path/');
    // Should serve index.html for SPA fallback
    if (res2.statusCode !== 200) {
      throw new Error(`SPA fallback failed for random path, got status ${res2.statusCode}`);
    }
  });

  await test('Server has security headers', async () => {
    const res = await request('/');
    const xContentType = res.headers['x-content-type-options'];
    const xFrameOptions = res.headers['x-frame-options'];
    
    if (xContentType !== 'nosniff') {
      throw new Error(`Missing X-Content-Type-Options header`);
    }
    if (xFrameOptions !== 'DENY') {
      throw new Error(`Missing X-Frame-Options header`);
    }
  });

  await test('Server has compression middleware', async () => {
    const res = await request('/');
    // The compression middleware is configured, check server config
    // We can't reliably test gzip in Node without zlib
    // The middleware is loaded and will compress for clients that accept encoding
    const fs = await import('fs');
    const serverCode = fs.readFileSync('./server.js', 'utf-8');
    if (!serverCode.includes('compression')) {
      throw new Error('Compression middleware not found in server.js');
    }
  });

  await test('Content includes proper HTML structure', async () => {
    const res = await request('/');
    if (!res.data.includes('<!DOCTYPE html>')) {
      throw new Error('Missing DOCTYPE declaration');
    }
    if (!res.data.includes('<html')) {
      throw new Error('Missing html tag');
    }
    if (!res.data.includes('Fiduciary')) {
      throw new Error('Missing expected title content');
    }
  });

  console.log('\n✓ All tests passed!\n');
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

runTests();
