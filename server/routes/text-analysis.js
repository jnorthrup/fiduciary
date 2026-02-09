/**
 * Text Analysis API Routes
 * Provides endpoints for LDA topic modeling, entity extraction, and visualization generation.
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { performLDA, extractTopTerms } from '../lib/lda-engine.js';
import {
  extractEntities,
  consolidateEntities,
  buildTaxonomy
} from '../lib/entity-consolidator.js';
import {
  generateWordCloud,
  generateD3Dataset,
  generateCombinedVisualization
} from '../lib/svg-wordcloud.js';
import persistence from '../lib/gcs-persistence.js';
import { publish } from '../lib/event-bus.js';

const router = express.Router();

/**
 * Collection key for storing text analyses
 */
const COLLECTION = 'text-analyses';

/**
 * Helper to load all analyses for a user
 */
async function loadAnalyses(uid) {
  const data = await persistence.loadData(uid, COLLECTION);
  return data?.analyses || [];
}

/**
 * Helper to save analyses for a user
 */
async function saveAnalyses(uid, analyses) {
  await persistence.saveData(uid, COLLECTION, { analyses });
}

/**
 * POST /api/text-analysis/analyze
 * Analyze text and return results
 */
router.post('/analyze', async (req, res) => {
  try {
    const { text, options = {} } = req.body;
    const uid = req.user.uid;

    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Text is required and must be a non-empty string'
      });
    }

    if (text.length < 50) {
      return res.status(400).json({
        error: 'Text too short',
        message: 'Please provide at least 50 characters for meaningful analysis'
      });
    }

    // Merge options with defaults
    const analysisOptions = {
      numTopics: 5,
      iterations: 100,
      alpha: 0.1,
      beta: 0.01,
      minWordFrequency: 2,
      includeTaxonomy: true,
      ...options
    };

    // Create analysis record
    const analysisId = randomUUID();
    const timestamp = new Date().toISOString();

    // Step 1: Perform LDA topic modeling
    const ldaResult = await performLDA(text, analysisOptions);

    // Step 2: Extract entities using AI or rule-based
    const rawEntities = await extractEntities(text, {
      apiKey: process.env.GOOGLE_GENAI_KEY || process.env.API_KEY
    });

    // Step 3: Consolidate entities
    const consolidatedEntities = consolidateEntities(rawEntities);

    // Step 4: Build taxonomy
    const taxonomy = buildTaxonomy(consolidatedEntities, ldaResult.topics);

    // Step 5: Generate visualization data
    const wordCloud = generateWordCloud(ldaResult.topics, consolidatedEntities, {
      width: 1200,
      height: 800,
      minWordSize: 12,
      maxWordSize: 64
    });

    const d3Dataset = generateD3Dataset(ldaResult.topics, consolidatedEntities, taxonomy, {
      width: 1200,
      height: 800
    });

    // Create text preview (first 200 chars)
    const textPreview = text.slice(0, 200) + (text.length > 200 ? '...' : '');

    // Compile analysis result
    const analysis = {
      id: analysisId,
      createdAt: timestamp,
      updatedAt: timestamp,
      textPreview,
      textLength: text.length,
      options: analysisOptions,
      topics: ldaResult.topics,
      entities: consolidatedEntities,
      taxonomy: taxonomy.categories,
      wordCloud: {
        nodes: wordCloud.nodes,
        svgData: wordCloud.svgContent,
        layout: wordCloud.layout
      },
      conceptGraph: {
        nodes: d3Dataset.nodes,
        links: d3Dataset.links
      },
      metadata: {
        ...ldaResult.metadata,
        entityCount: consolidatedEntities.length,
        topicCount: ldaResult.topics.length
      }
    };

    // Save to persistence
    const analyses = await loadAnalyses(uid);
    analyses.unshift(analysis); // Add to beginning

    // Limit stored analyses (keep most recent 50)
    if (analyses.length > 50) {
      analyses.splice(50);
    }

    await saveAnalyses(uid, analyses);

    // Publish event
    await publish('text-analysis.completed', {
      analysisId,
      uid,
      timestamp
    });

    res.status(201).json(analysis);
  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/text-analysis/quick
 * Quick analysis with just top terms (no LDA, no AI entities)
 * Useful for getting fast word frequency analysis
 */
router.post('/quick', async (req, res) => {
  try {
    const { text, topN = 50 } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Text is required'
      });
    }

    const result = extractTopTerms(text, topN);

    res.json({
      terms: result.terms,
      totalWords: result.totalWords,
      uniqueWords: result.uniqueWords
    });
  } catch (error) {
    console.error('Quick analysis error:', error);
    res.status(500).json({
      error: 'Quick analysis failed',
      message: error.message
    });
  }
});

/**
 * GET /api/text-analysis/:id
 * Retrieve a specific analysis by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;

    const analyses = await loadAnalyses(uid);
    const analysis = analyses.find(a => a.id === id);

    if (!analysis) {
      return res.status(404).json({
        error: 'Not found',
        message: `Analysis with ID ${id} not found`
      });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error retrieving analysis:', error);
    res.status(500).json({
      error: 'Retrieval failed',
      message: error.message
    });
  }
});

/**
 * GET /api/text-analysis
 * List all analyses for the current user
 */
router.get('/', async (req, res) => {
  try {
    const uid = req.user.uid;
    const analyses = await loadAnalyses(uid);

    // Return summary list (without full data)
    const summaries = analyses.map(a => ({
      id: a.id,
      createdAt: a.createdAt,
      textPreview: a.textPreview,
      textLength: a.textLength,
      topicCount: a.topics?.length || 0,
      entityCount: a.entities?.length || 0
    }));

    res.json(summaries);
  } catch (error) {
    console.error('Error listing analyses:', error);
    res.status(500).json({
      error: 'List failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/text-analysis/:id
 * Delete a specific analysis
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;

    const analyses = await loadAnalyses(uid);
    const index = analyses.findIndex(a => a.id === id);

    if (index === -1) {
      return res.status(404).json({
        error: 'Not found',
        message: `Analysis with ID ${id} not found`
      });
    }

    analyses.splice(index, 1);
    await saveAnalyses(uid, analyses);

    // Publish event
    await publish('text-analysis.deleted', { id, uid });

    res.json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: error.message
    });
  }
});

/**
 * POST /api/text-analysis/:id/export
 * Export analysis as SVG file
 */
router.post('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'combined' } = req.body; // 'wordcloud', 'graph', 'combined'
    const uid = req.user.uid;

    const analyses = await loadAnalyses(uid);
    const analysis = analyses.find(a => a.id === id);

    if (!analysis) {
      return res.status(404).json({
        error: 'Not found',
        message: `Analysis with ID ${id} not found`
      });
    }

    let svgContent;

    if (format === 'wordcloud') {
      svgContent = analysis.wordCloud?.svgData;
    } else if (format === 'combined') {
      const combined = generateCombinedVisualization(
        analysis.topics,
        analysis.entities,
        { categories: analysis.taxonomy, conceptGraph: analysis.conceptGraph?.links },
        { width: 1400, height: 900 }
      );
      svgContent = combined.svgContent;
    } else {
      return res.status(400).json({
        error: 'Invalid format',
        message: 'Format must be "wordcloud" or "combined"'
      });
    }

    if (!svgContent) {
      return res.status(500).json({
        error: 'Export failed',
        message: 'SVG data not available'
      });
    }

    // Set headers for SVG download
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `attachment; filename="text-analysis-${id}.svg"`);
    res.send(svgContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
});

export default router;
