IRIS proxy (local dev)

This small Express server provides:
- /health - basic health check
- POST /api/iris/auth - perform server-side JWT signing + token exchange (or return mock token if IRIS_MOCK_MODE=1)
- POST /api/iris/submit - proxy submissions to IRIS

Run locally:
- copy `.env.example` to `.env` and set real values or use `IRIS_MOCK_MODE=1` for development
- `npm install` (adds dependencies)
- `node server/iris-proxy.js` or `IRIS_MOCK_MODE=1 IRIS_API_KEY=devkey node server/iris-proxy.js`

In Vite dev, set `x-api-key` header to `IRIS_API_KEY` if configured.