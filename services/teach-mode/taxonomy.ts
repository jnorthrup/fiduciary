/**
 * Taxonomy Path Resolution
 *
 * Handles taxonomy path resolution and breadcrumb generation for Teach Mode.
 */

export interface Taxonomy {
  [category: string]: {
    [subCategory: string]: string[];
  };
}

export interface TaxonomyNode {
  category: string;
  subCategory: string;
  topic: string;
}

export interface Breadcrumb {
  label: string;
  path: string[];
}

/**
 * Resolve taxonomy path to taxonomy node.
 * Returns null if path is invalid or not found in taxonomy.
 */
export function resolveTaxonomyPath(
  taxonomy: Taxonomy,
  path: string[]
): TaxonomyNode | null {
  if (!path || path.length !== 3) {
    return null;
  }

  const [category, subCategory, topic] = path;

  const categoryNode = taxonomy[category];
  if (!categoryNode) {
    return null;
  }

  const topics = categoryNode[subCategory];
  if (!topics) {
    return null;
  }

  if (!topics.includes(topic)) {
    return null;
  }

  return { category, subCategory, topic };
}

/**
 * Generate breadcrumb navigation from taxonomy path.
 * Each breadcrumb includes label and navigation path.
 */
export function generateBreadcrumbs(
  path: string[],
  separator: string = ' / '
): Breadcrumb[] {
  if (!path || path.length === 0) {
    return [];
  }

  return path.map((label, index) => ({
    label,
    path: path.slice(0, index + 1),
  }));
}
