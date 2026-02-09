/**
 * Text Analysis Service
 * Frontend service for text analysis API calls.
 */

import { apiRequest, apiGet, apiPost, apiPatch } from './apiClient';
import type {
  AnalysisResult,
  AnalysisSummary,
  AnalysisOptions,
  QuickTermResult,
  ExportFormat
} from '../types/text-analysis';

const TEXT_ANALYSIS_BASE = '/api/text-analysis';

/**
 * Analyze text using LDA topic modeling and entity extraction
 * @param text The text to analyze
 * @param options Analysis options
 * @returns Analysis result with topics, entities, and visualizations
 */
export async function analyzeText(
  text: string,
  options?: AnalysisOptions
): Promise<AnalysisResult> {
  if (!text || text.trim().length < 50) {
    throw new Error('Text must be at least 50 characters long');
  }

  return apiPost<AnalysisResult>(`${TEXT_ANALYSIS_BASE}/analyze`, {
    text: text.trim(),
    options: options || {}
  });
}

/**
 * Get a quick term frequency analysis (without full LDA)
 * @param text The text to analyze
 * @param topN Number of top terms to return
 * @returns Term frequency results
 */
export async function quickAnalyze(
  text: string,
  topN: number = 50
): Promise<QuickTermResult> {
  if (!text || text.trim().length < 10) {
    throw new Error('Text must be at least 10 characters long');
  }

  return apiPost<QuickTermResult>(`${TEXT_ANALYSIS_BASE}/quick`, {
    text: text.trim(),
    topN
  });
}

/**
 * Get a specific analysis by ID
 * @param id The analysis ID
 * @returns The full analysis result
 */
export async function getAnalysis(id: string): Promise<AnalysisResult> {
  if (!id) {
    throw new Error('Analysis ID is required');
  }

  return apiGet<AnalysisResult>(`${TEXT_ANALYSIS_BASE}/${id}`);
}

/**
 * List all analyses for the current user
 * @returns Array of analysis summaries
 */
export async function listAnalyses(): Promise<AnalysisSummary[]> {
  return apiGet<AnalysisSummary[]>(TEXT_ANALYSIS_BASE);
}

/**
 * Delete an analysis
 * @param id The analysis ID to delete
 * @returns Success confirmation
 */
export async function deleteAnalysis(id: string): Promise<{ message: string }> {
  if (!id) {
    throw new Error('Analysis ID is required');
  }

  // Use apiRequest with DELETE method
  return apiRequest<{ message: string }>(`${TEXT_ANALYSIS_BASE}/${id}`, {
    method: 'DELETE'
  });
}

/**
 * Export an analysis as SVG
 * @param id The analysis ID
 * @param format Export format ('wordcloud' or 'combined')
 * @returns SVG blob URL for download
 */
export async function exportAnalysis(
  id: string,
  format: ExportFormat = 'combined'
): Promise<string> {
  if (!id) {
    throw new Error('Analysis ID is required');
  }

  // For export, we need to use fetch directly to get the blob
  const token = localStorage.getItem('clearflow_token');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const response = await fetch(`${baseUrl}${TEXT_ANALYSIS_BASE}/${id}/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: JSON.stringify({ format })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Export failed');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Download an SVG export to a file
 * @param id The analysis ID
 * @param format Export format
 * @param filename Optional custom filename
 */
export async function downloadExport(
  id: string,
  format: ExportFormat = 'combined',
  filename?: string
): Promise<void> {
  const blobUrl = await exportAnalysis(id, format);
  const defaultFilename = `text-analysis-${id}-${format}.svg`;
  const actualFilename = filename || defaultFilename;

  // Create a temporary link to trigger download
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = actualFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the blob URL
  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
}

/**
 * React hook for text analysis state
 */
export interface UseTextAnalysisState {
  analyses: AnalysisSummary[];
  currentAnalysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
}

/**
 * Load recent analyses on mount
 */
export async function loadRecentAnalyses(): Promise<AnalysisSummary[]> {
  try {
    return await listAnalyses();
  } catch (error) {
    console.error('Failed to load analyses:', error);
    return [];
  }
}

/**
 * Parse text from a file
 * @param file The file to read
 * @returns Promise resolving to file text content
 */
export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        resolve(text);
      } else {
        reject(new Error('Failed to read file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('File reading error'));
    };

    reader.readAsText(file);
  });
}

/**
 * Check if text is suitable for analysis
 * @param text The text to check
 * @returns Object with validity status and reason
 */
export function validateAnalysisText(text: string): {
  valid: boolean;
  reason?: string;
  wordCount?: number;
  charCount?: number;
} {
  const trimmed = text.trim();
  const charCount = trimmed.length;
  const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;

  if (charCount === 0) {
    return { valid: false, reason: 'Text is empty' };
  }

  if (charCount < 50) {
    return {
      valid: false,
      reason: 'Text is too short (minimum 50 characters)',
      wordCount,
      charCount
    };
  }

  if (wordCount < 10) {
    return {
      valid: false,
      reason: 'Text has too few words (minimum 10 words)',
      wordCount,
      charCount
    };
  }

  return { valid: true, wordCount, charCount };
}

export default {
  analyzeText,
  quickAnalyze,
  getAnalysis,
  listAnalyses,
  deleteAnalysis,
  exportAnalysis,
  downloadExport,
  loadRecentAnalyses,
  readTextFile,
  validateAnalysisText
};
// Another test
