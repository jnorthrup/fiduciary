/**
 * LDA (Latent Dirichlet Allocation) Engine
 * A lightweight JavaScript implementation using collapsed Gibbs sampling.
 */

import { isStopword, removeStopwords } from './stopwords.js';

/**
 * Tokenize text into words
 * @param {string} text - Input text
 * @returns {string[]} Array of tokens
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];

  // Convert to lowercase
  const normalized = text.toLowerCase();

  // Extract words (alphanumeric plus apostrophes, hyphens)
  const words = normalized
    .replace(/[^\w\s'-]/g, ' ') // Remove punctuation but keep apostrophes, hyphens
    .split(/\s+/)
    .filter(w => w.length > 2) // Filter out very short words
    .filter(w => !/^\d+$/.test(w)) // Filter out pure numbers
    .filter(w => !isStopword(w));

  return words;
}

/**
 * Build vocabulary and document-term matrix
 * @param {string[]} documents - Array of document texts
 * @returns {Object} { vocabulary: string[], docTermMatrix: number[][] }
 */
function buildDocumentTermMatrix(documents) {
  // Tokenize all documents
  const tokenizedDocs = documents.map(doc => tokenize(doc));

  // Build vocabulary (unique words across all documents)
  const wordSet = new Set();
  tokenizedDocs.forEach(doc => {
    doc.forEach(word => wordSet.add(word));
  });
  const vocabulary = Array.from(wordSet);

  // Create word to index mapping
  const wordToIndex = {};
  vocabulary.forEach((word, idx) => {
    wordToIndex[word] = idx;
  });

  // Build document-term matrix (count of each word in each document)
  const docTermMatrix = tokenizedDocs.map(doc => {
    const counts = new Array(vocabulary.length).fill(0);
    doc.forEach(word => {
      const idx = wordToIndex[word];
      if (idx !== undefined) {
        counts[idx]++;
      }
    });
    return counts;
  });

  return { vocabulary, docTermMatrix, tokenizedDocs };
}

/**
 * Initialize topic assignments randomly
 * @param {number[][]} docTermMatrix - Document-term matrix
 * @param {number} K - Number of topics
 * @returns {Object} Assignment and count matrices
 */
function initializeAssignments(docTermMatrix, K) {
  const D = docTermMatrix.length; // Number of documents
  const V = docTermMatrix[0]?.length || 0; // Vocabulary size

  // z[d][w] = topic assigned to word w in document d
  const z = [];

  // Count matrices for collapsed Gibbs sampling
  // ndk[d][k] = number of words in document d assigned to topic k
  const ndk = Array.from({ length: D }, () => new Array(K).fill(0));

  // nkw[k][w] = number of times word w is assigned to topic k
  const nkw = Array.from({ length: K }, () => new Array(V).fill(0));

  // nk[k] = total number of words assigned to topic k
  const nk = new Array(K).fill(0);

  // Random initialization
  for (let d = 0; d < D; d++) {
    z[d] = [];
    for (let w = 0; w < V; w++) {
      const count = docTermMatrix[d][w];
      for (let i = 0; i < count; i++) {
        const topic = Math.floor(Math.random() * K);
        z[d].push(topic);
        ndk[d][topic]++;
        nkw[topic][w]++;
        nk[topic]++;
      }
    }
  }

  return { z, ndk, nkw, nk };
}

/**
 * Perform one iteration of collapsed Gibbs sampling
 * @param {Object} state - Current state including assignments and counts
 * @param {number[][]} docTermMatrix - Document-term matrix
 * @param {number} K - Number of topics
 * @param {number} D - Number of documents
 * @param {number} V - Vocabulary size
 * @param {number} alpha - Document-topic Dirichlet parameter
 * @param {number} beta - Topic-word Dirichlet parameter
 */
function gibbsIteration(state, docTermMatrix, K, D, V, alpha, beta) {
  const { z, ndk, nkw, nk } = state;
  const Vbeta = V * beta;
  const Kalpha = K * alpha;

  let wordIdx = 0;

  for (let d = 0; d < D; d++) {
    for (let w = 0; w < V; w++) {
      const count = docTermMatrix[d][w];

      for (let c = 0; c < count; c++) {
        // Current topic assignment
        const oldTopic = z[d][wordIdx];

        // Decrement counts for current assignment
        ndk[d][oldTopic]--;
        nkw[oldTopic][w]--;
        nk[oldTopic]--;

        // Calculate probability of each topic
        const probs = new Array(K);
        let probSum = 0;

        for (let k = 0; k < K; k++) {
          // P(topic | document) * P(word | topic)
          const pDocTopic = (ndk[d][k] + alpha) / (docTermMatrix[d].reduce((a, b) => a + b, 0) + Kalpha);
          const pTopicWord = (nkw[k][w] + beta) / (nk[k] + Vbeta);
          probs[k] = pDocTopic * pTopicWord;
          probSum += probs[k];
        }

        // Sample new topic (using roulette wheel selection)
        const rand = Math.random() * probSum;
        let cumProb = 0;
        let newTopic = 0;

        for (let k = 0; k < K; k++) {
          cumProb += probs[k];
          if (rand <= cumProb) {
            newTopic = k;
            break;
          }
        }

        // Update assignment and counts
        z[d][wordIdx] = newTopic;
        ndk[d][newTopic]++;
        nkw[newTopic][w]++;
        nk[newTopic]++;

        wordIdx++;
      }
    }
  }

  return { z, ndk, nkw, nk };
}

/**
 * Compute topic-word distributions from final state
 * @param {Object} state - Final state after Gibbs sampling
 * @param {string[]} vocabulary - Vocabulary array
 * @param {number} beta - Topic-word Dirichlet parameter
 * @returns {Array} Topics with word distributions
 */
function computeTopicDistributions(state, vocabulary, beta) {
  const { nkw, nk } = state;
  const K = nkw.length;
  const V = vocabulary.length;

  const topics = [];

  for (let k = 0; k < K; k++) {
    const wordProbs = [];
    const totalWords = nk[k];

    for (let w = 0; w < V; w++) {
      // Add-one smoothing
      const prob = (nkw[k][w] + beta) / (totalWords + V * beta);
      if (prob > 0.001) { // Only include significant words
        wordProbs.push({
          word: vocabulary[w],
          probability: prob
        });
      }
    }

    // Sort by probability descending
    wordProbs.sort((a, b) => b.probability - a.probability);

    // Calculate topic coherence (simplified - based on top word probabilities)
    const topN = Math.min(10, wordProbs.length);
    const coherence = wordProbs.slice(0, topN)
      .reduce((sum, wp) => sum + wp.probability, 0) / topN;

    // Generate a label from top words
    const labelWords = wordProbs.slice(0, 3).map(wp => wp.word);
    const label = labelWords.join(' ');

    topics.push({
      id: `topic-${k}`,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      words: wordProbs.slice(0, 20), // Top 20 words per topic
      coherence: coherence
    });
  }

  return topics;
}

/**
 * Perform LDA topic modeling on text
 * @param {string} text - Input text to analyze
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Topics with word distributions
 */
export async function performLDA(text, options = {}) {
  const {
    numTopics = 5,
    iterations = 100,
    alpha = 0.1,
    beta = 0.01,
    minDocumentLength = 50,
    sentencesPerDocument = 5
  } = options;

  // Validate input
  if (!text || typeof text !== 'string') {
    return {
      topics: [],
      metadata: {
        error: 'Invalid input: text must be a non-empty string',
        documentCount: 0,
        vocabularySize: 0
      }
    };
  }

  // Split text into documents (by sentences)
  // Split on common sentence boundaries
  const sentenceRegex = /[.!?]+[\s\n]+/;
  const sentences = text
    .split(sentenceRegex)
    .map(s => s.trim())
    .filter(s => s.length > minDocumentLength);

  if (sentences.length === 0) {
    // If no sentences found, use paragraphs
    const paragraphs = text
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > minDocumentLength);

    if (paragraphs.length === 0) {
      // Use chunks as fallback
      const chunkSize = 500;
      const chunks = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
      }
      sentences.push(...chunks.filter(c => c.length > minDocumentLength));
    } else {
      sentences.push(...paragraphs);
    }
  }

  // Group sentences into documents
  const documents = [];
  for (let i = 0; i < sentences.length; i += sentencesPerDocument) {
    const doc = sentences.slice(i, i + sentencesPerDocument).join(' ');
    documents.push(doc);
  }

  // Limit documents for performance
  const maxDocs = Math.min(documents.length, 100);
  const workingDocs = documents.slice(0, maxDocs);

  if (workingDocs.length === 0) {
    return {
      topics: [],
      metadata: {
        error: 'No valid documents could be extracted from text',
        documentCount: 0,
        vocabularySize: 0
      }
    };
  }

  // Build document-term matrix
  const { vocabulary, docTermMatrix } = buildDocumentTermMatrix(workingDocs);

  if (vocabulary.length < numTopics * 5) {
    // Not enough vocabulary for meaningful topics
    return {
      topics: [{
        id: 'topic-0',
        label: 'General',
        words: vocabulary.slice(0, 20).map(word => ({
          word,
          probability: 1 / vocabulary.length
        })),
        coherence: 0.5
      }],
      metadata: {
        documentCount: workingDocs.length,
        vocabularySize: vocabulary.length,
        note: 'Limited vocabulary - single topic returned'
      }
    };
  }

  // Initialize assignments
  const D = workingDocs.length;
  const V = vocabulary.length;
  let state = initializeAssignments(docTermMatrix, numTopics);

  // Run Gibbs sampling iterations
  const actualIterations = Math.min(iterations, 200); // Cap for performance
  for (let i = 0; i < actualIterations; i++) {
    state = gibbsIteration(state, docTermMatrix, numTopics, D, V, alpha, beta);
  }

  // Compute final topic distributions
  const topics = computeTopicDistributions(state, vocabulary, beta);

  // Filter out topics with very low coherence
  const validTopics = topics.filter(t => t.coherence > 0.01);

  return {
    topics: validTopics.length > 0 ? validTopics : topics,
    metadata: {
      documentCount: workingDocs.length,
      vocabularySize: vocabulary.length,
      iterations: actualIterations,
      numTopics: topics.length
    }
  };
}

/**
 * Extract top terms from text without full LDA (simplified version)
 * @param {string} text - Input text
 * @param {number} topN - Number of top terms to return
 * @returns {Array} Top terms with frequencies
 */
export function extractTopTerms(text, topN = 50) {
  const words = tokenize(text);

  // Count word frequencies
  const freq = {};
  words.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });

  // Convert to array and sort
  const terms = Object.entries(freq)
    .map(([word, count]) => ({
      word,
      frequency: count,
      probability: count / words.length
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, topN);

  return {
    terms,
    totalWords: words.length,
    uniqueWords: Object.keys(freq).length
  };
}

export default { performLDA, extractTopTerms };
// Server test
