import { describe, it, expect } from 'vitest';
import { AffidavitValidator, ValidationSeverity } from './affidavit-validator';
import { Affidavit } from '../../types/admin-process';

describe('AffidavitValidator', () => {
    const validator = new AffidavitValidator();

    it('should return valid result for a complete affidavit', () => {
        const affidavit: Partial<Affidavit> = {
            affiant: { name: 'John Doe', title: 'Director' },
            claims: [
                {
                    description: 'Claim 1',
                    legalBasis: 'Common Law',
                    supportingCitations: [{ type: 'statute', title: 'Test Act', section: '1', url: 'http://example.com' }]
                }
            ]
        };
        const result = validator.validate(affidavit);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should warn if a claim has no citations', () => {
        const affidavit: Partial<Affidavit> = {
            affiant: { name: 'John Doe', title: 'Director' },
            claims: [
                { description: 'Claim without proof', legalBasis: 'Assertion', supportingCitations: [] }
            ]
        };
        const result = validator.validate(affidavit);
        // It is valid (no errors), but has warnings
        expect(result.isValid).toBe(true);
        expect(result.errors).toContainEqual(expect.objectContaining({
            field: 'claims[0].supportingCitations',
            message: 'Claim has no supporting citations.',
            severity: ValidationSeverity.Warning
        }));
    });

    it('should fail if affiant name is missing', () => {
        const affidavit: Partial<Affidavit> = {
            affiant: { title: 'Director' } as any,
            claims: []
        };
        const result = validator.validate(affidavit);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({
            field: 'affiant.name',
            message: 'Affiant Name is required.',
            severity: ValidationSeverity.Error
        }));
    });

    it('should fail if claims array is empty', () => {
        const affidavit: Partial<Affidavit> = {
            affiant: { name: 'John Doe' },
            claims: []
        };
        const result = validator.validate(affidavit);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({
            field: 'claims',
            message: 'At least one claim is required.',
            severity: ValidationSeverity.Error
        }));
    });

    it('should fail if a claim lacks a description', () => {
        const affidavit: Partial<Affidavit> = {
            affiant: { name: 'John Doe' },
            claims: [
                { description: '', legalBasis: 'Statute' }
            ]
        };
        const result = validator.validate(affidavit);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({
            field: 'claims[0].description',
            message: 'Claim description cannot be empty.',
            severity: ValidationSeverity.Error
        }));
    });

    it('should fail if a claim lacks a legal basis', () => {
        const affidavit: Partial<Affidavit> = {
            affiant: { name: 'John Doe' },
            claims: [
                { description: 'Valid claim', legalBasis: '' }
            ]
        };
        const result = validator.validate(affidavit);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(expect.objectContaining({
            field: 'claims[0].legalBasis',
            message: 'Claim requires a legal basis.',
            severity: ValidationSeverity.Error
        }));
    });
});
