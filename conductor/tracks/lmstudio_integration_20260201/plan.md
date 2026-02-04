# Implementation Plan: LM Studio Integration

**Track:** lmstudio_integration_20260201
**Total Phases:** 6
**Estimated Tasks:** 33

---

## Phase 1: Server Setup & Documentation

**Goal:** Make it easy to start and use LM Studio server

### Tasks

- [ ] **1.1** Create `scripts/lmstudio-start.sh` with:
  - Check if LM Studio is running
  - Start LM Studio app if not running (macOS `open` command)
  - Wait for server to be ready (health check)
  - Display server URL and port
  - Instructions for loading a model
- [ ] **1.2** Create `docs/lmstudio-setup.md` with:
  - Installation guide (if not installed)
  - Server startup instructions
  - Model selection guide (which models for which tasks)
  - API compatibility notes
  - Troubleshooting section
- [ ] **1.3** Add LM Studio section to main README.md
- [ ] **1.4** Create model recommendation table in docs
- [ ] **1.5** Test server startup script on macOS

**Verification:**
- Can start LM Studio server with one command
- Documentation is clear and complete
- New users can get set up in <5 minutes

---

## Phase 2: Client Integration

**Goal:** Create TypeScript client for LM Studio API

### Tasks

- [ ] **2.1** Create `src/llm/LMStudioClient.ts` class
- [ ] **2.2** Implement constructor with baseURL config (default: `http://localhost:1234/v1`)
- [ ] **2.3** Implement `createChatCompletion()` method (non-streaming)
- [ ] **2.4** Implement `createChatCompletionStream()` method (streaming)
- [ ] **2.5** Add error handling for:
  - Server not running (ECONNREFUSED)
  - Invalid model name
  - Timeout handling
- [ ] **2.6** Make client compatible with OpenAI client interface (duck typing)
- [ ] **2.7** Add TypeScript types for requests/responses
- [ ] **2.8** Write unit tests for client (mock HTTP calls)
- [ ] **2.9** Write integration tests (requires LM Studio running)

**Verification:**
- Can call LM Studio API from TypeScript
- Error handling works for offline server
- Compatible with existing OpenAI integration code
- Unit and integration tests pass

---

## Phase 3: Configuration

**Goal:** Make LM Studio configurable with fallback options

### Tasks

- [ ] **3.1** Add to `.env.example`:
  ```
  LMSTUDIO_BASE_URL=http://localhost:1234/v1
  LMSTUDIO_MODEL=local-model
  LLM_PROVIDER=lmstudio
  LLM_FALLBACK=openai
  ```
- [ ] **3.2** Create `src/config/models.ts` with:
  - Provider selection logic (lmstudio, openai, gemini, claude)
  - Fallback chain implementation
  - Model capability detection
  - Configuration loading from env
- [ ] **3.3** Implement `getLLMClient()` factory function:
  - Returns appropriate client based on LLM_PROVIDER
  - Falls back to next provider if current fails
  - Logs fallbacks for debugging
- [ ] **3.4** Add `getModelCapabilities(model)` function:
  - Returns which features a model supports
  - Supports: chat, streaming, function-calling, vision
- [ ] **3.5** Update config documentation with new env vars
- [ ] **3.6** Test fallback chain (LM Studio down → use OpenAI)
- [ ] **3.7** Test provider switching via env var

**Verification:**
- Can configure LM Studio via environment variables
- Fallback chain works correctly
- Provider selection logic tested
- Documentation updated

---

## Phase 4: Conductor Integration

**Goal:** Use local models for Conductor workflow tasks

### Tasks

- [ ] **4.1** Read Conductor skill file to understand workflow
- [ ] **4.2** Add "generate code" task type to Conductor workflow
  - Use local model for code generation
  - Follow TDD pattern: generate test first, then implementation
- [ ] **4.3** Add "generate tests" task type to Conductor workflow
  - Use local model for test generation
  - Generate unit tests based on code/spec
- [ ] **4.4** Add "generate documentation" task type
  - Use local model for doc generation
  - Generate from code + spec
- [ ] **4.5** Add "code review" task type
  - Use local model for code review
  - Suggest refactors, improvements
- [ ] **4.6** Track model usage per task in metadata
- [ ] **4.7** Add model selection per task type:
  - Code generation → code-specialized model
  - Test generation → reasoning model
  - Documentation → larger model
  - Code review → fast model (for quick iterations)
- [ ] **4.8** Update Conductor skill documentation
- [ ] **4.9** Test Conductor workflow with local models

**Verification:**
- Can generate code using local model in Conductor
- Can generate tests using local model in Conductor
- Can generate docs using local model in Conductor
- Each task type uses appropriate model
- Workflow integrates seamlessly

---

## Phase 5: Developer Tools

**Goal:** Create convenient tools for using local models

### Tasks

- [ ] **5.1** Add npm scripts to `package.json`:
  ```json
  "llm:local": "tsx src/cli/llm-local.ts",
  "codegen:local": "tsx src/cli/codegen.ts",
  "testgen:local": "tsx src/cli/testgen.ts",
  "docs:local": "tsx src/cli/docs.ts"
  ```
- [ ] **5.2** Create `src/cli/llm-local.ts` CLI tool:
  - Accepts prompt as argument or stdin
  - Calls LM Studio API
  - Streams response to stdout
  - Exit codes for errors
- [ ] **5.3** Create `src/cli/codegen.ts`:
  - Generates code from prompt
  - Outputs to file or stdout
  - Supports multiple languages
- [ ] **5.4** Create `src/cli/testgen.ts`:
  - Generates tests from code file
  - Outputs to file or stdout
  - Supports test framework detection
- [ ] **5.5** Create `src/cli/docs.ts`:
  - Generates documentation from code
  - Outputs to file or stdout
  - Supports JSDoc/TSDoc formats
- [ ] **5.6** Create `.vscode/tasks.json` for LM Studio tasks:
  - Start LM Studio server
  - Generate code for selection
  - Generate tests for file
  - Generate docs for project
- [ ] **5.7** Add keyboard shortcuts to VS Code keybindings.json
- [ ] **5.8** Test all CLI tools manually
- [ ] **5.9** Create usage examples in docs

**Verification:**
- All npm scripts work correctly
- CLI tools accept arguments and stdin
- VS Code tasks launch successfully
- Usage examples tested and working

---

## Phase 6: Testing & Performance

**Goal:** Ensure integration works and measure performance

### Tasks

- [ ] **6.1** Integration test: Generate code with local model
  - Prompt: "Create a TypeScript function for X"
  - Verify output compiles
  - Verify code quality
- [ ] **6.2** Integration test: Generate tests with local model
  - Input: Code file
  - Verify tests are valid
  - Verify tests run and pass (for simple code)
- [ ] **6.3** Integration test: Generate docs with local model
  - Input: Code file
  - Verify output format
  - Verify documentation completeness
- [ ] **6.4** Test error handling: Server not running
  - Ensure clear error message
  - Verify fallback works (if configured)
  - Verify no crashes
- [ ] **6.5** Test fallback chain:
  - LM Studio down → try OpenAI
  - OpenAI fails → try Gemini
  - All fail → return error
- [ ] **6.6** Performance benchmarks:
  - Measure latency for code generation (10 runs)
  - Measure latency for test generation (10 runs)
  - Measure latency for doc generation (10 runs)
  - Compare against cloud APIs (if available)
  - Document results in README
- [ ] **6.7** Memory usage testing:
  - Monitor memory during long generations
  - Verify no leaks
- [ ] **6.8** Concurrent request testing:
  - Test multiple simultaneous requests
  - Verify server handles load

**Verification:**
- All integration tests pass
- Error handling works correctly
- Fallback chain works as expected
- Performance benchmarks meet targets (<5s for typical prompts)
- No memory leaks detected
- Server handles concurrent requests

---

## Task Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| 1. Server Setup & Docs | 5 | `[ ]` |
| 2. Client Integration | 9 | `[ ]` |
| 3. Configuration | 7 | `[ ]` |
| 4. Conductor Integration | 9 | `[ ]` |
| 5. Developer Tools | 9 | `[ ]` |
| 6. Testing & Performance | 8 | `[ ]` |
| **Total** | **47** | **[ ]` |

---

## Progress Tracking

**Current Phase:** Phase 1 - Server Setup & Documentation
**Current Task:** [ ] 1.1 - Create startup script
**Overall Progress:** 0/47 tasks (0%)

**Next Milestone:** Phase 1 complete (5/5 tasks) → Begin Phase 2

---

## Dependencies

- LM Studio application installed
- At least one model downloaded
- Node.js project dependencies installed
- TypeScript configured

---

## Blocked By

None - can start immediately

---

## Blocking

- Track: `kotlin_node_fusion_20260201` (can use local models for implementation)
- Future tracks that need code/test/doc generation
