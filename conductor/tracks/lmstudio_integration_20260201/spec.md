# Track: LM Studio Integration for Development

**Track ID:** lmstudio_integration_20260201
**Type:** Feature
**Created:** 2026-02-01
**Status:** Pending

---

## Overview

Integrate LM Studio (local model inference) into the software development workflow for the trust ledger system. This enables:

- **Privacy**: Code analysis stays local (no cloud API calls)
- **Cost**: No API fees for local inference
- **Speed**: Local models often faster than cloud APIs
- **Flexibility**: Use different models for different tasks

**Target Use Cases:**
- Code generation during Conductor implementation
- Test generation and coverage analysis
- Documentation generation
- Code review and refactoring suggestions
- Architecture decision assistance

---

## Functional Requirements

### 1. LM Studio Server Setup

- [ ] Document how to start LM Studio API server
- [ ] Default port: `1234` (LM Studio standard)
- [ ] API endpoint: `http://localhost:1234/v1/` (OpenAI-compatible)
- [ ] Create startup script: `scripts/lmstudio-start.sh`

### 2. Configuration Management

- [ ] Add `LMSTUDIO_BASE_URL` to `.env` configuration
- [ ] Create `src/config/models.ts` for provider selection logic
- [ ] Implement fallback chain: LM Studio → OpenAI → Gemini → Claude
- [ ] Add model capability detection (which models support which features)

### 3. Client Integration

- [ ] Create `src/llm/LMStudioClient.ts` (OpenAI-compatible API)
- [ ] Implement chat completion: `createChatCompletion()`
- [ ] Implement streaming support
- [ ] Implement function/tool calling (if model supports it)
- [ ] Add error handling for "server not running" case

### 4. Conductor Integration

- [ ] Update Conductor skill to use local models for planning
- [ ] Add "generate tests" task using local models
- [ ] Add "generate documentation" task using local models
- [ ] Add "code review" task using local models
- [ ] Make model provider configurable per-track

### 5. Development Workflow

- [ ] Create VS Code tasks for LM Studio operations
- [ ] Add npm scripts:
  - `npm run codegen:local` - Generate code with local model
  - `npm run testgen:local` - Generate tests with local model
  - `npm run docs:local` - Generate docs with local model
- [ ] Create CLI tool: `npm run llm:local "prompt here"`

---

## Non-Functional Requirements

### Performance
- Local model inference <5s for typical code generation prompts
- Streaming responses within 500ms of first token
- Graceful degradation if local model unavailable

### Compatibility
- OpenAI-compatible API (LM Studio standard)
- Support for function/tool calling (model-dependent)
- Compatible with existing OpenAI client code

### Usability
- Clear error messages if LM Studio not running
- Automatic fallback to cloud APIs (optional)
- Simple configuration (one env var)

---

## Acceptance Criteria

1. ✅ Can start LM Studio server with documented command
2. ✅ Can invoke local model via HTTP API
3. ✅ Client code compatible with existing OpenAI integration
4. ✅ Can generate code using local models
5. ✅ Can generate tests using local models
6. ✅ Can generate documentation using local models
7. ✅ Error handling works when server not running
8. ✅ Integration tests pass with LM Studio

---

## LM Studio Setup Guide

### Starting the Server

1. Open LM Studio application
2. Go to "Local Server" (left sidebar)
3. Click "Start Server"
4. Note the port (default: `1234`)
5. Server runs at: `http://localhost:1234`

### Loading a Model

1. In LM Studio, go to "AI" (left sidebar)
2. Search for or download a model:
   - **Code generation:** `codellama` or `deepseek-coder`
   - **General purpose:** `llama-3.1` or `mistral`
   - **Fast:** `phi-3` or `gemma-2`
3. Load the model (it appears in the Local Server dropdown)
4. Select CPU/GPU inference as needed

### API Compatibility

LM Studio provides an **OpenAI-compatible API**:

```bash
# List models
curl http://localhost:1234/v1/models

# Chat completion
curl http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "local-model",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

This means we can use OpenAI client libraries with just a base URL change!

---

## Implementation Plan

### Phase 1: Server Setup & Documentation
- [ ] 1.1 Create `scripts/lmstudio-start.sh` helper
- [ ] 1.2 Document server startup in README
- [ ] 1.3 Document model selection recommendations
- [ ] 1.4 Add troubleshooting section

### Phase 2: Client Integration
- [ ] 2.1 Create `src/llm/LMStudioClient.ts`
- [ ] 2.2 Implement chat completion (non-streaming)
- [ ] 2.3 Implement chat completion (streaming)
- [ ] 2.4 Add error handling for offline case
- [ ] 2.5 Write unit tests for client

### Phase 3: Configuration
- [ ] 3.1 Add `LMSTUDIO_BASE_URL` to `.env.example`
- [ ] 3.2 Create `src/config/models.ts` provider selector
- [ ] 3.3 Implement fallback chain logic
- [ ] 3.4 Add capability detection per model
- [ ] 3.5 Update config documentation

### Phase 4: Conductor Integration
- [ ] 4.1 Update Conductor skill for local model support
- [ ] 4.2 Add code generation task to workflow
- [ ] 4.3 Add test generation task to workflow
- [ ] 4.4 Add documentation task to workflow
- [ ] 4.5 Track model usage per task

### Phase 5: Developer Tools
- [ ] 5.1 Create npm scripts for common operations
- [ ] 5.2 Create VS Code tasks for LM Studio
- [ ] 5.3 Build CLI tool for local inference
- [ ] 5.4 Add interactive prompt mode
- [ ] 5.5 Write usage examples

### Phase 6: Testing
- [ ] 6.1 Integration test: Generate code with local model
- [ ] 6.2 Integration test: Generate tests with local model
- [ ] 6.3 Integration test: Generate docs with local model
- [ ] 6.4 Test error handling (server offline)
- [ ] 6.5 Test fallback to cloud APIs
- [ ] 6.6 Measure performance vs cloud APIs

---

## Out of Scope

- ❌ Model training or fine-tuning
- ❌ Model hosting (LM Studio handles this)
- ❌ GPU optimization (LM Studio handles this)
- ❌ Multi-model routing (use one model per task)
- ❌ Model comparison/benchmarking framework

---

## Dependencies

### External
- LM Studio application (installed)
- Local LLM models (user downloads)
- HTTP client (axios already in dependencies)

### Internal
- Existing OpenAI integration code
- Configuration system
- Conductor workflow

---

## Model Recommendations

### Code Generation
- **codellama-34b-instruct** - Best for code, slower
- **deepseek-coder-33b-instruct** - Good balance
- **mistral-7b-code** - Fast, good for snippets

### Test Generation
- **llama-3.1-8b-instruct** - Good reasoning
- **mistral-7b-instruct** - Fast, good coverage

### Documentation
- **llama-3.1-70b-instruct** - Best quality, slower
- **gemma-2-27b-it** - Good balance

### General Purpose
- **llama-3.1-8b** or **70b** - Choose based on speed vs quality
- **phi-3-mini** - Very fast, decent quality

---

## Risk Mitigation

### Risk 1: Local Models Lower Quality
**Mitigation:** Use larger models for critical tasks, fallback to cloud APIs if needed

### Risk 2: Server Not Running
**Mitigation:** Clear error messages, auto-start attempts (optional), graceful fallback

### Risk 3: Resource Intensive
**Mitigation:** Recommend lighter models for CPU inference, document GPU requirements

---

## Success Metrics

- All development tasks can use local models (code, tests, docs)
- <5s latency for typical prompts on recommended models
- 100% compatibility with existing OpenAI client code
- Zero cloud API costs for local development (when using LM Studio)
