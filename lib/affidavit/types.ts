/**
 * Affidavit Template Types
 * Defines structures for affidavit templates and rendering
 */

export interface TemplateVariable {
  name: string;
  type: 'text' | 'date' | 'number' | 'boolean' | 'textarea' | 'citation';
  required: boolean;
  default?: string | number | boolean;
  label?: string;
  placeholder?: string;
  validation?: RegExp | ((value: any) => boolean | string);
}

export interface TemplateSection {
  id: string;
  title: string;
  content: string;
  variables?: TemplateVariable[];
  order: number;
}

export interface AffidavitTemplate {
  id: string;
  name: string;
  description: string;
  category: 'capacity' | 'original_issuer' | 'usury' | 'affirmation' | 'custom';
  sections: TemplateSection[];
  metadata?: {
    jurisdiction?: string;
    version: string;
    lastUpdated: string;
    requiredCitations?: string[];
    notaryRequired: boolean;
  };
}

export interface TemplateRenderContext {
  variables: Record<string, any>;
  affiant: {
    name: string;
    address?: string;
    capacity?: string;
  };
  notary?: {
    name?: string;
    commission?: string;
    expires?: string;
  };
  date?: Date;
  jurisdiction?: string;
}

export interface RenderedSection {
  id: string;
  title: string;
  content: string;
  htmlContent: string;
}

export interface RenderedAffidavit {
  templateId: string;
  templateName: string;
  sections: RenderedSection[];
  affiant: TemplateRenderContext['affiant'];
  notary?: TemplateRenderContext['notary'];
  renderedAt: string;
  isValid: boolean;
  validationErrors?: string[];
}

export interface TemplateLoadError extends Error {
  templateId: string;
  code: 'NOT_FOUND' | 'INVALID_FORMAT' | 'PARSE_ERROR';
}

export interface TemplateRenderError extends Error {
  templateId: string;
  variableName?: string;
  code: 'MISSING_VARIABLE' | 'INVALID_TYPE' | 'VALIDATION_FAILED';
}
