import { describe, it, expect } from 'vitest';
import { OC10CapacityTemplate } from './OC10Capacity';
import { TemplateEngine } from '../affidavit-template';

describe('OC10Capacity Template', () => {
    const engine = new TemplateEngine();
    engine.registerTemplate(OC10CapacityTemplate);

    const validVariables = {
        affiantName: 'Jane Doe',
        affiantTitle: 'Chief Executive Officer',
        entityName: 'Acme Financial LLC',
        entityType: 'LLC',
        resolutionDate: '2023-01-15'
    };

    it('should render correctly with all required variables', () => {
        const result = engine.renderTemplate(OC10CapacityTemplate, validVariables);

        expect(result.title).toContain('Affidavit of Authority and Capacity');
        expect(result.affiant?.name).toBe('Jane Doe');
        expect(result.affiant?.capacity).toBe('Chief Executive Officer');

        // Check Claims
        expect(result.claims).toBeDefined();
        expect(result.claims?.length).toBe(4); // 3 standard + 1 resolution

        const identityClaim = result.claims?.find(c => c.id === 'claim-identity');
        expect(identityClaim?.description).toContain('Jane Doe');
        expect(identityClaim?.description).toContain('Acme Financial LLC');

        const borrowerClaim = result.claims?.find(c => c.id === 'claim-borrower-status');
        expect(borrowerClaim?.legalBasis).toContain('Section 2.1');
        expect(borrowerClaim?.supportingCitations).toHaveLength(1);
    });

    it('should omit resolution claim if date not provided', () => {
        const vars = { ...validVariables, resolutionDate: undefined };
        const result = engine.renderTemplate(OC10CapacityTemplate, vars);

        expect(result.claims?.some(c => c.id === 'claim-resolution')).toBe(false);
        expect(result.claims?.length).toBe(3);
    });

    it('should throw error if missing required variables', () => {
        const invalidVars = {
            affiantName: 'Jane Doe'
            // Missing others
        };

        expect(() => engine.renderTemplate(OC10CapacityTemplate, invalidVars)).toThrow('affiantTitle is required');
    });
});
