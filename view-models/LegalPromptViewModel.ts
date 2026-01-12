import { formatEINOrPending } from '../utils/formatters';
import { CITATIONS } from '../utils/citations';
import { Entity, LegalInstrumentType } from '../types';

/**
 * Generates AI prompts for legal documents.
 * This separates UI logic from prompt engineering (View-Model pattern).
 */
export const getLegalInstrumentPrompt = (
    docType: LegalInstrumentType,
    entity: Entity,
    details: {
        repName: string,
        repAddress: string,
        cafNo: string,
        authMatters: string,
        taxYears: string,
        fiduciaryTitle: string,
        evidenceDate: string
    }
): string => {
    const commonContext = `[Ref: ${CITATIONS.IRS_10_1_1}]`;

    if (docType === 'Power of Attorney') {
        return `Generate a Power of Attorney and Declaration of Representative (similar to IRS Form 2848).
        Taxpayer: ${entity.name}, EIN: ${formatEINOrPending(entity.einLast4)}.
        Representative: ${details.repName}, Address: ${details.repAddress}, CAF: ${details.cafNo}.
        Matters: ${details.authMatters}. Years: ${details.taxYears}.
        Include standard acts authorized (receive info, sign returns). ${commonContext}`;
    }

    if (docType === 'Fiduciary Notice') {
        return `Generate a Notice of Fiduciary Relationship (similar to IRS Form 56).
        Fiduciary: ${entity.name} (acting as ${details.fiduciaryTitle}).
        Authority Evidence: Trust Indenture/Letters Testamentary dated ${details.evidenceDate}.
        Address: ${(entity as any).address || '[Insert Entity Address]'}.
        Powers: Full authority to perform all acts required of taxpayer. ${commonContext}`;
    }

    return `Generate a ${docType} for local court filing. 
    Entity: ${entity.name}. 
    EIN: ${formatEINOrPending(entity.einLast4)}. 
    Address: ${(entity as any).address || '[Insert Entity Address]'}.
    Use official legal language. ${commonContext}`;
};
