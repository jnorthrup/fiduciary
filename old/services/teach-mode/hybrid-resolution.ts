/**
 * Hybrid Resolution Strategy
 *
 * Manual lookup -> AI retrieval -> Generic help fallback for Teach Mode.
 */

export interface HybridQuery {
  fieldId: string;
  formId: string;
  description: string;
}

export interface HybridResolutionResult {
  content: string;
  source: ResolutionSource;
  taxonomyPath?: string[];
  metadata: {
    source: ResolutionSource;
    resolvedAt: number;
    cached?: boolean;
  };
}

export type ResolutionSource = 'manual' | 'ai' | 'cache' | 'generic';

// In-memory manual mappings (will be loaded from JSON in production)
const manualMappings: Record<string, any> = {};

/**
 * Resolve field help using hybrid fallback strategy.
 * Tries: Manual mapping -> AI retrieval -> Generic help
 */
export async function resolveWithHybridFallback(
  query: HybridQuery
): Promise<HybridResolutionResult> {
  if (!query.fieldId || !query.formId || !query.description) {
    throw new Error('Invalid query: missing required fields');
  }

  const key = `${query.formId}:${query.fieldId}`;

  // 1. Try manual mapping first
  const manual = manualMappings[key];
  if (manual) {
    return {
      content: manual.description,
      source: 'manual',
      taxonomyPath: manual.taxonomyPath,
      metadata: {
        source: 'manual',
        resolvedAt: Date.now(),
      },
    };
  }

  // 2. Try AI retrieval (with cache check)
  // In production, this would call the AI service
  const aiResult = await tryAIRetrieval(query);
  if (aiResult) {
    return aiResult;
  }

  // 3. Fallback to generic help
  return {
    content: generateGenericHelp(query),
    source: 'generic',
    metadata: {
      source: 'generic',
      resolvedAt: Date.now(),
    },
  };
}

/**
 * Attempt AI retrieval with caching.
 */
async function tryAIRetrieval(
  query: HybridQuery
): Promise<HybridResolutionResult | null> {
  const cacheKey = `ai:${query.formId}:${query.fieldId}`;

  // Check cache
  const cached = aiCache[cacheKey];
  if (cached && Date.now() < cached.expiresAt) {
    return {
      ...cached.data,
      source: 'cache',
      metadata: {
        ...cached.data.metadata,
        source: 'cache',
        cached: true,
      },
    };
  }

  // In production, this would call an AI service
  // For now, simulate AI retrieval for unmapped fields
  const aiContent = await mockAIService(query);
  if (!aiContent) {
    return null;
  }

  const result: HybridResolutionResult = {
    content: aiContent,
    source: 'ai',
    metadata: {
      source: 'ai',
      resolvedAt: Date.now(),
    },
  };

  // Cache for 1 hour
  aiCache[cacheKey] = {
    data: result,
    expiresAt: Date.now() + 3600000,
  };

  return result;
}

/**
 * Mock AI service for testing.
 * In production, this would call a real GenAI API.
 */
async function mockAIService(query: HybridQuery): Promise<string | null> {
  // Simulate AI service that returns content for some fields
  // but not for completely unknown fields
  if (query.fieldId === 'nonexistent_field') {
    return null; // AI doesn't know this field either
  }

  // AI generates generic but contextual help
  return `Based on the form ${query.formId}, the field "${query.fieldId}" typically requires ${query.description}. Please verify with the official instructions.`;
}

// AI result cache
interface CacheEntry {
  data: HybridResolutionResult;
  expiresAt: number;
}

const aiCache: Record<string, CacheEntry> = {};

/**
 * Generate generic help message based on form context.
 */
function generateGenericHelp(query: HybridQuery): string {
  const formNames: Record<string, string> = {
    i1099nec: 'Form 1099-NEC',
    i1099misc: 'Form 1099-MISC',
    i1099gi: 'General Instructions',
  };

  const formName = formNames[query.formId] || query.formId;

  return `Need help with ${query.fieldId} on ${formName}? Please refer to the official IRS instructions for this form or contact IRS support for assistance.`;
}

/**
 * Load manual mappings from external source.
 */
export function loadManualMappings(mappings: Record<string, any>): void {
  Object.assign(manualMappings, mappings);
}
