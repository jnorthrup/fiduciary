import { describe, it, expect } from 'vitest';
import { OriginalIssuerTemplate } from './OriginalIssuer';
import { UsuryAssignmentTemplate } from './UsuryAssignment';
import { TemplateEngine } from '../affidavit-template';

describe('Additional Templates', () => {
    const engine = new TemplateEngine();
    engine.registerTemplate(OriginalIssuerTemplate);
    engine.registerTemplate(UsuryAssignmentTemplate);

    describe('OriginalIssuer Template', () => {
        it('should render correctly', () => {
            const vars = {
                affiantName: 'Alice Maker',
                instrumentDate: '2023-01-01',
                creditorName: 'Big Bank Inc',
                originalAmount: '$10,000'
            };

            const result = engine.renderTemplate(OriginalIssuerTemplate, vars);
            expect(result.title).toContain('Affidavit of Original Issue');
            expect(result.claims?.some(c => c.id === 'claim-creation')).toBe(true);
            expect(result.claims?.find(c => c.id === 'claim-creation')?.description).toContain('Alice Maker');
        });

        it('should require creditorName', () => {
            expect(() => engine.renderTemplate(OriginalIssuerTemplate, { affiantName: 'Test', instrumentDate: '2023-01-01' })).toThrow('creditorName is required');
        });
    });

    describe('UsuryAssignment Template', () => {
        it('should render correctly when rate exceeds limit', () => {
            const vars = {
                affiantName: 'Bob Borrower',
                interestRate: '15',
                stateLimit: '10',
                state: 'Texas',
                lenderName: 'Shark Loans'
            };

            const result = engine.renderTemplate(UsuryAssignmentTemplate, vars);
            expect(result.title).toContain('Affidavit of Usury Violation');
            expect(result.claims?.find(c => c.id === 'claim-violation')?.description).toContain('exceeds the legal limit by 5.00%');
        });

        it('should throw error if rate is below limit', () => {
            const vars = {
                affiantName: 'Bob Borrower',
                interestRate: '5',
                stateLimit: '10',
                state: 'Texas'
            };
            expect(() => engine.renderTemplate(UsuryAssignmentTemplate, vars)).toThrow('does not exceed state limit');
        });
    });
});
