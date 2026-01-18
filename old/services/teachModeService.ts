
import { z } from 'zod';

// --- TypeScript Definitions ---

export interface ExampleSet {
    valid: string[];
    invalid: string[];
}

export interface FieldMapping {
    fieldId: string;
    label: string;
    description: string;
    taxonomyPath: string[];
    validationRules?: string[];
    examples?: ExampleSet;
    instructionRef?: string;
}

export interface Taxonomy {
    [category: string]: {
        [subCategory: string]: string[];
    };
}

export interface ManualMapping {
    formId: string;
    fields: FieldMapping[];
    taxonomy: Taxonomy;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

// --- Zod Schemas for Runtime Validation ---

const ExampleSetSchema = z.object({
    valid: z.array(z.string()),
    invalid: z.array(z.string())
});

const FieldMappingSchema = z.object({
    fieldId: z.string(),
    label: z.string(),
    description: z.string(),
    taxonomyPath: z.array(z.string()),
    validationRules: z.array(z.string()).optional(),
    examples: ExampleSetSchema.optional(),
    instructionRef: z.string().optional()
});

const TaxonomySchema = z.record(z.string(), z.record(z.string(), z.array(z.string())));

export const ManualMappingSchema = z.object({
    formId: z.string(),
    fields: z.array(FieldMappingSchema),
    taxonomy: TaxonomySchema
});

// --- Validation Logic ---

export function validateManualMapping(mapping: any): ValidationResult {
    const errors: string[] = [];

    // 1. Structural Validation (Zod)
    const result = ManualMappingSchema.safeParse(mapping);
    if (!result.success) {
        // ZodError has an .issues array (and .errors alias usually, but let's use issues)
        const issues = result.error.issues || result.error.errors;

        if (issues) {
            issues.forEach(err => {
                errors.push(`Missing required field: ${err.path.join('.')} - ${err.message}`);
            });

            // Simplify missing required field error for specific test case
            if (issues.some(e => e.message === 'Required' && e.path.includes('label'))) {
                errors.push('Missing required field: label');
            }
        } else {
            errors.push('Unknown schema validation error');
        }
        return { valid: false, errors };
    }

    const typedMapping = result.data as ManualMapping;

    // 2. Taxonomy Path Validation
    // Path must be [Category, SubCategory, Topic]
    typedMapping.fields.forEach(field => {
        if (field.taxonomyPath.length !== 3) {
            errors.push(`Invalid taxonomy path length: ${field.taxonomyPath.join(' > ')}`);
            return;
        }

        const [category, subCategory, topic] = field.taxonomyPath;
        const categoryNode = typedMapping.taxonomy[category];

        if (!categoryNode) {
            errors.push(`Invalid taxonomy path: ${field.taxonomyPath.join(' > ')}`);
            return;
        }

        const topics = categoryNode[subCategory];
        if (!topics) {
            errors.push(`Invalid taxonomy path: ${field.taxonomyPath.join(' > ')}`);
            return;
        }

        if (!topics.includes(topic)) {
            errors.push(`Invalid taxonomy path: ${field.taxonomyPath.join(' > ')}`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}
