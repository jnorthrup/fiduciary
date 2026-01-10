
import { JurisdictionType } from '../types';

/**
 * PROVENANCE SERVICE
 * 
 * Models legal citations as a directed graph where:
 * - Nodes are legal citations (statutes, regulations, case law)
 * - Edges represent dependency relationships
 * - Effects define what operations each citation enables/blocks
 * 
 * This transforms compliance from decorative citations to executable constraints.
 */

// ============================================================================
// TYPES
// ============================================================================

export type CitationSource = 'USC' | 'CFR' | 'UCC' | 'IRM' | 'COMMON_LAW' | 'OCC' | 'TFM' | 'CIRCULAR';

export interface LegalCitation {
    id: string;
    code: string;           // e.g., "26 CFR § 1.671-1"
    title: string;
    source: CitationSource;
    jurisdictions: JurisdictionType[];
    dependencies: string[]; // IDs of citations this rule depends on
    effects: RuleEffect[];  // What operations this citation governs
    summary: string;        // Human-readable explanation
}

export interface RuleEffect {
    operation: string;      // e.g., "POST_JOURNAL", "ISSUE_INSTRUMENT", "FILE_RETURN"
    constraint: 'REQUIRE' | 'BLOCK' | 'AUDIT';
    description: string;
}

export interface ProvenanceChain {
    citations: LegalCitation[];
    rootCitation: string;
    effectivePath: string[];
}

const API_BASE = 'http://localhost:3001/api';

export let CITATION_GRAPH: LegalCitation[] = [];

// Initialize graph from API
export async function refreshCitationGraph() {
    try {
        const response = await fetch(`${API_BASE}/citations`);
        CITATION_GRAPH = await response.json();
    } catch (err) {
        console.error('Failed to refresh citation graph', err);
    }
}

// ============================================================================
// GRAPH OPERATIONS
// ============================================================================

/**
 * Get a citation by ID
 */
export function getCitation(id: string): LegalCitation | undefined {
    return CITATION_GRAPH.find(c => c.id === id);
}

/**
 * Get all citations that match a jurisdiction
 */
export function getCitationsByJurisdiction(jurisdiction: JurisdictionType): LegalCitation[] {
    return CITATION_GRAPH.filter(c => c.jurisdictions.includes(jurisdiction));
}

/**
 * Get all citations that affect a specific operation
 */
export function getCitationsByOperation(operation: string): LegalCitation[] {
    return CITATION_GRAPH.filter(c =>
        c.effects.some(e => e.operation === operation)
    );
}

/**
 * Build the full provenance chain for a citation (walks dependency graph)
 */
export async function getProvenanceChain(citationId: string): Promise<ProvenanceChain> {
    try {
        const response = await fetch(`${API_BASE}/provenance/${citationId}`);
        return await response.json();
    } catch (err) {
        console.error('Failed to fetch provenance chain', err);
        return {
            citations: [],
            rootCitation: citationId,
            effectivePath: []
        };
    }
}

/**
 * Get all rules that apply to an operation, with their constraint type
 */
export async function getOperationConstraints(operation: string): Promise<Array<{
    citation: LegalCitation;
    effect: RuleEffect;
    provenanceChain: ProvenanceChain;
}>> {
    const results: Array<{
        citation: LegalCitation;
        effect: RuleEffect;
        provenanceChain: ProvenanceChain;
    }> = [];

    for (const citation of CITATION_GRAPH) {
        for (const effect of citation.effects) {
            if (effect.operation === operation) {
                results.push({
                    citation,
                    effect,
                    provenanceChain: await getProvenanceChain(citation.id)
                });
            }
        }
    }

    return results;
}

/**
 * Format provenance chain for AI context injection
 */
export function formatProvenanceForAI(jurisdictions: JurisdictionType[]): string {
    const applicableCitations = CITATION_GRAPH.filter(c =>
        c.jurisdictions.some(j => jurisdictions.includes(j))
    );

    return applicableCitations.map(c =>
        `[${c.id}] ${c.code}: ${c.title}\n  Summary: ${c.summary}\n  Effects: ${c.effects.map(e => `${e.operation}(${e.constraint})`).join(', ')}`
    ).join('\n\n');
}

/**
 * Get citation IDs that REQUIRE a specific operation (for AI grounding)
 */
export function getRequiredCitationsForOperation(operation: string): string[] {
    return CITATION_GRAPH
        .filter(c => c.effects.some(e => e.operation === operation && e.constraint === 'REQUIRE'))
        .map(c => c.id);
}
