import { v4 as uuidv4 } from 'uuid';
import { execute, initDb, query } from './db';

const CITATION_GRAPH = [
    {
        id: 'USC_26_6001',
        code: '26 U.S.C. § 6001',
        title: 'Records Retention Requirement',
        source: 'USC',
        jurisdictions: ['Federal (IRS)'],
        dependencies: [],
        effects: [
            { operation: 'POST_JOURNAL', constraint: 'REQUIRE', description: 'All transactions must have supporting records' },
            { operation: 'MODIFY_JOURNAL', constraint: 'AUDIT', description: 'Changes to closed records must be logged' }
        ],
        summary: 'Every person liable for tax shall keep such records as the Secretary may prescribe.'
    },
    {
        id: 'CFR_26_1_671',
        code: '26 CFR § 1.671-1',
        title: 'Grantor Trust Rules',
        source: 'CFR',
        jurisdictions: ['Federal (IRS)'],
        dependencies: ['USC_26_6001'],
        effects: [
            { operation: 'CHANGE_TRUST_TYPE', constraint: 'BLOCK', description: 'Irrevocable trusts cannot be modified' },
            { operation: 'DISTRIBUTION', constraint: 'REQUIRE', description: 'Distributions must follow trust terms' }
        ],
        summary: 'Rules determining when grantor is treated as owner of trust for income tax purposes.'
    },
    {
        id: 'USC_31_3325',
        code: '31 U.S.C. § 3325',
        title: 'Voucher Requirement',
        source: 'USC',
        jurisdictions: ['Federal (IRS)'],
        dependencies: [],
        effects: [
            { operation: 'DISBURSEMENT', constraint: 'REQUIRE', description: 'All disbursements require certified voucher' },
            { operation: 'POST_JOURNAL', constraint: 'REQUIRE', description: 'Cash outflows must have reference memo' }
        ],
        summary: 'Disbursements must be accompanied by a voucher certified by a certifying officer.'
    },
    {
        id: 'TFM_VOL1_4A',
        code: 'TFM Vol I, Part 4A',
        title: 'Treasury Disbursement Procedures',
        source: 'TFM',
        jurisdictions: ['Federal (IRS)'],
        dependencies: ['USC_31_3325'],
        effects: [
            { operation: 'WIRE_TRANSFER', constraint: 'REQUIRE', description: 'Must follow Treasury disbursement chain' },
            { operation: 'ACH_DEBIT', constraint: 'AUDIT', description: 'ACH debits logged for Treasury compliance' }
        ],
        summary: 'Detailed procedures for Treasury disbursements and fund transfers.'
    },
    {
        id: 'CIRC_230_10_3',
        code: 'Circular 230 § 10.3',
        title: 'Who May Practice Before IRS',
        source: 'CIRCULAR',
        jurisdictions: ['Federal (IRS)'],
        dependencies: [],
        effects: [
            { operation: 'FILE_RETURN', constraint: 'REQUIRE', description: 'Only authorized practitioners may file' },
            { operation: 'REPRESENT_TAXPAYER', constraint: 'REQUIRE', description: 'Requires enrollment or authorization' }
        ],
        summary: 'Defines who is authorized to practice before the Internal Revenue Service.'
    },
    {
        id: 'CIRC_230_10_7',
        code: 'Circular 230 § 10.7',
        title: 'Enrolled Agent Requirements',
        source: 'CIRCULAR',
        jurisdictions: ['Federal (IRS)'],
        dependencies: ['CIRC_230_10_3'],
        effects: [
            { operation: 'EA_RENEWAL', constraint: 'REQUIRE', description: 'EAs must maintain continuing education' }
        ],
        summary: 'Requirements for enrollment and practice as an enrolled agent.'
    },
    {
        id: 'OCC_12_CFR_9_6',
        code: '12 CFR § 9.6',
        title: 'Fiduciary Review Requirement',
        source: 'OCC',
        jurisdictions: ['Federal (IRS)', 'Article 1 (Statutory)'],
        dependencies: [],
        effects: [
            { operation: 'ACCEPT_FIDUCIARY', constraint: 'REQUIRE', description: 'Pre-acceptance review before taking fiduciary role' },
            { operation: 'ANNUAL_REVIEW', constraint: 'REQUIRE', description: 'Annual review of all fiduciary accounts' },
            { operation: 'CLOSE_FIDUCIARY', constraint: 'REQUIRE', description: 'Post-closing review required' }
        ],
        summary: 'National banks must conduct reviews upon accepting, annually, and upon closing fiduciary accounts.'
    },
    {
        id: 'OCC_12_CFR_9_13',
        code: '12 CFR § 9.13',
        title: 'Prohibition on Commingling',
        source: 'OCC',
        jurisdictions: ['Federal (IRS)', 'Article 1 (Statutory)'],
        dependencies: ['OCC_12_CFR_9_6'],
        effects: [
            { operation: 'POST_JOURNAL', constraint: 'BLOCK', description: 'Cannot book personal expenses to fiduciary accounts' },
            { operation: 'TRANSFER_FUNDS', constraint: 'AUDIT', description: 'Cross-entity transfers require segregation' }
        ],
        summary: 'Fiduciary assets must be kept separate from the bank\'s proprietary assets.'
    },
    {
        id: 'UCC_3_104',
        code: 'UCC § 3-104',
        title: 'Negotiable Instruments',
        source: 'UCC',
        jurisdictions: ['Article 1 (Statutory)', 'Local/State'],
        dependencies: [],
        effects: [
            { operation: 'ISSUE_INSTRUMENT', constraint: 'REQUIRE', description: 'Instrument must meet negotiability requirements' },
            { operation: 'DISCHARGE_INSTRUMENT', constraint: 'REQUIRE', description: 'Discharge must follow holder rules' }
        ],
        summary: 'Defines requirements for a writing to be a negotiable instrument.'
    },
    {
        id: 'UCC_9_203',
        code: 'UCC § 9-203',
        title: 'Attachment of Security Interest',
        source: 'UCC',
        jurisdictions: ['Article 1 (Statutory)', 'Local/State'],
        dependencies: ['UCC_3_104'],
        effects: [
            { operation: 'CREATE_PLEDGE', constraint: 'REQUIRE', description: 'Security interest must attach per UCC requirements' },
            { operation: 'PERFECT_INTEREST', constraint: 'REQUIRE', description: 'Filing required to perfect security interest' }
        ],
        summary: 'Requirements for a security interest to attach to collateral.'
    },
    {
        id: 'IRM_1_15_2',
        code: 'IRM 1.15.2',
        title: 'Records Control Schedule',
        source: 'IRM',
        jurisdictions: ['Federal (IRS)'],
        dependencies: ['USC_26_6001'],
        effects: [
            { operation: 'MODIFY_JOURNAL', constraint: 'BLOCK', description: 'Cannot modify closed period records' },
            { operation: 'DELETE_RECORD', constraint: 'BLOCK', description: 'Records under retention cannot be deleted' }
        ],
        summary: 'IRS records control and retention requirements.'
    }
];

async function migrate() {
    await initDb();
    console.log('Migrating data...');

    for (const citation of CITATION_GRAPH) {
        await execute(
            'INSERT INTO citations (id, code, title, source, summary) VALUES (?, ?, ?, ?, ?)',
            [citation.id, citation.code, citation.title, citation.source, citation.summary]
        );

        for (const jurisdiction of citation.jurisdictions) {
            await execute(
                'INSERT INTO jurisdictions (citation_id, jurisdiction_name) VALUES (?, ?)',
                [citation.id, jurisdiction]
            );
        }

        for (const depId of citation.dependencies) {
            await execute(
                'INSERT INTO dependencies (citation_id, dependency_id) VALUES (?, ?)',
                [citation.id, depId]
            );
        }

        for (const effect of citation.effects) {
            await execute(
                'INSERT INTO rule_effects (id, citation_id, operation, constraint_type, description) VALUES (?, ?, ?, ?, ?)',
                [uuidv4(), citation.id, effect.operation, effect.constraint, effect.description]
            );
        }
    }

    console.log('Migration complete.');
}

migrate().catch(console.error);
