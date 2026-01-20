import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateEngine, AffidavitTemplate } from './affidavit-template';
import { Affidavit } from '../../types/admin-process';

describe('TemplateEngine', () => {
    let engine: TemplateEngine;

    beforeEach(() => {
        engine = new TemplateEngine();
    });

    const mockTemplate: AffidavitTemplate = {
        name: 'TestTemplate',
        description: 'A simple test template',
        render: (variables) => ({
            title: `Affidavit of ${variables.name}`,
            claims: [
                {
                    id: 'claim-1',
                    description: `I, ${variables.name}, hereby declare...`,
                    legalBasis: 'Truth',
                    supportingCitations: [],
                    timestamp: new Date().toISOString()
                }
            ]
        })
    };

    it('should register and load a template', async () => {
        engine.registerTemplate(mockTemplate);
        const loaded = await engine.loadTemplate('TestTemplate');
        expect(loaded).toBeDefined();
        expect(loaded.name).toBe('TestTemplate');
    });

    it('should throw error when loading non-existent template', async () => {
        await expect(engine.loadTemplate('NonExistent')).rejects.toThrow('Template not found: NonExistent');
    });

    it('should render a template with variables', () => {
        const result = engine.renderTemplate(mockTemplate, { name: 'John Doe' });
        expect(result.title).toBe('Affidavit of John Doe');
        expect(result.claims).toBeDefined();
        expect(result.claims![0].description).toContain('I, John Doe, hereby declare');
    });

    it('should support static variable substitution helper', () => {
        const text = 'Hello {{ name }}!';
        const result = TemplateEngine.substituteVariables(text, { name: 'World' });
        expect(result).toBe('Hello World!');
    });

    it('should handle missing variables in substitution gracefully', () => {
        const text = 'Hello {{ name }}!';
        const result = TemplateEngine.substituteVariables(text, {});
        expect(result).toBe('Hello {{ name }}!');
    });
});
