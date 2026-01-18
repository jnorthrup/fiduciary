/**
 * PDF Cross-Reference System
 *
 * Handles PDF cross-references for Teach Mode, including link parsing,
 * circular reference detection, and cross-reference resolution.
 */

export interface PDFLink {
  file: string;
  page: number;
  section?: number;
  paragraph?: number;
}

export interface CrossReference {
  sourceFieldId: string;
  targetPdfLink: string;
  targetFieldId?: string;
  relationship: 'see_also' | 'defined_in' | 'example_in' | 'related_to';
}

export type CrossReferenceGraph = Record<string, string[]>;

/**
 * Parse PDF link string into structured PDFLink object.
 * Format: file#page.section.paragraph (e.g., i1099nec.pdf#p12.s3.p4)
 * where p=page, s=section, p=paragraph prefixes are used
 */
export function parsePDFLink(linkString: string): PDFLink | null {
  if (!linkString) return null;

  // Must contain # separator
  const hashIndex = linkString.indexOf('#');
  if (hashIndex === -1) return null;

  const file = linkString.slice(0, hashIndex);
  const ref = linkString.slice(hashIndex + 1);

  // Must start with 'p' for page
  if (!ref.startsWith('p')) return null;

  // Split by '.' to get parts like ["p12", "s3", "p4"] or ["p12"]
  const parts = ref.split('.');

  // Extract page number (remove 'p' prefix)
  const pageStr = parts[0].slice(1); // Remove 'p' from "p12"
  const page = parseInt(pageStr, 10);
  if (isNaN(page)) return null;

  // Build result with only defined properties
  const result: any = { file, page };

  // Optional section (format: s3 -> section: 3)
  if (parts[1]) {
    const part1 = parts[1];
    if (part1.startsWith('s')) {
      const section = parseInt(part1.slice(1), 10);
      if (!isNaN(section)) {
        result.section = section;
      }
    }
  }

  // Optional paragraph (format: p4 -> paragraph: 4)
  // Paragraph can be at parts[1] (if no section) or parts[2] (after section)
  const paragraphIndex = result.section !== undefined ? 2 : 1;
  if (parts[paragraphIndex]) {
    const paragraphPart = parts[paragraphIndex];
    if (paragraphPart.startsWith('p')) {
      const paragraph = parseInt(paragraphPart.slice(1), 10);
      if (!isNaN(paragraph)) {
        result.paragraph = paragraph;
      }
    }
  }

  return result;
}

/**
 * Detect circular references in cross-reference graph using DFS.
 */
export function detectCircularReferences(graph: CrossReferenceGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph[node] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = [...path.slice(cycleStart), neighbor];
        cycles.push(cycle);
      }
    }

    recursionStack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

/**
 * Resolve cross-references for a given source field.
 * Optionally filter by relationship type.
 */
export function resolveCrossReference(
  xrefs: CrossReference[],
  sourceFieldId: string,
  relationshipType?: CrossReference['relationship']
): CrossReference[] | null {
  const filtered = xrefs.filter(xref => xref.sourceFieldId === sourceFieldId);

  if (filtered.length === 0) return null;

  if (relationshipType) {
    const byType = filtered.filter(xref => xref.relationship === relationshipType);
    return byType.length > 0 ? byType : null;
  }

  return filtered;
}

/**
 * Build cross-reference graph from cross-reference list.
 */
export function buildCrossReferenceGraph(xrefs: CrossReference[]): CrossReferenceGraph {
  const graph: CrossReferenceGraph = {};

  for (const xref of xrefs) {
    if (xref.targetFieldId) {
      if (!graph[xref.sourceFieldId]) {
        graph[xref.sourceFieldId] = [];
      }
      graph[xref.sourceFieldId].push(xref.targetFieldId);
    }
  }

  return graph;
}
