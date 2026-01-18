/**
 * AI-Assisted BSO Error Interpreter
 *
 * Uses Google GenAI (Gemini) to provide contextual analysis and guidance
 * for BSO errors, with fallback to static error mapping.
 */

import { GoogleGenAI } from '@google/genai';
import { mapBSOError, type BSOErrorDetail } from './errors';

/**
 * Configuration for AI error interpretation
 */
const AI_CONFIG = {
  model: 'gemini-3-flash-preview',
  maxRetries: 2,
  timeout: 10000 // 10 seconds
};

/**
 * Result from AI error interpretation
 */
export interface AIInterpretationResult {
  /** The original error code */
  errorCode: string;
  /** AI-generated explanation of the error */
  explanation: string;
  /** Suggested next steps */
  nextSteps: string[];
  /** Whether this was AI-generated or fallback */
  source: 'ai' | 'fallback';
  /** Confidence score (0-1) from AI */
  confidence?: number;
  /** Fallback static error detail (if AI unavailable) */
  fallbackError?: BSOErrorDetail;
}

/**
 * Interpret a BSO error using AI analysis with fallback to static mapping
 *
 * @param errorCode - The BSO error code (e.g., "BSO-900", "BSO-403")
 * @param context - Additional context about when/how the error occurred
 * @returns AI interpretation result with explanation and next steps
 *
 * @example
 * ```ts
 * const result = await interpretBSOError('BSO-900', {
 *   action: 'login attempt',
 *   timestamp: new Date().toISOString()
 * });
 * console.log(result.explanation); // AI-generated contextual explanation
 * console.log(result.nextSteps); // Suggested next steps
 * ```
 */
export async function interpretBSOError(
  errorCode: string,
  context?: ErrorContext
): Promise<AIInterpretationResult> {
  // Check if AI is available
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    // Fallback to static mapping if no API key
    return fallbackToStaticMapping(errorCode);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Build the prompt for AI analysis
    const prompt = buildErrorAnalysisPrompt(errorCode, context);

    // Call AI for error analysis
    const response = await ai.models.generateContent({
      model: AI_CONFIG.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error('Empty AI response');
    }

    // Parse AI response
    const aiResult = JSON.parse(rawText);

    return {
      errorCode,
      explanation: aiResult.explanation || '',
      nextSteps: aiResult.nextSteps || [],
      source: 'ai',
      confidence: aiResult.confidence || 0.8
    };
  } catch (error) {
    // Fallback to static mapping on any AI failure
    console.warn(`AI interpretation failed for ${errorCode}, falling back to static mapping:`, error);
    return fallbackToStaticMapping(errorCode);
  }
}

/**
 * Context information for error interpretation
 */
export interface ErrorContext {
  /** What action was being performed when error occurred */
  action?: string;
  /** When the error occurred */
  timestamp?: string;
  /** Additional relevant details */
  details?: Record<string, any>;
  /** User role/permissions (for auth errors) */
  userRole?: string;
  /** Employer/EIN being processed (for employer-related errors) */
  employerId?: string;
}

/**
 * Build prompt for AI error analysis
 */
function buildErrorAnalysisPrompt(errorCode: string, context?: ErrorContext): string {
  const contextStr = context
    ? `\n\nContext:\n${JSON.stringify(context, null, 2)}`
    : '';

  return `You are an expert SSA Business Services Online (BSO) support specialist. Analyze the following BSO error code and provide helpful guidance.

Error Code: ${errorCode}${contextStr}

Provide a JSON response with this exact structure:
{
  "explanation": "Clear, user-friendly explanation of what this error means",
  "nextSteps": [
    "Step 1: Specific action to take",
    "Step 2: Follow-up action",
    "Step 3: Additional consideration"
  ],
  "confidence": 0.9
}

Guidelines:
- Explain in simple, non-technical language
- Focus on actionable steps the user can take
- Consider the context provided
- Include specific SSA resources or contacts when relevant
- Be concise but thorough
- confidence should be between 0 and 1 based on how clear-cut the resolution is`;
}

/**
 * Fallback to static error mapping when AI is unavailable
 */
function fallbackToStaticMapping(errorCode: string): AIInterpretationResult {
  const staticError = mapBSOError(errorCode);

  return {
    errorCode,
    explanation: staticError.message,
    nextSteps: parseResolutionIntoSteps(staticError.resolution),
    source: 'fallback',
    fallbackError: staticError
  };
}

/**
 * Parse resolution text into actionable steps
 */
function parseResolutionIntoSteps(resolution: string): string[] {
  // Split resolution into steps by common delimiters
  const steps: string[] = [];

  // Split by periods, then clean up
  const sentences = resolution.split(/\.\s+/);
  for (const sentence of sentences) {
    if (sentence.trim().length > 0) {
      steps.push(sentence.trim());
    }
  }

  return steps.length > 0 ? steps : [resolution];
}

/**
 * Batch interpret multiple BSO errors
 *
 * @param errorCodes - Array of BSO error codes to interpret
 * @param context - Shared context for all errors
 * @returns Array of interpretation results
 *
 * @example
 * ```ts
 * const results = await interpretMultipleBSOErrors(
 *   ['BSO-900', 'BSO-403', 'BSO-106'],
 *   { action: 'W-2 file upload' }
 * );
 * ```
 */
export async function interpretMultipleBSOErrors(
  errorCodes: string[],
  context?: ErrorContext
): Promise<AIInterpretationResult[]> {
  // Process errors in parallel with concurrency limit
  const BATCH_SIZE = 3;
  const results: AIInterpretationResult[] = [];

  for (let i = 0; i < errorCodes.length; i += BATCH_SIZE) {
    const batch = errorCodes.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(code => interpretBSOError(code, context))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Check if AI interpretation is available
 *
 * @returns true if Google GenAI API key is configured
 */
export function isAIInterpretationAvailable(): boolean {
  return !!(process.env.GOOGLE_GENAI_API_KEY || process.env.API_KEY);
}

/**
 * Get common BSO error scenarios for proactive guidance
 *
 * @param scenario - Common scenario identifier
 * @returns Preventive guidance for the scenario
 */
export function getPreventiveGuidance(scenario: 'login' | 'upload' | 'validation'): string[] {
  const guidance: Record<string, string[]> = {
    login: [
      'Verify your username is spelled correctly',
      'Check that Caps Lock is not enabled',
      'Ensure your password meets current requirements',
      'Clear your browser cache and cookies',
      'Try using a different browser'
    ],
    upload: [
      'Verify your file meets EFW2 format specifications',
      'Use the SSA AccuWage tool before uploading',
      'Ensure file size is under the BSO limit',
      'Check that your internet connection is stable',
      'Upload during off-peak hours for faster processing'
    ],
    validation: [
      'Double-check all EINs and SSNs for accuracy',
      'Verify all wage amounts are positive numbers',
      'Ensure employee names match SSA records',
      'Confirm tax year is correct',
      'Run validation reports before submission'
    ]
  };

  return guidance[scenario] || [];
}
