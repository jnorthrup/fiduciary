/**
 * Common English stopwords to filter out during text analysis.
 * These are high-frequency words that carry little semantic meaning.
 */

export const STOPWORDS = new Set([
  // Articles
  'a', 'an', 'the',

  // Conjunctions
  'and', 'but', 'or', 'nor', 'for', 'so', 'yet',

  // Prepositions
  'at', 'by', 'from', 'in', 'into', 'of', 'on', 'to', 'with',
  'about', 'above', 'after', 'against', 'along', 'among', 'around',
  'as', 'before', 'behind', 'below', 'beneath', 'beside', 'between',
  'beyond', 'during', 'except', 'for', 'from', 'inside', 'onto',
  'out', 'over', 'through', 'toward', 'under', 'until', 'upon',
  'within', 'without',

  // Pronouns
  'i', 'me', 'my', 'myself', 'we', 'us', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',

  // Common verbs
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might',
  'must', 'ought',

  // Adverbs
  'very', 'too', 'just', 'also', 'only', 'then', 'now', 'here',
  'there', 'when', 'where', 'why', 'how', 'always', 'never', 'often',

  // Common adjectives
  'good', 'bad', 'new', 'old', 'big', 'small', 'more', 'most',
  'some', 'any', 'all', 'each', 'every', 'both', 'few', 'many',

  // Numbers and quantities
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'first', 'second', 'third', 'once', 'twice',

  // Common function words
  'not', 'no', 'yes', 'please', 'thank', 'thanks',
  'okay', 'ok', 'well', 'now', 'then', 'so',

  // Common filler words in transcripts
  'um', 'uh', 'ah', 'er', 'like', 'you', 'know', 'right',
  'actually', 'basically', 'literally', 'really', 'stuff', 'things',

  // Time-related
  'today', 'tomorrow', 'yesterday', 'ago', 'already', 'still', 'yet',

  // Other common words
  'said', 'says', 'going', 'got', 'get', 'got', 'come', 'came',
  'went', 'go', 'want', 'wants', 'wanted', 'need', 'needs',
  'make', 'makes', 'made', 'take', 'takes', 'took', 'taken',
  'see', 'saw', 'seen', 'look', 'looks', 'looking', 'seem', 'seems',

  // Legal/financial transcript specific
  'blah', 'blah-blah', 'etc', 'et', 'cetera',
  'versus', 'vs', 'via', 'per', 'regarding', 'concerning',

  // Single letters (often appear from OCR/transcription errors)
  'b', 'c', 'd', 'e', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n',
  'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
]);

/**
 * Check if a word is a stopword
 */
export function isStopword(word) {
  if (!word || typeof word !== 'string') return true;
  const normalized = word.toLowerCase().trim();
  return STOPWORDS.has(normalized);
}

/**
 * Remove stopwords from an array of words
 */
export function removeStopwords(words) {
  if (!Array.isArray(words)) return [];
  return words.filter(word => !isStopword(word));
}

/**
 * Add custom stopwords to the set
 */
export function addStopwords(customWords) {
  if (!Array.isArray(customWords)) return;
  customWords.forEach(word => {
    if (typeof word === 'string') {
      STOPWORDS.add(word.toLowerCase().trim());
    }
  });
}

export default STOPWORDS;
