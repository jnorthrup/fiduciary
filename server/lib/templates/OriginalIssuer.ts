import { AffidavitTemplate } from '../affidavit-template';
import { Affidavit, Claim } from '../../../types/admin-process';

export const OriginalIssuerTemplate: AffidavitTemplate = {
    name: 'OriginalIssuer',
    description: 'Affidavit of Original Issue for Credit Instruments',
    render: (variables: Record<string, any>): Partial<Affidavit> => {
        const {
            affiantName,
            affiantTitle,
            instrumentType = 'Promissory Note',
            instrumentDate,
            instrumentId,
            originalAmount,
            creditorName
        } = variables;

        // Validation moved to AffidavitValidator

        const timestamp = new Date().toISOString();

        const claims: Claim[] = [
            {
                id: 'claim-creation',
                description: `I, ${affiantName}, created and issued the ${instrumentType} (ID: ${instrumentId || 'N/A'}) dated ${instrumentDate} in the original amount of ${originalAmount || '[Amount]'}.`,
                legalBasis: 'Creator Knowledge',
                supportingCitations: [],
                timestamp
            },
            {
                id: 'claim-asset',
                description: `This ${instrumentType} represents an asset created by my signature and/or pledge of credit.`,
                legalBasis: 'Uniform Commercial Code 3-105',
                supportingCitations: [
                    {
                        type: 'statute',
                        title: 'UCC 3-105. ISSUE OF INSTRUMENT',
                        url: 'https://www.law.cornell.edu/ucc/3/3-105',
                        section: '3-105',
                        textSnippet: '"Issue" means the first delivery of an instrument by the maker or drawer...'
                    }
                ],
                timestamp
            },
            {
                id: 'claim-ownership',
                description: `I have standing as the Original Issuer and entitlement holder of the equity represented by said instrument.`,
                legalBasis: 'Equity Law',
                supportingCitations: [],
                timestamp
            }
        ];

        return {
            title: `Affidavit of Original Issue regarding ${instrumentType}`,
            affiant: {
                name: affiantName,
                entityType: 'Individual',
                capacity: affiantTitle || 'Original Issuer',
                address: {
                    street: '', city: '', state: '', zip: ''
                }
            },
            claims,
            timestamp,
            version: 1,
            status: 'Draft'
        };
    }
};
