---
description: Validate API Implementation against OpenAPI Spec
---

Steps to validate the API implementation:

1. **Install Dependencies** (if not already installed):
   ```bash
   npm install express-openapi-validator
   ```

2. **Mount Middleware**:
   Ensure `server/lib/validation-middleware.js` is updated to use the real validator and mounted in `server/index.js`.

3. **Run Dredd (Contract Testing)**:
   ```bash
   npx dredd docs/openapi/las-trust-api-spec.yaml http://localhost:3001
   ```
   *Note: Ensure the server is running on port 3001.*

4. **Verify TypeScript Types**:
   Regenerate types if the spec changes:
   ```bash
   npx openapi-typescript docs/openapi/las-trust-api-spec.yaml -o types/openapi.ts
   ```
