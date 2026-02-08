import { Affidavit } from '../../types/admin-process.js';

/**
 * Interface for affidavit templates
 */
export interface AffidavitTemplate {
    name: string;
    description?: string;
    /**
     * Render the template into a partial Affidavit structure using provided variables
     */
    render: (variables: Record<string, any>) => Partial<Affidavit>;
}

/**
 * Engine for managing and rendering affidavit templates
 */
export class TemplateEngine {
    private templates: Map<string, AffidavitTemplate> = new Map();

    /**
     * Register a new template with the engine
     */
    registerTemplate(template: AffidavitTemplate): void {
        if (this.templates.has(template.name)) {
            console.warn(`Overwriting existing template: ${template.name}`);
        }
        this.templates.set(template.name, template);
    }

    /**
     * Load a template by name
     */
    async loadTemplate(name: string): Promise<AffidavitTemplate> {
        const template = this.templates.get(name);
        if (!template) {
            throw new Error(`Template not found: ${name}`);
        }
        return template;
    }

    /**
     * Render a template with the given variables
     */
    renderTemplate(template: AffidavitTemplate, variables: Record<string, any>): Partial<Affidavit> {
        try {
            return template.render(variables);
        } catch (error: any) {
            throw new Error(`Failed to render template ${template.name}: ${error.message}`);
        }
    }

    /**
     * Helper to perform variable substitution in strings
     * Supports specific format: {{variableName}}
     */
    static substituteVariables(text: string, variables: Record<string, any>): string {
        return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const trimmedKey = key.trim();
            const value = variables[trimmedKey];
            return value !== undefined && value !== null ? String(value) : match;
        });
    }
}
