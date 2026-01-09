
import { MetaRule, ComplianceViolation, UserRole, EntityRole, JournalEntry, DCFlag, ComplianceFiling, TaxModule } from '../types';
import { getProvenanceChain, getCitation, LegalCitation, ProvenanceChain } from './provenanceService';

/**
 * IRS & TREASURY REGULATION ENFORCEMENT ENGINE
 * 
 * Implements logic gates based on:
 * - Circular 230 (Practice before the IRS)
 * - TFM (Treasury Financial Manual)
 * - OCC Regulation 9 (Fiduciary Activities)
 * 
 * Now integrated with ProvenanceService for full legal citation ancestry.
 */

// Extended violation type with provenance chain
export interface ComplianceViolationWithProvenance extends ComplianceViolation {
    provenanceChain: ProvenanceChain;
    applicableCitations: LegalCitation[];
}

// Extended MetaRule with provenance linkage
interface MetaRuleWithProvenance extends MetaRule {
    primaryCitationId: string;  // Links to provenanceService citation graph
    relatedCitationIds: string[];
}

export const META_RULES: MetaRuleWithProvenance[] = [
    {
        id: 'AUTH_FILING',
        name: 'Authorized Signatory Check',
        citation: 'Circular 230 § 10.3 / 10.7',
        description: 'Only authorized individuals (Trustees/Owners) can execute tax filings.',
        primaryCitationId: 'CIRC_230_10_3',
        relatedCitationIds: ['CIRC_230_10_7'],
        evaluate: (ctx: { userRole: UserRole, action: 'FILE_RETURN' }) => {
            const authorized: UserRole[] = ['Owner', 'Beneficial Owner', 'Admin']; // Trustee equivalent
            if (!authorized.includes(ctx.userRole) && ctx.action === 'FILE_RETURN') {
                return {
                    ruleId: 'AUTH_FILING',
                    title: 'Unauthorized Practice',
                    citation: 'Circular 230 § 10.3(d)',
                    severity: 'Block',
                    details: 'Current user role does not have Fiduciary authority to sign or file federal returns.'
                };
            }
            return null;
        }
    },
    {
        id: 'VOUCHER_REQ',
        name: 'Voucher Requirement for Disbursements',
        citation: '31 U.S.C. § 3325 / TFM Vol I, Part 4A',
        description: 'Disbursements must be accompanied by a voucher certified by a certifying officer.',
        primaryCitationId: 'USC_31_3325',
        relatedCitationIds: ['TFM_VOL1_4A'],
        evaluate: (ctx: { journal: JournalEntry, action: 'POST_JOURNAL' }) => {
            // Check for Cash Credits (Outflows) without a memo/ref
            const hasCashOutflow = ctx.journal.lines.some(l =>
                (l.accountCode === '101000' || l.accountCode === '103000') && l.dc === DCFlag.Credit
            );

            if (hasCashOutflow && (!ctx.journal.memo || ctx.journal.memo.length < 5)) {
                return {
                    ruleId: 'VOUCHER_REQ',
                    title: 'Unvouchered Disbursement',
                    citation: '31 U.S.C. § 3325(a)(1)',
                    severity: 'Block',
                    details: 'Disbursement of funds requires a certified voucher or specific reference memo describing the public purpose.'
                };
            }
            return null;
        }
    },
    {
        id: 'CLOSED_PERIOD',
        name: 'Record Integrity - Closed Period',
        citation: 'IRM 1.15.2 (Records Control)',
        description: 'Prevents modification of financial records in a closed tax period.',
        primaryCitationId: 'IRM_1_15_2',
        relatedCitationIds: ['USC_26_6001'],
        evaluate: (ctx: { module?: TaxModule, action: 'POST_JOURNAL' }) => {
            if (ctx.module && ctx.module.status === 'Closed') {
                return {
                    ruleId: 'CLOSED_PERIOD',
                    title: 'Closed Period Violation',
                    citation: 'IRM 1.15.2',
                    severity: 'Block',
                    details: 'Cannot post entries to a Tax Module that has been reconciled and closed.'
                };
            }
            return null;
        }
    },
    {
        id: 'TRUST_IRREVOCABILITY',
        name: 'Irrevocable Trust Modification',
        citation: '26 CFR § 1.671-1',
        description: 'Prevents changing the fundamental structure of an Irrevocable Trust.',
        primaryCitationId: 'CFR_26_1_671',
        relatedCitationIds: ['USC_26_6001'],
        evaluate: (ctx: { entityType: string, trustSubType: string, action: 'CHANGE_TYPE' }) => {
            if (ctx.entityType === 'TRUST' && ctx.trustSubType === 'IRREVOCABLE') {
                return {
                    ruleId: 'TRUST_IRREVOCABILITY',
                    title: 'Violation of Irrevocability',
                    citation: 'Common Law / 26 CFR § 1.671',
                    severity: 'Block',
                    details: 'Entity is designated Irrevocable. Structure type cannot be modified without court order (cy pres).'
                };
            }
            return null;
        }
    },
    {
        id: 'COMMINGLING',
        name: 'Prohibition on Commingling',
        citation: 'OCC 12 CFR § 9.13',
        description: 'Fiduciary assets must be kept separate from the bank\'s proprietary assets.',
        primaryCitationId: 'OCC_12_CFR_9_13',
        relatedCitationIds: ['OCC_12_CFR_9_6'],
        evaluate: (ctx: { entityRole: EntityRole, journal: JournalEntry }) => {
            // Simplistic check: If Entity is a Trustee (Individual) using Trust Asset accounts directly
            // In a real app, this checks cross-entity journal lines without inter-company clearing
            // Here we assume checking if a personal expense is booked to a Trust
            if (ctx.entityRole === 'HOLDING_TRUST' && ctx.journal.type === 'PERSONAL_EXPENSE') {
                return {
                    ruleId: 'COMMINGLING',
                    title: 'Fiduciary Commingling',
                    citation: '12 CFR § 9.13(a)',
                    severity: 'Warning',
                    details: 'Personal expenses cannot be booked directly to Fiduciary accounts without treated as a Distribution.'
                };
            }
            return null;
        }
    }
];

/**
 * Original compliance check (backward compatible)
 */
export const checkCompliance = (ruleIds: string[], context: any): ComplianceViolation | null => {
    for (const rule of META_RULES) {
        if (ruleIds.includes(rule.id) || ruleIds.includes('ALL')) {
            const violation = rule.evaluate(context);
            if (violation) return violation;
        }
    }
    return null;
};

/**
 * Enhanced compliance check with full provenance chain
 * Returns violations enriched with legal citation ancestry
 */
export const checkComplianceWithProvenance = (
    ruleIds: string[],
    context: any
): ComplianceViolationWithProvenance | null => {
    for (const rule of META_RULES) {
        if (ruleIds.includes(rule.id) || ruleIds.includes('ALL')) {
            const violation = rule.evaluate(context);
            if (violation) {
                // Build provenance chain from primary citation
                const provenanceChain = getProvenanceChain(rule.primaryCitationId);

                // Collect all applicable citations
                const applicableCitations: LegalCitation[] = [];
                const primaryCitation = getCitation(rule.primaryCitationId);
                if (primaryCitation) applicableCitations.push(primaryCitation);

                for (const relatedId of rule.relatedCitationIds) {
                    const related = getCitation(relatedId);
                    if (related) applicableCitations.push(related);
                }

                return {
                    ...violation,
                    provenanceChain,
                    applicableCitations
                };
            }
        }
    }
    return null;
};

/**
 * Get all rules applicable to an operation with their provenance
 */
export const getRulesForOperation = (operation: string): MetaRuleWithProvenance[] => {
    // Map operations to rule IDs based on what the rules check
    const operationRuleMap: Record<string, string[]> = {
        'FILE_RETURN': ['AUTH_FILING'],
        'POST_JOURNAL': ['VOUCHER_REQ', 'CLOSED_PERIOD', 'COMMINGLING'],
        'CHANGE_TYPE': ['TRUST_IRREVOCABILITY'],
        'DISBURSEMENT': ['VOUCHER_REQ'],
        'MODIFY_JOURNAL': ['CLOSED_PERIOD']
    };

    const ruleIds = operationRuleMap[operation] || [];
    return META_RULES.filter(r => ruleIds.includes(r.id));
};

/**
 * Format compliance rules for AI context (with provenance)
 */
export const formatRulesForAI = (): string => {
    return META_RULES.map(rule => {
        const chain = getProvenanceChain(rule.primaryCitationId);
        return `[${rule.id}] ${rule.name}
  Citation: ${rule.citation}
  Description: ${rule.description}
  Provenance Path: ${chain.effectivePath.join(' → ')}`;
    }).join('\n\n');
};
