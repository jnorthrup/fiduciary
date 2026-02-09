/**
 * Entity Consolidator Module
 * Extracts and consolidates related entities from text using Google GenAI.
 */

import { GoogleGenAI, Type } from "@google/genai";
import { isStopword } from './stopwords.js';

// Entity type categories for classification
const ENTITY_TYPES = {
  ORGANIZATION: 'organization',
  PERSON: 'person',
  LOCATION: 'location',
  LEGAL: 'legal',
  FINANCIAL: 'financial',
  TAX: 'tax',
  FORM: 'form',
  DATE: 'date',
  MONEY: 'money',
  CONCEPT: 'concept',
  OTHER: 'other'
};

/**
 * Normalize text for comparison
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

/**
 * Calculate string similarity using Jaro-Winkler distance
 */
function jaroWinklerSimilarity(s1, s2) {
  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0 || len2 === 0) return 0;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler modification
  let prefix = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + (prefix * 0.1 * (1 - jaro));
}

/**
 * Check if two entity references might be the same entity
 */
function isSameEntity(entity1, entity2) {
  const norm1 = normalizeText(entity1.text || entity1);
  const norm2 = normalizeText(entity2.text || entity2);

  if (norm1 === norm2) return true;

  // Check for high similarity
  const similarity = jaroWinklerSimilarity(norm1, norm2);
  if (similarity > 0.9) return true;

  // Check for common variations
  const variations1 = generateVariations(norm1);
  const variations2 = generateVariations(norm2);

  for (const v1 of variations1) {
    for (const v2 of variations2) {
      if (v1 === v2 || jaroWinklerSimilarity(v1, v2) > 0.95) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Generate common variations of entity text
 */
function generateVariations(text) {
  const variations = [text];

  // Remove dots (e.g., "I.R.S." -> "IRS")
  variations.push(text.replace(/\./g, ''));

  // Add spaces between letters and numbers (e.g., "1099A" -> "1099 A")
  variations.push(text.replace(/([a-zA-Z])(\d)/g, '$1 $2').replace(/(\d)([a-zA-Z])/g, '$1 $2'));

  // Expand common abbreviations
  const abbreviations = {
    'irs': 'internal revenue service',
    'doi': 'department of interior',
    'ssa': 'social security administration',
    'cir': 'commissioner of internal revenue',
    'usc': 'united states code',
    'cfr': 'code of federal regulations'
  };

  const lower = text.toLowerCase();
  for (const [abbr, full] of Object.entries(abbreviations)) {
    if (lower.includes(abbr)) {
      variations.push(text.replace(new RegExp(abbr, 'gi'), full));
    }
  }

  return variations;
}

/**
 * Extract entities from text using Google GenAI
 */
export async function extractEntities(text, options = {}) {
  const { apiKey = process.env.GOOGLE_GENAI_KEY || process.env.API_KEY } = options;

  if (!apiKey) {
    console.warn('No Google GenAI API key provided, using rule-based extraction');
    return extractEntitiesRuleBased(text);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Truncate text if too long for the API
    const truncatedText = text.length > 50000
      ? text.slice(0, 50000)
      : text;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: `Extract all significant entities from the following text. Focus on:
- Organizations (government agencies, companies, institutions)
- Legal forms and documents (1099, 1040, etc.)
- Legal concepts and terms
- People (if specifically named)
- Locations mentioned
- Tax and financial terms

Text to analyze:
"""${truncatedText}"""

Return ONLY a JSON array of objects with:
- text: the exact entity text as it appears
- type: one of: organization, legal, form, tax, person, location, financial, concept, other
- count: approximate frequency of mentions (estimate 1-3 for single mentions, 4-10 for multiple, 11+ for frequent)

Limit to top 50 most significant entities.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              type: { type: Type.STRING },
              count: { type: Type.NUMBER }
            },
            required: ["text", "type", "count"]
          }
        }
      }
    });

    const entities = JSON.parse(response.text);

    // Add additional metadata
    return entities.map(e => ({
      ...e,
      normalized: normalizeText(e.text),
      variations: []
    }));
  } catch (error) {
    console.error('Entity extraction with AI failed, falling back to rule-based:', error.message);
    return extractEntitiesRuleBased(text);
  }
}

/**
 * Rule-based entity extraction as fallback
 */
function extractEntitiesRuleBased(text) {
  const entities = [];
  const seen = new Set();

  // Legal form patterns (1099-A, 1040, W-2, etc.)
  const formPatterns = [
    /\b\d{3,4}[A-Z]?\b/g,  // 1099, 1099-A, W-2, etc.
    /\bForm\s+\d+[A-Z]?\b/gi,
    /\bSchedule\s+[A-Z]\b/gi,
    /\b[ADW]\d*\b/g  // W2, 1099, etc.
  ];

  formPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      const normalized = normalizeText(match);
      if (!seen.has(normalized) && !isStopword(match)) {
        seen.add(normalized);
        entities.push({
          text: match.trim(),
          type: 'form',
          count: (text.match(new RegExp(match, 'gi')) || []).length,
          normalized,
          variations: []
        });
      }
    });
  });

  // Government agencies
  const agencyPatterns = [
    /\b(?:Internal Revenue Service|IRS|I\.R\.S\.)\b/gi,
    /\b(?:Department of(?: the)? Interior|DOI|D\.O\.I\.)\b/gi,
    /\b(?:Social Security Administration|SSA)\b/gi,
    /\b(?:Commissioner of Internal Revenue|CIR)\b/gi,
    /\b(?:United States)(?:\s+Government)?\b/gi
  ];

  agencyPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      const normalized = normalizeText(match);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        entities.push({
          text: match.trim(),
          type: 'organization',
          count: (text.match(new RegExp(match.replace(/\s+/g, '\\s+'), 'gi')) || []).length,
          normalized,
          variations: []
        });
      }
    });
  });

  // Capitalized phrases (potential entities) - 2+ consecutive capitalized words
  const capitalPattern = /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+\b/g;
  const capitalMatches = text.match(capitalPattern) || [];

  capitalMatches.forEach(match => {
    const normalized = normalizeText(match);
    if (!seen.has(normalized) && !isStopword(match)) {
      seen.add(normalized);
      entities.push({
        text: match.trim(),
        type: 'concept',
        count: (text.match(new RegExp(match, 'g')) || []).length,
        normalized,
        variations: []
      });
    }
  });

  // Legal terms
  const legalTerms = [
    'recoupment', 'lien', 'levy', 'garnishment', 'seizure',
    'fiduciary', 'trust', 'estate', 'beneficiary', 'trustee',
    'audit', 'examination', 'assessment', 'determination',
    'petition', 'writ', 'motion', 'judgment', 'decree',
    'deficiency', 'penalty', 'interest', 'abatement'
  ];

  legalTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const count = (text.match(regex) || []).length;
    if (count > 0) {
      const normalized = normalizeText(term);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        entities.push({
          text: term,
          type: 'legal',
          count,
          normalized,
          variations: []
        });
      }
    }
  });

  return entities;
}

/**
 * Consolidate similar entities into canonical forms
 */
export function consolidateEntities(entities) {
  if (!entities || entities.length === 0) return [];

  const consolidated = [];
  const processed = new Set();

  // Sort by count (most frequent first) for canonical selection
  const sorted = [...entities].sort((a, b) => (b.count || 0) - (a.count || 0));

  for (const entity of sorted) {
    const normalized = entity.normalized || normalizeText(entity.text);

    if (processed.has(normalized)) continue;

    // Find all variations of this entity
    const variations = [entity];
    const variationNorms = [normalized];

    for (const other of sorted) {
      if (other === entity) continue;
      const otherNorm = other.normalized || normalizeText(other.text);

      if (processed.has(otherNorm)) continue;

      if (isSameEntity(entity, other)) {
        variations.push(other);
        variationNorms.push(otherNorm);
      }
    }

    // Mark all variations as processed
    variationNorms.forEach(v => processed.add(v));

    // Determine canonical form (prefer longer, more formal version)
    const canonical = variations.reduce((best, current) => {
      const bestLen = (best.text || '').length;
      const currLen = (current.text || '').length;

      // Prefer longer, more complete forms
      if (currLen > bestLen) return current;
      if (currLen === bestLen && (current.count || 0) > (best.count || 0)) return current;
      return best;
    }, variations[0]);

    // Combine counts from all variations
    const totalCount = variations.reduce((sum, v) => sum + (v.count || 0), 0);

    // Get all variation texts
    const variationTexts = [...new Set(variations.map(v => v.text))];

    consolidated.push({
      canonical: canonical.text,
      variations: variationTexts,
      count: totalCount,
      type: canonical.type,
      normalized: normalizeText(canonical.text)
    });
  }

  // Sort by count descending
  return consolidated.sort((a, b) => b.count - a.count);
}

/**
 * Build taxonomy linking entities to topics
 */
export function buildTaxonomy(entities, topics) {
  if (!entities || entities.length === 0) {
    return { categories: [], conceptGraph: [] };
  }

  // Create category groupings by entity type
  const typeGroups = {};
  entities.forEach(entity => {
    const type = entity.type || 'other';
    if (!typeGroups[type]) {
      typeGroups[type] = [];
    }
    typeGroups[type].push(entity);
  });

  // Build category nodes
  const categories = Object.entries(typeGroups).map(([type, ents], idx) => ({
    id: `category-${type}`,
    label: type.charAt(0).toUpperCase() + type.slice(1) + 's',
    type: 'category',
    children: ents.map((e, i) => ({
      id: `entity-${idx}-${i}`,
      label: e.canonical,
      type: 'entity',
      entityType: e.type,
      count: e.count
    }))
  }));

  // Build concept graph (links between entities and topics)
  const conceptGraph = [];

  // Link entities to topics based on text similarity
  if (topics && topics.length > 0) {
    entities.forEach((entity, entityIdx) => {
      const entityNorm = entity.normalized || normalizeText(entity.canonical);

      topics.forEach((topic, topicIdx) => {
        // Check if entity text appears in any topic words
        const matchingWords = topic.words.filter(word => {
          const wordNorm = normalizeText(word.word);
          return wordNorm.includes(entityNorm) || entityNorm.includes(wordNorm);
        });

        if (matchingWords.length > 0) {
          conceptGraph.push({
            source: `entity-${entity.type}-${entityIdx}`,
            target: topic.id,
            strength: matchingWords.reduce((sum, w) => sum + w.probability, 0),
            type: 'entity-topic'
          });
        }
      });
    });

    // Link related topics (if they share entities)
    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const topic1Entities = conceptGraph
          .filter(l => l.target === topics[i].id)
          .map(l => l.source);
        const topic2Entities = conceptGraph
          .filter(l => l.target === topics[j].id)
          .map(l => l.source);

        const shared = topic1Entities.filter(e => topic2Entities.includes(e));
        if (shared.length > 0) {
          conceptGraph.push({
            source: topics[i].id,
            target: topics[j].id,
            strength: shared.length * 0.1,
            type: 'topic-topic'
          });
        }
      }
    }
  }

  // Link related entities (same type, similar frequency)
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      if (entities[i].type === entities[j].type) {
        const countDiff = Math.abs(entities[i].count - entities[j].count);
        if (countDiff < Math.max(entities[i].count, entities[j].count) * 0.5) {
          conceptGraph.push({
            source: `entity-${entities[i].type}-${i}`,
            target: `entity-${entities[j].type}-${j}`,
            strength: 0.2,
            type: 'entity-entity'
          });
        }
      }
    }
  }

  return { categories, conceptGraph };
}

/**
 * Extract entity-topic relationships for visualization
 */
export function linkEntitiesToTopics(entities, topics) {
  if (!entities || !topics) return [];

  const links = [];

  entities.forEach((entity, entityIdx) => {
    const entityId = `entity-${entityIdx}`;
    const entityNorm = (entity.normalized || entity.canonical || '').toLowerCase();

    topics.forEach(topic => {
      // Find matching words in topic
      const matches = topic.words.filter(word => {
        const wordNorm = word.word.toLowerCase();
        return wordNorm.includes(entityNorm) ||
               entityNorm.includes(wordNorm) ||
               jaroWinklerSimilarity(wordNorm, entityNorm) > 0.85;
      });

      if (matches.length > 0) {
        const strength = matches.reduce((sum, w) => sum + w.probability, 0);
        links.push({
          source: entityId,
          target: topic.id,
          strength,
          type: 'entity-topic',
          matchedWords: matches.map(m => m.word)
        });
      }
    });
  });

  return links;
}

export default {
  extractEntities,
  consolidateEntities,
  buildTaxonomy,
  linkEntitiesToTopics
};
