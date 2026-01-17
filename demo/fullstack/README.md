# Fullstack Demo (initial scaffolding)

This branch contains an initial fullstack demo that pairs the existing `hello-world` backend with a minimal static frontend.

Quick start (dev):

1. Start backend: `node server/hello-world/index.js` (listens on port 8080)
2. Start frontend: `npx http-server demo/fullstack/public -p 8081`
3. Open: http://localhost:8081 to view the demo which fetches from the backend.

This is intentionally minimal; next steps: add a proxy, CI deploy, and Cloud Run deployment for both services without changing `demo/hello-world` branch.
