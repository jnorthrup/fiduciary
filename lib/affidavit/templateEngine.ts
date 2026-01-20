/**
 * Affidavit Template Engine
 * Handles template loading, variable substitution, and rendering
 */

import type {
  AffidavitTemplate,
  RenderedAffidavit,
  RenderedSection,
  TemplateRenderContext,
  TemplateLoadError,
  TemplateRenderError,
  TemplateVariable,
} from './types';

// Template registry
const TEMPLATES: Map<string, AffidavitTemplate> = new Map();

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Format date according to locale
 */
/**
 * Format date in a consistent format (UTC)
 */
function formatDate(date: Date): string {
  // Use UTC to avoid timezone issues in tests and rendering
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  return `${month} ${day}, ${year}`;
}

/**
 * Substitute variables in template content
 */
function substituteVariables(
  content: string,
  context: TemplateRenderContext,
  variables: TemplateVariable[] = []
): { content: string; htmlContent: string } {
  let result = content;
  let htmlResult = content;

  // Build variable map from context
  const varMap: Record<string, any> = {
    ...context.variables,
    affiant_name: context.affiant.name,
    affiant_address: context.affiant.address || '',
    affiant_capacity: context.affiant.capacity || '',
    'affiant.name': context.affiant.name,
    'affiant.address': context.affiant.address || '',
    'affiant.capacity': context.affiant.capacity || '',
    notary_name: context.notary?.name || '',
    notary_commission: context.notary?.commission || '',
    notary_expires: context.notary?.expires || '',
    'notary.name': context.notary?.name || '',
    'notary.commission': context.notary?.commission || '',
    'notary.expires': context.notary?.expires || '',
    current_date: context.date ? formatDate(context.date) : formatDate(new Date()),
    jurisdiction: context.jurisdiction || '',
  };

  // Handle conditionals: {#if var}content{/if}
  const processConditionals = (text: string) => {
    return text.replace(/\{#if\s+(\w+)\}([\s\S]*?)\{\/if\}/g, (_, varName, conditionalContent) => {
      const value = varMap[varName];
      return value ? conditionalContent : '';
    });
  };

  result = processConditionals(result);
  htmlResult = processConditionals(htmlResult);

  // Handle loops: {#items} {{item.prop}} {/items}
  // For loops, we need to expand the content first, then variables will be substituted later
  // BUT the current logic does substitution INSIDE the loop handler.
  // We need to handle this carefully.
  // Actually, the loop handler replaces {{item.key}} immediately.

  const processLoops = (text: string, isHtml: boolean) => {
    return text.replace(/\{#(\w+)\}([\s\S]*?)\{\/\1\}/g, (_, arrayName, loopContent) => {
      const array = varMap[arrayName];
      if (!Array.isArray(array)) return '';

      return array.map(item => {
        let itemContent = loopContent;
        // Immediate substitution of loop variables
        Object.keys(item).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          const val = String(item[key]);
          // If HTML mode, escape the value
          const replacement = isHtml ? escapeHtml(val) : val;
          itemContent = itemContent.replace(regex, replacement);
        });
        return itemContent;
      }).join('');
    });
  };

  result = processLoops(result, false);
  htmlResult = processLoops(htmlResult, true);

  // Substitute variables: {{var_name}}
  // Sort by length (descending) to handle nested variables first
  const sortedKeys = Object.keys(varMap).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const value = varMap[key];
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const strVal = String(value);

      // Plain text substitution
      result = result.replace(regex, strVal);

      // HTML substitution (escaped)
      const escapedValue = escapeHtml(strVal);
      htmlResult = htmlResult.replace(regex, escapedValue);
    }
  }

  return { content: result, htmlContent: htmlResult };
}

/**
 * Validate required variables
 */
function validateVariables(
  context: TemplateRenderContext,
  variables: TemplateVariable[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const varMap: Record<string, any> = {
    ...context.variables,
    affiant_name: context.affiant.name,
    affiant_address: context.affiant.address,
    affiant_capacity: context.affiant.capacity,
  };

  for (const variable of variables) {
    const value = varMap[variable.name];

    // Check required
    if (variable.required && (value === undefined || value === null || value === '')) {
      errors.push(`Missing required variable: ${variable.name}`);
      continue;
    }

    if (value === undefined || value === null) continue;

    // Type validation
    switch (variable.type) {
      case 'number':
        if (isNaN(Number(value))) {
          errors.push(`Variable ${variable.name} must be a number, got: ${typeof value}`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Variable ${variable.name} must be a boolean, got: ${typeof value}`);
        }
        break;
      case 'date':
        if (!(value instanceof Date) && !Date.parse(String(value))) {
          errors.push(`Variable ${variable.name} must be a valid date`);
        }
        break;
    }

    // Custom validation
    if (variable.validation) {
      if (variable.validation instanceof RegExp) {
        if (!variable.validation.test(String(value))) {
          errors.push(`Variable ${variable.name} failed validation`);
        }
      } else if (typeof variable.validation === 'function') {
        const result = variable.validation(value);
        if (result !== true) {
          errors.push(typeof result === 'string' ? result : `Variable ${variable.name} failed validation`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Render a template with given context
 */
export async function renderTemplate(
  template: AffidavitTemplate,
  context: TemplateRenderContext
): Promise<RenderedAffidavit> {
  const validationErrors: string[] = [];
  const sections: RenderedSection[] = [];

  // Sort sections by order
  const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);

  for (const section of sortedSections) {
    // Validate variables for this section
    const validation = validateVariables(context, section.variables || []);
    if (!validation.isValid) {
      validationErrors.push(...validation.errors);
    }

    // Substitute variables
    const { content, htmlContent } = substituteVariables(
      section.content,
      context,
      section.variables
    );

    sections.push({
      id: section.id,
      title: section.title,
      content,
      htmlContent,
    });
  }

  return {
    templateId: template.id,
    templateName: template.name,
    sections,
    affiant: context.affiant,
    notary: context.notary,
    renderedAt: new Date().toISOString(),
    isValid: validationErrors.length === 0,
    validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
  };
}

/**
 * Load a template by ID
 */
export async function loadTemplate(templateId: string): Promise<AffidavitTemplate> {
  // Check if already loaded
  if (TEMPLATES.has(templateId)) {
    return TEMPLATES.get(templateId)!;
  }

  // Try to load built-in templates
  switch (templateId) {
    case 'oc10-capacity':
      TEMPLATES.set(templateId, OC10_CAPACITY_TEMPLATE);
      break;
    case 'original-issuer':
      TEMPLATES.set(templateId, ORIGINAL_ISSUER_TEMPLATE);
      break;
    case 'usury-assignment':
      TEMPLATES.set(templateId, USURY_ASSIGNMENT_TEMPLATE);
      break;
    default:
      const error = new Error(`Template not found: ${templateId}`) as TemplateLoadError;
      error.code = 'NOT_FOUND';
      error.templateId = templateId;
      throw error;
  }

  return TEMPLATES.get(templateId)!;
}

/**
 * Template Engine Class
 */
export class TemplateEngine {
  private templates: Map<string, AffidavitTemplate> = new Map();

  /**
   * Register a custom template
   */
  registerTemplate(template: AffidavitTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Unregister a template
   */
  unregisterTemplate(templateId: string): void {
    this.templates.delete(templateId);
  }

  /**
   * Get all registered template IDs
   */
  getTemplateIds(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Load and render a template
   */
  async render(templateId: string, context: TemplateRenderContext): Promise<RenderedAffidavit> {
    const template = this.templates.get(templateId) || await loadTemplate(templateId);
    return renderTemplate(template, context);
  }
}

// ============================================================================
// PREDEFINED TEMPLATES
// ============================================================================

/**
 * OC-10 Capacity Affidavit Template
 */
export const OC10_CAPACITY_TEMPLATE: AffidavitTemplate = {
  id: 'oc10-capacity',
  name: 'OC-10 Capacity Affidavit',
  description: 'Affidavit establishing capacity under California OC-10',
  category: 'capacity',
  metadata: {
    jurisdiction: 'California',
    version: '1.0',
    lastUpdated: '2024-01-01',
    requiredCitations: ['OC-10', 'California Code of Civil Procedure § 2015.5'],
    notaryRequired: true,
  },
  sections: [
    {
      id: 'header',
      title: 'Affidavit Header',
      order: 1,
      content: 'STATE OF {{jurisdiction}}\nCOUNTY OF _______________\n\nAFFIDAVIT OF {{affiant_name}}\n\nI, {{affiant_name}}, being duly sworn, depose and say as follows:',
    },
    {
      id: 'capacity',
      title: 'Capacity Statement',
      order: 2,
      content: '1. I am {{affiant_capacity}} in this matter and have personal knowledge of the facts stated herein.\n\n2. This affidavit is made in support of my capacity to proceed {{affirmant_capacity}} in the matter of {{claimant_name}} vs. {{respondent_name}}.\n\n3. I declare under penalty of perjury that the foregoing is true and correct to the best of my knowledge.\n\nDATED: {{current_date}}\n\n_____________________________\n{{affiant_name}}\n{{affiant_address}}',
      variables: [
        { name: 'claimant_name', type: 'text', required: true, label: 'Claimant Name' },
        { name: 'respondent_name', type: 'text', required: true, label: 'Respondent Name' },
        {
          name: 'affirmant_capacity',
          type: 'text',
          required: true,
          label: 'Your Capacity',
          placeholder: 'e.g., sui juris',
        },
      ],
    },
    {
      id: 'notary',
      title: 'Notary Acknowledgment',
      order: 3,
      content: 'NOTARY ACKNOWLEDGMENT\n\nOn {{current_date}} before me, {{notary_name}}, Notary Public, personally appeared {{affiant_name}}, who proved to me on the basis of satisfactory evidence to be the person whose name is subscribed to the within instrument and acknowledged to me that they executed the same in their authorized capacity, and that by their signature on the instrument the person acted, executed the instrument.\n\nI certify under PENALTY OF PERJURY under the laws of the State of {{jurisdiction}} that the foregoing paragraph is true and correct.\n\nWITNESS my hand and official seal.\n\n_____________________________\n{{notary_name}}\nNotary Public - Commission #{{notary_commission}}\nMy commission expires: {{notary_expires}}',
    },
  ],
};

/**
 * Original Issuer Affidavit Template
 */
export const ORIGINAL_ISSUER_TEMPLATE: AffidavitTemplate = {
  id: 'original-issuer',
  name: 'Original Issuer Affidavit',
  description: 'Affidavit establishing status as original issuer of credit',
  category: 'original_issuer',
  metadata: {
    jurisdiction: 'United States',
    version: '1.0',
    lastUpdated: '2024-01-01',
    requiredCitations: ['12 USC § 411', 'FEC v. DNC', '15 USC § 1692g'],
    notaryRequired: true,
  },
  sections: [
    {
      id: 'header',
      title: 'Affidavit Header',
      order: 1,
      content: 'AFFIDAVIT OF ORIGINAL ISSUER\n\nI, {{affiant_name}}, being duly sworn, depose and state as follows:',
    },
    {
      id: 'original_issuer_statement',
      title: 'Original Issuer Statement',
      order: 2,
      content: '1. I am {{affiant_capacity}}, competent to handle my own affairs.\n\n2. I have personal knowledge that I am the original issuer of the credit/financial instrument referenced in this matter.\n\n3. As original issuer, I am the source of the credit and have full authority to administer said credit.\n\n4. No third party has provided any consideration for the creation of said credit instrument.\n\n5. I declare that I retain all rights and title to the original credit instrument and any derivatives thereof.\n\nDATED: {{current_date}}\n\n_____________________________\n{{affiant_name}}\n{{affiant_address}}',
      variables: [
        {
          name: 'affirmant_capacity',
          type: 'text',
          required: true,
          label: 'Your Capacity',
          placeholder: 'e.g., a living woman/man',
        },
      ],
    },
    {
      id: 'notary',
      title: 'Notary Acknowledgment',
      order: 3,
      content: 'SUBSCRIBED AND SWORN to before me on this {{current_date}} day of {{current_date}}, by {{affiant_name}}, proved to me on the basis of satisfactory evidence to be the person who appeared before me.\n\n_____________________________\n{{notary_name}}\nNotary Public',
    },
  ],
};

/**
 * Usury Assignment Affidavit Template
 */
export const USURY_ASSIGNMENT_TEMPLATE: AffidavitTemplate = {
  id: 'usury-assignment',
  name: 'Usury Assignment Affidavit',
  description: 'Affidavit documenting usury and assigning rights',
  category: 'usury',
  metadata: {
    jurisdiction: 'United States',
    version: '1.0',
    lastUpdated: '2024-01-01',
    requiredCitations: ['12 USC § 85', '12 USC § 86', '18 USC § 891'],
    notaryRequired: true,
  },
  sections: [
    {
      id: 'header',
      title: 'Affidavit Header',
      order: 1,
      content: `AFFIDAVIT OF USURY ASSIGNMENT

I, {{affiant_name}}, being duly sworn, depose and state as follows:`,
    },
    {
      id: 'usury_claim',
      title: 'Usury Claim',
      order: 2,
      content: '1. I am {{affiant_capacity}} in this matter.\n\n2. I have knowledge of a financial agreement between {{claimant_name}} and {{respondent_name}}.\n\n3. The alleged debt in the amount of ${{dispute_amount}} carries an interest rate exceeding the lawful limit.\n\n4. The applicable usury limit for {{jurisdiction}} is {{max_interest_rate}}%, yet the agreement specifies {{actual_interest_rate}}%.\n\n5. This constitutes usury under 12 U.S.C. § 85 and {{jurisdiction}} state law.\n\n6. All rights to pursue usury claims are hereby assigned to {{assignee}}.\n\nDATED: {{current_date}}\n\n_____________________________\n{{affiant_name}}\n{{affiant_address}}',
      variables: [
        { name: 'claimant_name', type: 'text', required: true, label: 'Claimant/Creditor Name' },
        { name: 'respondent_name', type: 'text', required: true, label: 'Respondent/Debtor Name' },
        {
          name: 'dispute_amount',
          type: 'number',
          required: true,
          label: 'Disputed Amount',
          validation: /^\d+(\.\d{2})?$/,
        },
        {
          name: 'max_interest_rate',
          type: 'number',
          required: true,
          label: 'Maximum Legal Interest Rate (%)',
        },
        {
          name: 'actual_interest_rate',
          type: 'number',
          required: true,
          label: 'Actual Interest Rate in Agreement (%)',
        },
        {
          name: 'assignee',
          type: 'text',
          required: true,
          label: 'Assignee of Rights',
        },
      ],
    },
    {
      id: 'notary',
      title: 'Notary Acknowledgment',
      order: 3,
      content: 'NOTARY ACKNOWLEDGMENT\n\nOn {{current_date}}, {{affiant_name}} appeared before me and acknowledged execution of this affidavit.\n\n_____________________________\n{{notary_name}}\nNotary Public - Commission #{{notary_commission}}',
    },
  ],
};

/**
 * Default template engine instance
 */
export const defaultEngine = new TemplateEngine();
