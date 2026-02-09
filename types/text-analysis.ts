/**
 * Text Analysis Types
 * Types for LDA topic modeling, entity extraction, and visualization.
 */

/**
 * A topic discovered by LDA with its word distribution
 */
export interface Topic {
  /** Unique topic identifier */
  id: string;
  /** Human-readable label for the topic */
  label: string;
  /** Words associated with this topic and their probabilities */
  words: TopicWord[];
  /** Coherence score for this topic (0-1) */
  coherence: number;
}

/**
 * A word with its probability in a topic
 */
export interface TopicWord {
  /** The word text */
  word: string;
  /** Probability of this word in the topic */
  probability: number;
}

/**
 * A consolidated entity (variations grouped together)
 */
export interface ConsolidatedEntity {
  /** Canonical form of the entity name */
  canonical: string;
  /** Alternative variations found in text */
  variations: string[];
  /** Total frequency count across all variations */
  count: number;
  /** Entity type category */
  type: EntityType;
  /** Normalized form for comparison */
  normalized?: string;
}

/**
 * Entity type categories
 */
export type EntityType =
  | 'organization'
  | 'person'
  | 'location'
  | 'legal'
  | 'financial'
  | 'tax'
  | 'form'
  | 'date'
  | 'money'
  | 'concept'
  | 'other';

/**
 * A node in the taxonomy hierarchy
 */
export interface TaxonomyNode {
  /** Unique node identifier */
  id: string;
  /** Display label */
  label: string;
  /** Node type */
  type: string;
  /** Parent node ID if part of hierarchy */
  parentId?: string;
  /** Child nodes */
  children?: TaxonomyNode[];
}

/**
 * A word/node in the word cloud visualization
 */
export interface WordNode {
  /** Unique identifier */
  id: string;
  /** The word text */
  text: string;
  /** Font size for visualization */
  size: number;
  /** X position */
  x?: number;
  /** Y position */
  y?: number;
  /** Associated topic ID if applicable */
  topicId?: string;
  /** Entity type if applicable */
  entityType?: string;
  /** Node value (frequency/probability) */
  value: number;
  /** Display color */
  color?: string;
  /** Type of word/node */
  type?: 'topic-word' | 'entity';
  /** Calculated dimensions */
  width?: number;
  height?: number;
}

/**
 * A link/relationship between concepts
 */
export interface ConceptLink {
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Relationship strength */
  strength: number;
  /** Type of relationship */
  type: 'topic-entity' | 'entity-entity' | 'topic-topic' | 'entity-topic';
  /** Matched words (for entity-topic links) */
  matchedWords?: string[];
}

/**
 * Word cloud visualization data
 */
export interface WordCloudData {
  /** Nodes in the word cloud */
  nodes: WordNode[];
  /** Raw SVG content */
  svgData: string;
  /** Layout information */
  layout: {
    type: string;
    width: number;
    height: number;
  };
}

/**
 * Concept graph data for force-directed visualization
 */
export interface ConceptGraph {
  /** Nodes in the graph */
  nodes: GraphNode[];
  /** Links between nodes */
  links: ConceptLink[];
}

/**
 * A node in the concept graph
 */
export interface GraphNode {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Node type */
  type: 'topic' | 'entity';
  /** Entity subtype for entity nodes */
  entityType?: string;
  /** Node value/score */
  value: number;
  /** Display color */
  color: string;
  /** Node radius for visualization */
  radius: number;
  /** X position */
  x?: number;
  /** Y position */
  y?: number;
  /** Fixed X position (if locked) */
  fx?: number | null;
  /** Fixed Y position (if locked) */
  fy?: number | null;
  /** Additional topic words */
  words?: string;
}

/**
 * Analysis options
 */
export interface AnalysisOptions {
  /** Number of topics to extract */
  numTopics?: number;
  /** Gibbs sampling iterations */
  iterations?: number;
  /** LDA alpha parameter */
  alpha?: number;
  /** LDA beta parameter */
  beta?: number;
  /** Minimum word frequency */
  minWordFrequency?: number;
  /** Include taxonomy in results */
  includeTaxonomy?: boolean;
}

/**
 * Complete text analysis result
 */
export interface AnalysisResult {
  /** Unique analysis identifier */
  id: string;
  /** When the analysis was created */
  createdAt: string;
  /** When the analysis was last updated */
  updatedAt: string;
  /** Preview of the analyzed text */
  textPreview: string;
  /** Length of the analyzed text */
  textLength: number;
  /** Options used for analysis */
  options: AnalysisOptions;
  /** Extracted topics */
  topics: Topic[];
  /** Consolidated entities */
  entities: ConsolidatedEntity[];
  /** Taxonomy hierarchy */
  taxonomy: TaxonomyNode[];
  /** Word cloud visualization */
  wordCloud: WordCloudData;
  /** Concept graph data */
  conceptGraph: ConceptGraph;
  /** Analysis metadata */
  metadata: AnalysisMetadata;
}

/**
 * Analysis metadata
 */
export interface AnalysisMetadata {
  /** Number of documents analyzed */
  documentCount?: number;
  /** Vocabulary size */
  vocabularySize?: number;
  /** Number of iterations performed */
  iterations?: number;
  /** Number of topics found */
  topicCount: number;
  /** Number of entities found */
  entityCount: number;
  /** Any notes or warnings */
  note?: string;
  /** Error message if analysis failed */
  error?: string;
}

/**
 * Summary of an analysis (for list views)
 */
export interface AnalysisSummary {
  /** Analysis ID */
  id: string;
  /** Creation timestamp */
  createdAt: string;
  /** Text preview */
  textPreview: string;
  /** Text length */
  textLength: number;
  /** Number of topics */
  topicCount: number;
  /** Number of entities */
  entityCount: number;
}

/**
 * Quick term analysis result
 */
export interface QuickTermResult {
  /** Top terms with frequencies */
  terms: TermFrequency[];
  /** Total word count */
  totalWords: number;
  /** Unique word count */
  uniqueWords: number;
}

/**
 * A term with its frequency
 */
export interface TermFrequency {
  /** The term/word */
  word: string;
  /** Frequency count */
  frequency: number;
  /** Probability/frequency relative to total */
  probability: number;
}

/**
 * Export format options
 */
export type ExportFormat = 'wordcloud' | 'combined';

/**
 * Export request
 */
export interface ExportRequest {
  format?: ExportFormat;
}
