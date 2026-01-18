/**
 * Template Engine Tests
 * TDD for affidavit template loading and rendering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TemplateEngine,
  loadTemplate,
  renderTemplate,
  OC10_CAPACITY_TEMPLATE,
  ORIGINAL_ISSUER_TEMPLATE,
  USURY_ASSIGNMENT_TEMPLATE,
} from '../../../lib/affidavit/templateEngine';
import type { AffidavitTemplate, TemplateRenderContext } from '../../lib/affidavit/types';

describe('TemplateEngine - loadTemplate', () => {
  it('should throw error for non-existent template', async () => {
    await expect(loadTemplate('non-existent')).rejects.toThrow('Template not found: non-existent');
  });

  it('should load built-in OC-10 capacity template', async () => {
    const template = await loadTemplate('oc10-capacity');

    expect(template).toBeDefined();
    expect(template.id).toBe('oc10-capacity');
    expect(template.name).toContain('OC-10');
    expect(template.category).toBe('capacity');
    expect(template.sections).toBeInstanceOf(Array);
    expect(template.sections.length).toBeGreaterThan(0);
  });

  it('should load built-in original issuer template', async () => {
    const template = await loadTemplate('original-issuer');

    expect(template).toBeDefined();
    expect(template.id).toBe('original-issuer');
    expect(template.category).toBe('original_issuer');
  });

  it('should load built-in usury assignment template', async () => {
    const template = await loadTemplate('usury-assignment');

    expect(template).toBeDefined();
    expect(template.id).toBe('usury-assignment');
    expect(template.category).toBe('usury');
  });

  it('should validate template structure on load', async () => {
    const template = await loadTemplate('oc10-capacity');

    expect(template.sections).toBeDefined();
    expect(template.metadata).toBeDefined();
    expect(template.metadata?.notaryRequired).toBe(true);
  });
});

describe('TemplateEngine - renderTemplate', () => {
  let template: AffidavitTemplate;
  let context: TemplateRenderContext;

  beforeEach(async () => {
    template = await loadTemplate('oc10-capacity');
    context = {
      variables: {
        claimant_name: 'John Doe',
        respondent_name: 'ABC Corporation',
        dispute_amount: '50000',
        contract_date: '2024-01-15',
      },
      affiant: {
        name: 'Jane Smith',
        address: '123 Main St, Anytown, ST 12345',
        capacity: 'Competent Witness',
      },
      notary: {
        name: 'Notary Public',
        commission: 'Commission #12345',
        expires: '2026-12-31',
      },
      date: new Date('2024-06-15'),
      jurisdiction: 'California',
    };
  });

  it('should render template with all variables substituted', async () => {
    const rendered = await renderTemplate(template, context);

    expect(rendered).toBeDefined();
    expect(rendered.templateId).toBe(template.id);
    expect(rendered.sections).toBeInstanceOf(Array);
    expect(rendered.sections.length).toBe(template.sections.length);
  });

  it('should substitute simple text variables', async () => {
    const rendered = await renderTemplate(template, context);
    const content = rendered.sections.map(s => s.content + ' ' + s.htmlContent).join(' ');

    expect(content).toContain('Jane Smith');
    expect(content).toContain('John Doe');
    expect(content).toContain('ABC Corporation');
  });

  it('should format dates according to locale', async () => {
    context.date = new Date('2024-06-15');
    const rendered = await renderTemplate(template, context);
    const content = rendered.sections.map(s => s.content + ' ' + s.htmlContent).join(' ');

    expect(content).toMatch(/June.*15.*2024|2024.*06.*15/);
  });

  it('should escape HTML in variable values', async () => {
    context.variables.claimant_name = '<script>alert("xss")</script>';
    const rendered = await renderTemplate(template, context);

    // Check that script tags are escaped in htmlContent
    rendered.sections.forEach(section => {
      const content = section.content + ' ' + section.htmlContent;
      // The plain text should have the original script tags (if used in substitution)
      // The htmlContent should have escaped tags
      expect(section.htmlContent).not.toContain('<script>');
      expect(section.htmlContent).toContain('&lt;script&gt;');
    });
  });

  it('should handle missing optional variables', async () => {
    // All variables in OC-10 template are optional except those in the variables array
    // The context has claimant_name and respondent_name which are required
    const rendered = await renderTemplate(template, context);

    expect(rendered.isValid).toBe(true);
    expect(rendered.validationErrors).toBeUndefined();
  });

  it('should fail validation for missing required variables', async () => {
    // claimant_name and respondent_name are required variables in the capacity section
    delete context.variables.claimant_name;
    const rendered = await renderTemplate(template, context);

    expect(rendered.isValid).toBe(false);
    expect(rendered.validationErrors).toBeDefined();
    expect(rendered.validationErrors?.some(e => e.includes('claimant_name'))).toBe(true);
  });

  it('should validate variable types', async () => {
    // Test with usury template which has number-type variables
    const usuryTemplate = await loadTemplate('usury-assignment');
    const usuryContext: TemplateRenderContext = {
      variables: {
        claimant_name: 'John Doe',
        respondent_name: 'ABC Corp',
        dispute_amount: 'not-a-number', // Invalid - should be numeric
        max_interest_rate: 10,
        actual_interest_rate: 25,
        assignee: 'Jane Smith',
      },
      affiant: {
        name: 'Jane Smith',
        address: '123 Main St',
      },
      notary: {
        name: 'Notary Public',
        commission: 'Commission #12345',
        expires: '2026-12-31',
      },
      date: new Date('2024-06-15'),
      jurisdiction: 'California',
    };

    const rendered = await renderTemplate(usuryTemplate, usuryContext);

    expect(rendered.isValid).toBe(false);
    expect(rendered.validationErrors?.some(e => e.includes('dispute_amount'))).toBe(true);
  });

  it('should validate custom regex patterns', async () => {
    // Test with usury template which has regex validation on dispute_amount
    const usuryTemplate = await loadTemplate('usury-assignment');
    const usuryContext: TemplateRenderContext = {
      variables: {
        claimant_name: '123', // Invalid - should be text name, not just numbers
        respondent_name: 'ABC Corp',
        dispute_amount: 'abc', // Invalid - should match regex /^\d+(\.\d{2})?$/
        max_interest_rate: 10,
        actual_interest_rate: 25,
        assignee: 'Jane Smith',
      },
      affiant: {
        name: 'Jane Smith',
        address: '123 Main St',
      },
      notary: {
        name: 'Notary Public',
        commission: 'Commission #12345',
        expires: '2026-12-31',
      },
      date: new Date('2024-06-15'),
      jurisdiction: 'California',
    };

    const rendered = await renderTemplate(usuryTemplate, usuryContext);

    expect(rendered.isValid).toBe(false);
    // Should have validation errors for claimant_name (text validation) and dispute_amount (regex)
    expect(rendered.validationErrors?.length).toBeGreaterThan(0);
  });

  it('should include notary section when template requires it', async () => {
    const rendered = await renderTemplate(template, context);

    expect(rendered.notary).toBeDefined();
    const content = rendered.sections.map(s => s.content + ' ' + s.htmlContent).join(' ');
    expect(content).toContain('Notary');
  });

  it('should produce plain text and HTML versions', async () => {
    const rendered = await renderTemplate(template, context);

    rendered.sections.forEach(section => {
      expect(section.content).toBeDefined();
      expect(section.htmlContent).toBeDefined();
      expect(section.content).toBeTruthy();
      expect(section.htmlContent).toBeTruthy();
    });
  });

  it('should handle array variables for repeating content', async () => {
    template.sections.push({
      id: 'claims',
      title: 'Claims',
      content: '{#claims}\n- {{claim}}\n{/claims}',
      order: 1,
    });

    context.variables.claims = [
      { claim: 'First claim' },
      { claim: 'Second claim' },
      { claim: 'Third claim' },
    ];

    const rendered = await renderTemplate(template, context);
    const content = rendered.sections.map(s => s.content).join(' ');

    expect(content).toContain('First claim');
    expect(content).toContain('Second claim');
    expect(content).toContain('Third claim');
  });

  it('should handle conditional sections', async () => {
    template.sections.push({
      id: 'conditional',
      title: 'Conditional Section',
      content: '{#if show_extra}Extra content{/if}',
      order: 1,
    });

    context.variables.show_extra = true;
    const rendered1 = await renderTemplate(template, context);
    const content1 = rendered1.sections.map(s => s.content).join(' ');
    expect(content1).toContain('Extra content');

    context.variables.show_extra = false;
    const rendered2 = await renderTemplate(template, context);
    const content2 = rendered2.sections.map(s => s.content).join(' ');
    expect(content2).not.toContain('Extra content');
  });
});

describe('TemplateEngine - Predefined Templates', () => {
  it('should export OC10_CAPACITY_TEMPLATE constant', () => {
    expect(OC10_CAPACITY_TEMPLATE).toBeDefined();
    expect(OC10_CAPACITY_TEMPLATE.id).toBe('oc10-capacity');
  });

  it('should export ORIGINAL_ISSUER_TEMPLATE constant', () => {
    expect(ORIGINAL_ISSUER_TEMPLATE).toBeDefined();
    expect(ORIGINAL_ISSUER_TEMPLATE.id).toBe('original-issuer');
  });

  it('should export USURY_ASSIGNMENT_TEMPLATE constant', () => {
    expect(USURY_ASSIGNMENT_TEMPLATE).toBeDefined();
    expect(USURY_ASSIGNMENT_TEMPLATE.id).toBe('usury-assignment');
  });

  it('OC-10 template should have proper structure', () => {
    expect(OC10_CAPACITY_TEMPLATE.sections).toBeDefined();
    expect(OC10_CAPACITY_TEMPLATE.metadata?.notaryRequired).toBe(true);
    expect(OC10_CAPACITY_TEMPLATE.metadata?.requiredCitations).toContain('OC-10');
  });

  it('Original issuer template should have proper structure', () => {
    expect(ORIGINAL_ISSUER_TEMPLATE.sections).toBeDefined();
    expect(ORIGINAL_ISSUER_TEMPLATE.category).toBe('original_issuer');
  });

  it('Usury assignment template should have proper structure', () => {
    expect(USURY_ASSIGNMENT_TEMPLATE.sections).toBeDefined();
    expect(USURY_ASSIGNMENT_TEMPLATE.category).toBe('usury');
    expect(USURY_ASSIGNMENT_TEMPLATE.metadata?.requiredCitations).toBeDefined();
  });
});

describe('TemplateEngine - Variable Substitution', () => {
  it('should substitute {{variable}} syntax', async () => {
    const template: AffidavitTemplate = {
      id: 'test',
      name: 'Test',
      description: 'Test template',
      category: 'custom',
      sections: [{
        id: 'test-section',
        title: 'Test',
        content: 'Hello {{name}}, your balance is {{balance}}.',
        order: 1,
      }],
    };

    const context: TemplateRenderContext = {
      variables: {
        name: 'John',
        balance: 1000,
      },
      affiant: { name: 'Test' },
    };

    const rendered = await renderTemplate(template, context);
    const content = rendered.sections[0].content;

    expect(content).toBe('Hello John, your balance is 1000.');
  });

  it('should handle nested object variables', async () => {
    const template: AffidavitTemplate = {
      id: 'test',
      name: 'Test',
      description: 'Test template',
      category: 'custom',
      sections: [{
        id: 'test-section',
        title: 'Test',
        content: 'Affiant: {{affiant.name}} of {{affiant.address}}',
        order: 1,
      }],
    };

    const context: TemplateRenderContext = {
      variables: {},
      affiant: {
        name: 'Jane Doe',
        address: '456 Oak St',
      },
    };

    const rendered = await renderTemplate(template, context);
    const content = rendered.sections[0].content;

    expect(content).toBe('Affiant: Jane Doe of 456 Oak St');
  });

  it('should preserve whitespace in templates', async () => {
    const template: AffidavitTemplate = {
      id: 'test',
      name: 'Test',
      description: 'Test template',
      category: 'custom',
      sections: [{
        id: 'test-section',
        title: 'Test',
        content: `
          AFFIDAVIT

          I, {{affiant.name}}, being duly sworn...
        `,
        order: 1,
      }],
    };

    const context: TemplateRenderContext = {
      variables: {},
      affiant: { name: 'John Doe' },
    };

    const rendered = await renderTemplate(template, context);
    const content = rendered.sections[0].content;

    expect(content).toContain('AFFIDAVIT');
    expect(content).toContain('I, John Doe, being duly sworn');
  });
});

describe('TemplateEngine - Error Handling', () => {
  it('should throw TemplateLoadError for invalid template', async () => {
    await expect(loadTemplate('invalid-template')).rejects.toThrow();
  });

  it('should include error code in TemplateLoadError', async () => {
    try {
      await loadTemplate('non-existent');
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.code).toBe('NOT_FOUND');
      expect(error.templateId).toBe('non-existent');
    }
  });

  it('should include variable name in TemplateRenderError', async () => {
    const template: AffidavitTemplate = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      category: 'custom',
      sections: [{
        id: 'test',
        title: 'Test',
        content: '{{required_field}}',
        variables: [{
          name: 'required_field',
          type: 'text',
          required: true,
        }],
        order: 1,
      }],
    };

    const context: TemplateRenderContext = {
      variables: {},
      affiant: { name: 'Test' },
    };

    const rendered = await renderTemplate(template, context);

    expect(rendered.isValid).toBe(false);
    expect(rendered.validationErrors?.[0]).toContain('required_field');
  });
});
