# LM Studio Integration Guide

This guide explains how to use LM Studio (local LLM inference) for development work on the trust ledger system.

## Why LM Studio?

**Benefits:**
- 🔒 **Privacy**: Code stays on your machine (no cloud API calls)
- 💰 **Cost**: No API fees for local inference
- ⚡ **Speed**: Local models often faster than cloud APIs
- 🎯 **Flexibility**: Use different models for different tasks

**Use Cases:**
- Code generation during development
- Test generation and coverage analysis
- Documentation generation
- Code review and refactoring suggestions
- Architecture decision assistance

## Quick Start

### 1. Install LM Studio

Download from: https://lmstudio.ai/

Install in Applications folder (macOS) or equivalent for your OS.

### 2. Start the Server

Run the startup script:

```bash
cd ~/work/fiduciary
./scripts/lmstudio-start.sh
```

This will:
- Open LM Studio application
- Wait for the server to be ready
- Display the server URL and usage examples

### 3. Load a Model

In LM Studio:
1. Click "AI" in the left sidebar
2. Search for a model (recommendations below)
3. Click "Download" for the model you want
4. Wait for download to complete
5. The model appears in the "Local Server" dropdown

### 4. Start the Local Server

In LM Studio:
1. Click "Local Server" in the left sidebar
2. Select your loaded model from the dropdown
3. Click "Start Server"
4. Server runs at: `http://localhost:1234`

The startup script will verify the server is ready.

## Model Recommendations

### For Code Generation

**Best Quality:**
- `codellama-34b-instruct` - Best for code, slower
- `deepseek-coder-33b-instruct` - Excellent code quality

**Faster:**
- `mistral-7b-code` - Fast, good for snippets
- `codellama-7b-instruct` - Balanced speed/quality

### For Test Generation

- `llama-3.1-8b-instruct` - Good reasoning, fast
- `mistral-7b-instruct` - Fast, good coverage

### For Documentation

- `llama-3.1-70b-instruct` - Best quality, slower
- `gemma-2-27b-it` - Good balance

### For General Purpose

- `llama-3.1-8b` or `70b` - Choose based on speed vs quality
- `phi-3-mini` - Very fast, decent quality
- `gemma-2-9b-it` - Fast, good for quick tasks

## API Usage

LM Studio provides an **OpenAI-compatible API**. This means we can use OpenAI client libraries with just a base URL change.

### Example: List Models

```bash
curl http://localhost:1234/v1/models
```

### Example: Chat Completion

```bash
curl -X POST http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "local-model",
    "messages": [
      {"role": "user", "content": "Write a TypeScript function to calculate Fibonacci numbers"}
    ]
  }'
```

### Example: With TypeScript

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:1234/v1', // LM Studio
  apiKey: 'not-needed', // LM Studio doesn't require a key
});

const response = await client.chat.completions.create({
  model: 'local-model',
  messages: [
    { role: 'user', content: 'Generate a TypeScript function for X' }
  ],
});

console.log(response.choices[0].message.content);
```

## Configuration

Add to your `.env` file:

```bash
# LM Studio Configuration
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model

# LLM Provider Selection
LLM_PROVIDER=lmstudio
LLM_FALLBACK=openai
```

## npm Scripts

Once the integration is complete (see track `lmstudio_integration_20260201`), you'll have these scripts:

```bash
# Generate code with local model
npm run codegen:local "Create a function to parse CSV files"

# Generate tests with local model
npm run testgen:local src/ledger/public/PublicLedgerManager.ts

# Generate documentation with local model
npm run docs:local src/ledger/

# Interactive prompt
npm run llm:local
# Type your prompt and press Enter
```

## Conductor Integration

The Conductor skill (newly ported to OpenClaw) will use local models for:

- **Code Generation**: Implement tasks from plan.md
- **Test Generation**: Generate unit tests based on code
- **Documentation**: Generate docs from code + spec
- **Code Review**: Suggest improvements and refactors

Each task type will use an appropriate model:
- Code generation → code-specialized models (codellama, deepseek-coder)
- Test generation → reasoning models (llama-3.1)
- Documentation → larger models (llama-3.1-70b)
- Code review → fast models for quick iterations (phi-3, mistral-7b)

## Troubleshooting

### Server Not Running

**Error:** `ECONNREFUSED` or "Server not running"

**Solution:**
1. Run `./scripts/lmstudio-start.sh`
2. Open LM Studio application
3. Click "Local Server" tab
4. Click "Start Server"

### Model Not Loaded

**Error:** `Model not found` or similar

**Solution:**
1. In LM Studio, click "AI" tab
2. Search for your desired model
3. Click "Download"
4. Wait for download to complete
5. Select model in "Local Server" dropdown

### Slow Inference

**Problem:** Responses take too long

**Solutions:**
- Use a smaller model (7B vs 34B)
- Enable GPU acceleration in LM Studio settings
- Reduce `max_tokens` in API requests
- Use streaming responses

### Out of Memory

**Problem:** System runs out of RAM during inference

**Solutions:**
- Use a smaller model
- Use model quantization (Q4_K_M, Q5_K_M)
- Close other applications
- Enable system swap (if needed)

## Performance Tips

1. **Use appropriate model size**: Don't use 70B for simple tasks
2. **Enable GPU**: Much faster than CPU (if available)
3. **Use quantized models**: Q4_K_M is good balance of quality/speed
4. **Stream responses**: See first token faster
5. **Cache models**: Keep frequently-used models in memory

## Integration with Existing Code

The LM Studio client is compatible with existing OpenAI integration:

```typescript
// Before (OpenAI cloud API)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// After (LM Studio local API)
const client = new OpenAI({
  baseURL: process.env.LMSTUDIO_BASE_URL,
  apiKey: 'not-needed', // LM Studio doesn't require API key
});

// Rest of code works the same!
const response = await client.chat.completions.create({...});
```

## Future Enhancements

Planned in track `lmstudio_integration_20260201`:

- [x] Server startup script
- [ ] TypeScript client implementation
- [ ] Configuration management
- [ ] Conductor workflow integration
- [ ] npm scripts for common tasks
- [ ] VS Code tasks and shortcuts
- [ ] Performance benchmarks
- [ ] Model recommendation engine

## Resources

- **LM Studio Website**: https://lmstudio.ai/
- **LM Studio GitHub**: https://github.com/lmstudio-ai
- **Model Downloads**: Built into LM Studio
- **OpenAI API Reference**: https://platform.openai.com/docs/api-reference (LM Studio is compatible)

## Support

If you encounter issues:

1. Check LM Studio logs in the application
2. Verify server is running: `curl http://localhost:1234/v1/models`
3. Check model is loaded in "Local Server" tab
4. Review this guide's troubleshooting section
5. Open an issue in the project repository

---

**Happy coding with local LLMs! 🚀**
