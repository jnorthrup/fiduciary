
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create Zod schemas from OpenAPI component schemas
 */
function createZodSchemas(openApiSpec) {
    const schemas = {};

    // Helper to convert OpenAPI type to Zod schema
    function convertToZod(schema, required = true) {
        if (!schema) return z.any();

        // Handle $ref
        if (schema.$ref) {
            const refName = schema.$ref.split('/').pop();
            return z.lazy(() => schemas[refName]);
        }

        // Handle allOf (merge schemas)
        if (schema.allOf) {
            let mergedSchema = z.object({});
            for (const subSchema of schema.allOf) {
                const zodSchema = convertToZod(subSchema);
                if (zodSchema instanceof z.ZodObject) {
                    mergedSchema = mergedSchema.merge(zodSchema);
                }
            }
            return mergedSchema;
        }

        // Handle basic types
        if (schema.type === 'object') {
            const shape = {};
            const requiredFields = schema.required || [];

            if (schema.properties) {
                for (const [key, prop] of Object.entries(schema.properties)) {
                    const isRequired = requiredFields.includes(key);
                    let zodField = convertToZod(prop, isRequired);

                    if (!isRequired) {
                        zodField = zodField.optional();
                    }

                    shape[key] = zodField;
                }
            }

            return z.object(shape);
        }

        if (schema.type === 'array') {
            return z.array(convertToZod(schema.items));
        }

        if (schema.type === 'string') {
            let zodString = z.string();

            // Handle enums
            if (schema.enum) {
                return z.enum(schema.enum);
            }

            // Handle formats
            if (schema.format === 'uuid') {
                zodString = zodString.uuid();
            } else if (schema.format === 'date') {
                zodString = zodString.regex(/^\d{4}-\d{2}-\d{2}$/);
            } else if (schema.format === 'date-time') {
                // Use relaxed ISO 8601 datetime regex instead of strict datetime()
                zodString = zodString.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/);
            }

            return zodString;
        }

        if (schema.type === 'number' || schema.type === 'integer') {
            return z.number();
        }

        if (schema.type === 'boolean') {
            return z.boolean();
        }

        return z.any();
    }

    // Convert all component schemas
    if (openApiSpec.components?.schemas) {
        for (const [name, schema] of Object.entries(openApiSpec.components.schemas)) {
            schemas[name] = convertToZod(schema);
        }
    }

    return schemas;
}

/**
 * Create validation rules from OpenAPI paths
 */
function createValidationRules(openApiSpec, zodSchemas) {
    const rules = [];

    if (!openApiSpec.paths) return rules;

    // Helper to resolve $ref
    function resolveRef(ref, spec) {
        if (!ref || !ref.startsWith('#/')) return null;
        const parts = ref.substring(2).split('/');
        let current = spec;
        for (const part of parts) {
            current = current[part];
            if (!current) return null;
        }
        return current;
    }

    for (const [path, pathItem] of Object.entries(openApiSpec.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
            if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;

            // Resolve parameter references
            const resolvedParameters = [];
            if (operation.parameters) {
                for (const param of operation.parameters) {
                    if (param.$ref) {
                        const resolved = resolveRef(param.$ref, openApiSpec);
                        if (resolved) {
                            resolvedParameters.push(resolved);
                        }
                    } else {
                        resolvedParameters.push(param);
                    }
                }
            }

            const rule = {
                path: path.replace(/{([^}]+)}/g, ':$1'), // Convert OpenAPI {param} to Express :param
                method: method.toUpperCase(),
                parameters: resolvedParameters,
                requestBody: operation.requestBody,
            };

            rules.push(rule);
        }
    }

    return rules;
}

/**
 * Validate path parameters against schema
 */
function validatePathParams(params, paramDefs, openApiSpec) {
    const errors = [];

    for (const paramDef of paramDefs) {
        if (paramDef.in !== 'path') continue;

        const value = params[paramDef.name];
        const schema = paramDef.schema;

        if (paramDef.required && !value) {
            errors.push(`Path parameter '${paramDef.name}' is required`);
            continue;
        }

        if (value && schema) {
            // Validate UUID format
            if (schema.format === 'uuid') {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(value)) {
                    errors.push(`Path parameter '${paramDef.name}' must be a valid UUID`);
                }
            }
        }
    }

    return errors;
}

/**
 * Validate query parameters against schema
 */
function validateQueryParams(query, paramDefs, openApiSpec) {
    const errors = [];

    for (const paramDef of paramDefs) {
        if (paramDef.in !== 'query') continue;

        const value = query[paramDef.name];
        const schema = paramDef.schema;

        if (paramDef.required && !value) {
            errors.push(`Query parameter '${paramDef.name}' is required`);
            continue;
        }

        if (value && schema) {
            // Validate UUID format for trustId
            if (schema.format === 'uuid') {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(value)) {
                    errors.push(`Query parameter '${paramDef.name}' must be a valid UUID`);
                }
            }
        }
    }

    return errors;
}

/**
 * Validate request body against schema
 */
function validateRequestBody(body, requestBodyDef, zodSchemas) {
    if (!requestBodyDef) return [];

    const errors = [];

    // Get schema reference
    const jsonContent = requestBodyDef.content?.['application/json'];
    if (!jsonContent?.schema) return errors;

    // If body is required but missing, return error
    if (requestBodyDef.required && (!body || Object.keys(body).length === 0)) {
        errors.push('Request body is required');
        return errors;
    }

    // If body is not required and empty/missing, don't validate
    if (!requestBodyDef.required && (!body || Object.keys(body).length === 0)) {
        return errors;
    }

    const schema = jsonContent.schema;

    // Get Zod schema
    let zodSchema;
    if (schema.$ref) {
        const schemaName = schema.$ref.split('/').pop();
        zodSchema = zodSchemas[schemaName];
    } else {
        // Inline schema - convert it
        zodSchema = createZodSchemaFromOpenAPI(schema);
    }

    if (!zodSchema) return errors;

    // Validate with Zod
    const result = zodSchema.safeParse(body);
    if (!result.success) {
        for (const issue of result.error.issues) {
            const path = issue.path.join('.');
            errors.push(path ? `${path}: ${issue.message}` : issue.message);
        }
    }

    return errors;
}

/**
 * Helper to create Zod schema from inline OpenAPI schema
 */
function createZodSchemaFromOpenAPI(schema) {
    if (!schema) return z.any();

    if (schema.type === 'object') {
        const shape = {};
        const requiredFields = schema.required || [];

        if (schema.properties) {
            for (const [key, prop] of Object.entries(schema.properties)) {
                const isRequired = requiredFields.includes(key);
                let zodField = createZodSchemaFromOpenAPI(prop);

                if (!isRequired) {
                    zodField = zodField.optional();
                }

                shape[key] = zodField;
            }
        }

        return z.object(shape);
    }

    if (schema.type === 'array') {
        return z.array(createZodSchemaFromOpenAPI(schema.items));
    }

    if (schema.type === 'string') {
        let zodString = z.string();

        if (schema.enum) {
            return z.enum(schema.enum);
        }

        if (schema.format === 'uuid') {
            zodString = zodString.uuid();
        } else if (schema.format === 'date') {
            zodString = zodString.regex(/^\d{4}-\d{2}-\d{2}$/);
        } else if (schema.format === 'date-time') {
            // Use relaxed ISO 8601 datetime regex instead of strict datetime()
            zodString = zodString.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/);
        }

        return zodString;
    }

    if (schema.type === 'number' || schema.type === 'integer') {
        return z.number();
    }

    if (schema.type === 'boolean') {
        return z.boolean();
    }

    return z.any();
}

/**
 * Create validation middleware from OpenAPI spec
 */
export async function createValidationMiddleware(specPath) {
    // Load OpenAPI spec
    const specContent = readFileSync(specPath, 'utf8');
    const openApiSpec = parse(specContent);

    // Create Zod schemas
    const zodSchemas = createZodSchemas(openApiSpec);

    // Create validation rules
    const rules = createValidationRules(openApiSpec, zodSchemas);

    // Return Express middleware
    return (req, res, next) => {
        // Find matching rule and extract path parameters
        let matchingRule = null;
        let extractedParams = {};
        
        for (const rule of rules) {
            if (rule.method !== req.method) continue;

            // Convert OpenAPI path to regex and extract params
            const paramNames = [];
            const pathPattern = rule.path.replace(/:([^/]+)/g, (match, paramName) => {
                paramNames.push(paramName);
                return '([^/]+)';
            });
            const regex = new RegExp(`^/api${pathPattern}$`);
            
            const match = regex.exec(req.path);
            if (match) {
                matchingRule = rule;
                // Extract parameters from URL
                for (let i = 0; i < paramNames.length; i++) {
                    extractedParams[paramNames[i]] = match[i + 1];
                }
                break;
            }
        }

        if (!matchingRule) {
            // No validation rule found, pass through
            return next();
        }

        const errors = [];

        // Validate path parameters using extracted params
        if (matchingRule.parameters) {
            errors.push(...validatePathParams(extractedParams, matchingRule.parameters, openApiSpec));
        }

        // Validate query parameters
        if (matchingRule.parameters) {
            errors.push(...validateQueryParams(req.query, matchingRule.parameters, openApiSpec));
        }

        // Validate request body
        if (matchingRule.requestBody) {
            // Only validate if body exists and has content, or if body is required
            const hasBody = req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0;
            if (hasBody || matchingRule.requestBody.required) {
                errors.push(...validateRequestBody(req.body, matchingRule.requestBody, zodSchemas));
            }
        }

        // Return error if validation failed
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Request validation failed',
                details: errors
            });
        }

        // Validation passed
        next();
    };
}

// Export for backward compatibility
export const validationMiddleware = (req, res, next) => {
    // This is a placeholder for when middleware is used without async creation
    next();
};
