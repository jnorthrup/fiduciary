/**
 * Overlay Content Components
 *
 * React components for rendering Teach Mode overlay content.
 */

import React from 'react';

export interface Paragraph {
  content: string;
  highlight?: string;
  source?: {
    pdf: string;
    page: number;
    section?: number;
    paragraph?: number;
  };
}

export interface Breadcrumb {
  label: string;
  path: string[];
}

export interface CrossReferenceLink {
  targetPdfLink: string;
  relationship: 'see_also' | 'defined_in' | 'example_in' | 'related_to';
  label: string;
}

export interface ExampleSet {
  valid: string[];
  invalid: string[];
  category?: string;
}

export interface TeachModeContent {
  paragraph: Paragraph;
  taxonomy?: Breadcrumb[];
  crossReferences?: CrossReferenceLink[];
  examples?: ExampleSet;
}

export interface ParagraphExcerptProps {
  paragraph: Paragraph;
  maxLength?: number;
}

export function ParagraphExcerpt({ paragraph, maxLength }: ParagraphExcerptProps) {
  let content = paragraph.content;

  // Truncate if needed
  if (maxLength && content.length > maxLength) {
    content = content.slice(0, maxLength) + '...';
  }

  // Apply highlighting
  if (paragraph.highlight) {
    // Escape special regex characters in highlight term
    const escapedHighlight = paragraph.highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    const parts = content.split(regex);

    content = (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="highlight bg-yellow-200">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    ) as any;
  }

  return (
    <div className="paragraph-excerpt">
      <div className="content">{content}</div>
      {paragraph.source && (
        <div className="source text-xs text-gray-500 mt-2">
          {paragraph.source.pdf}
          {paragraph.source.page && ` #p${paragraph.source.page}`}
          {paragraph.source.section && `.s${paragraph.source.section}`}
        </div>
      )}
    </div>
  );
}

export interface TaxonomyBreadcrumbProps {
  breadcrumbs: Breadcrumb[];
  separator?: string;
  onNavigate?: (path: string[]) => void;
}

export function TaxonomyBreadcrumb({
  breadcrumbs,
  separator = ' / ',
  onNavigate,
}: TaxonomyBreadcrumbProps) {
  return (
    <nav className="breadcrumb text-sm">
      {breadcrumbs.map((crumb, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="separator">{separator}</span>}
          <button
            onClick={() => onNavigate?.(crumb.path)}
            className="link text-blue-600 hover:underline"
          >
            {crumb.label}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}

export interface CrossReferenceLinksProps {
  links: CrossReferenceLink[];
}

export function CrossReferenceLinks({ links }: CrossReferenceLinksProps) {
  if (!links.length) return null;

  return (
    <div className="cross-references mt-4">
      <h4 className="text-sm font-medium mb-2">Related</h4>
      <ul className="space-y-1">
        {links.map((link, i) => (
          <li key={i} className="text-sm">
            <span className="badge inline-block px-1.5 py-0.5 rounded text-xs bg-gray-100 mr-2">
              {link.relationship}
            </span>
            <a
              href={`#${link.targetPdfLink}`}
              className="link text-blue-600 hover:underline"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface ExampleDisplayProps {
  examples: ExampleSet;
}

export function ExampleDisplay({ examples }: ExampleDisplayProps) {
  return (
    <div className="examples mt-4">
      {examples.category && (
        <div className="category text-xs text-gray-500 mb-1">
          {examples.category}
        </div>
      )}
      {examples.valid.length > 0 && (
        <div className="valid-examples mb-2">
          <div className="label text-xs font-medium text-green-700 mb-1">
            Valid examples:
          </div>
          {examples.valid.map((example, i) => (
            <code
              key={i}
              className="block bg-green-50 text-green-900 px-2 py-1 rounded text-sm mb-1"
            >
              {example}
            </code>
          ))}
        </div>
      )}
      {examples.invalid.length > 0 && (
        <div className="invalid-examples">
          <div className="label text-xs font-medium text-red-700 mb-1">
            Invalid examples:
          </div>
          {examples.invalid.map((example, i) => (
            <code
              key={i}
              className="block bg-red-50 text-red-900 px-2 py-1 rounded text-sm mb-1"
            >
              {example}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

export interface TeachModeOverlayContentProps {
  content: TeachModeContent;
}

export function TeachModeOverlayContent({
  content,
}: TeachModeOverlayContentProps) {
  return (
    <div className="teach-mode-overlay-content p-4">
      {content.paragraph && (
        <div className="paragraph-section mb-4">
          <ParagraphExcerpt paragraph={content.paragraph} />
        </div>
      )}

      {content.taxonomy && content.taxonomy.length > 0 && (
        <div className="taxonomy-section mb-4">
          <TaxonomyBreadcrumb breadcrumbs={content.taxonomy} />
        </div>
      )}

      {content.crossReferences && content.crossReferences.length > 0 && (
        <CrossReferenceLinks links={content.crossReferences} />
      )}

      {content.examples && (
        <ExampleDisplay examples={content.examples} />
      )}
    </div>
  );
}
