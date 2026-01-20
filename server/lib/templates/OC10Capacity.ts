import { AffidavitTemplate } from '../affidavit-template';
import { Affidavit, Claim } from '../../../types/admin-process';

export const OC10CapacityTemplate: AffidavitTemplate = {
    name: 'OC10Capacity',
    description: 'Affidavit of Authority and Capacity for Federal Reserve Operating Circular No. 10',
    render: (variables: Record<string, any>): Partial<Affidavit> => {
        const {
            affiantName,
            affiantTitle,
            entityName,
            entityType,
            resolutionDate,
            bankLocation = 'Standard'
        } = variables;

        // Validation moved to AffidavitValidator
        // We now allow partial drafts to be generated

        const timestamp = new Date().toISOString();

        const claims: Claim[] = [
            {
                id: 'claim-identity',
                description: `I, ${affiantName}, am the duly elected and qualified ${affiantTitle} of ${entityName}, a ${entityType} organized and existing under the laws of the United States.`,
                legalBasis: 'Personal Knowledge',
                supportingCitations: [],
                timestamp
            },
            {
                id: 'claim-borrower-status',
                description: `${entityName} is a "Borrower" as defined in Operating Circular No. 10, Section 2.1, being an entity that expects to incur Obligations to the Bank.`,
                legalBasis: 'Operating Circular No. 10, Section 2.1',
                supportingCitations: [
                    {
                        type: 'statute',
                        title: 'Operating Circular No. 10',
                        url: 'https://www.frbservices.org/binaries/content/assets/crsocms/resources/rules-regulations/082823-operating-circular-10.pdf',
                        section: '2.1',
                        textSnippet: 'Borrower means an entity that incurs an Obligation to the Bank.'
                    }
                ],
                timestamp
            },
            {
                id: 'claim-authority',
                description: `I have the full authority and capacity to bind ${entityName} to the terms of Operating Circular No. 10 and to pledge Collateral to the Reserve Bank.`,
                legalBasis: 'Corporate Resolution / Official Authorization',
                supportingCitations: [],
                timestamp
            }
        ];

        if (resolutionDate) {
            claims.push({
                id: 'claim-resolution',
                description: `On ${resolutionDate}, the governing body of ${entityName} passed specific resolutions authorizing the pledge of assets and the execution of the OC-10 Letter of Agreement.`,
                legalBasis: 'Corporate Records',
                supportingCitations: [
                    {
                        type: 'statute',
                        title: 'Form of OC-10 Authorizing Resolutions for Borrowers',
                        url: 'https://www.frbservices.org/forms/oc-10-authorizing-resolutions-borrowers',
                        section: 'Appendix 3'
                    }
                ],
                timestamp
            });
        }

        return {
            title: `Affidavit of Authority and Capacity regarding Federal Reserve Bank Operating Circular No. 10`,
            affiant: {
                name: affiantName,
                entityType: entityType,
                capacity: affiantTitle,
                address: { // Placeholder, expected to be merged from user profile or filled later
                    street: '',
                    city: '',
                    state: '',
                    zip: ''
                }
            },
            claims,
            timestamp,
            version: 1,
            status: 'Draft'
        };
    }
};
