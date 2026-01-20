import { Affidavit } from '../../types/admin-process';

export enum ValidationSeverity {
    Error = 'error',
    Warning = 'warning'
}

export interface ValidationError {
    field: string;
    message: string;
    severity: ValidationSeverity;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export class AffidavitValidator {
    validate(affidavit: Partial<Affidavit>): ValidationResult {
        const errors: ValidationError[] = [];

        // Validate Affiant
        if (!affidavit.affiant?.name) {
            errors.push({
                field: 'affiant.name',
                message: 'Affiant Name is required.',
                severity: ValidationSeverity.Error
            });
        }

        // Validate Claims existence
        if (!affidavit.claims || affidavit.claims.length === 0) {
            errors.push({
                field: 'claims',
                message: 'At least one claim is required.',
                severity: ValidationSeverity.Error
            });
        } else {
            // Validate individual claims
            affidavit.claims.forEach((claim, index) => {
                if (!claim.description || claim.description.trim() === '') {
                    errors.push({
                        field: `claims[${index}].description`,
                        message: 'Claim description cannot be empty.',
                        severity: ValidationSeverity.Error
                    });
                }

                if (!claim.legalBasis || claim.legalBasis.trim() === '') {
                    errors.push({
                        field: `claims[${index}].legalBasis`,
                        message: 'Claim requires a legal basis.',
                        severity: ValidationSeverity.Error
                    });
                }

                if (!claim.supportingCitations || claim.supportingCitations.length === 0) {
                    errors.push({
                        field: `claims[${index}].supportingCitations`,
                        message: 'Claim has no supporting citations.',
                        severity: ValidationSeverity.Warning
                    });
                }
            });
        }

        return {
            isValid: errors.filter(e => e.severity === ValidationSeverity.Error).length === 0,
            errors
        };
    }
}
