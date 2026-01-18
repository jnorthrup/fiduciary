/**
 * Overlay Content Rendering Tests
 *
 * Tests for Teach Mode overlay content components.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ParagraphExcerpt,
  TaxonomyBreadcrumb,
  CrossReferenceLinks,
  ExampleDisplay,
  TeachModeOverlayContent,
} from './overlay-content';

describe('Paragraph Excerpt Display', () => {
  it('should render paragraph content with highlighting', () => {
    const paragraph = {
      content: 'The TCC format is XX-XXXXXXX where X is alphanumeric.',
      highlight: 'XX-XXXXXXX',
    };

    render(<ParagraphExcerpt paragraph={paragraph} />);

    expect(screen.getByText(/TCC format/)).toBeInTheDocument();
    expect(screen.getByText('XX-XXXXXXX')).toBeInTheDocument();
  });

  it('should apply highlight styling to matched text', () => {
    const paragraph = {
      content: 'Report payments of at least $600.',
      highlight: '$600',
    };

    const { container } = render(<ParagraphExcerpt paragraph={paragraph} />);

    // Check that mark element with highlight class exists
    const mark = container.querySelector('mark.highlight');
    expect(mark).toBeInTheDocument();
    expect(mark?.textContent).toBe('$600');
  });

  it('should truncate long content with max length', () => {
    const longContent = 'A'.repeat(200);
    const paragraph = {
      content: longContent,
      highlight: 'test',
    };

    render(<ParagraphExcerpt paragraph={paragraph} maxLength={100} />);

    const text = screen.getByText(/.../);
    expect(text).toBeInTheDocument();
  });

  it('should show PDF source reference', () => {
    const paragraph = {
      content: 'Test content',
      source: { pdf: 'i1099nec.pdf', page: 12, section: 3 },
    };

    render(<ParagraphExcerpt paragraph={paragraph} />);

    expect(screen.getByText(/i1099nec\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/p12/)).toBeInTheDocument();
  });
});

describe('Taxonomy Breadcrumb Display', () => {
  it('should render breadcrumb navigation', () => {
    const path = [
      { label: 'Preparation', path: ['Preparation'] },
      { label: 'TIN Format', path: ['Preparation', 'TIN Format'] },
      { label: 'TCC Format', path: ['Preparation', 'TIN Format', 'TCC Format'] },
    ];

    render(<TaxonomyBreadcrumb breadcrumbs={path} />);

    expect(screen.getByText('Preparation')).toBeInTheDocument();
    expect(screen.getByText('TIN Format')).toBeInTheDocument();
    expect(screen.getByText('TCC Format')).toBeInTheDocument();
  });

  it('should use separator between breadcrumbs', () => {
    const path = [
      { label: 'A', path: ['A'] },
      { label: 'B', path: ['A', 'B'] },
    ];

    render(<TaxonomyBreadcrumb breadcrumbs={path} separator=" > " />);

    // Check that both breadcrumbs are rendered
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    // Check separator element exists
    const separator = screen.getByText('>');
    expect(separator).toBeInTheDocument();
  });

  it('should call onNavigate when breadcrumb clicked', () => {
    const onNavigate = vi.fn();
    const path = [
      { label: 'Preparation', path: ['Preparation'] },
      { label: 'TIN Format', path: ['Preparation', 'TIN Format'] },
    ];

    render(<TaxonomyBreadcrumb breadcrumbs={path} onNavigate={onNavigate} />);

    const breadcrumb = screen.getByText('TIN Format');
    breadcrumb.click();

    expect(onNavigate).toHaveBeenCalledWith(['Preparation', 'TIN Format']);
  });
});

describe('Cross-Reference Links', () => {
  it('should render cross-reference links', () => {
    const links = [
      {
        targetPdfLink: 'i1099gi.pdf#p15.s2',
        relationship: 'see_also',
        label: 'See General Instructions',
      },
    ];

    render(<CrossReferenceLinks links={links} />);

    expect(screen.getByText('See General Instructions')).toBeInTheDocument();
  });

  it('should show relationship type badge', () => {
    const links = [
      {
        targetPdfLink: 'i1099gi.pdf#p15.s2',
        relationship: 'defined_in',
        label: 'Definition',
      },
    ];

    render(<CrossReferenceLinks links={links} />);

    expect(screen.getByText(/defined/i)).toBeInTheDocument();
  });

  it('should handle multiple links', () => {
    const links = [
      { targetPdfLink: 'a.pdf#p1', relationship: 'see_also', label: 'Link 1' },
      { targetPdfLink: 'b.pdf#p2', relationship: 'example_in', label: 'Link 2' },
    ];

    render(<CrossReferenceLinks links={links} />);

    expect(screen.getByText('Link 1')).toBeInTheDocument();
    expect(screen.getByText('Link 2')).toBeInTheDocument();
  });
});

describe('Example Data Display', () => {
  it('should render valid example in code block', () => {
    const examples = {
      valid: ['XX-XXXXXXX'],
      invalid: [],
    };

    render(<ExampleDisplay examples={examples} />);

    expect(screen.getByText('XX-XXXXXXX')).toBeInTheDocument();
    expect(screen.getByText(/valid/i)).toBeInTheDocument();
  });

  it('should render invalid example with error styling', () => {
    const examples = {
      valid: [],
      invalid: ['12345'],
    };

    render(<ExampleDisplay examples={examples} />);

    const invalid = screen.getByText('12345');
    expect(invalid).toHaveClass('text-red-900');
  });

  it('should categorize examples by type', () => {
    const examples = {
      valid: ['XX-XXXXXXX', 'AA-1234567'],
      invalid: ['12345'],
      category: 'format',
    };

    render(<ExampleDisplay examples={examples} />);

    expect(screen.getByText(/format/i)).toBeInTheDocument();
  });
});

describe('Teach Mode Overlay Content', () => {
  it('should render all content sections', () => {
    const content = {
      paragraph: {
        content: 'Test paragraph content.',
        source: { pdf: 'test.pdf', page: 1 },
      },
      taxonomy: [{ label: 'Test', path: ['Test'] }],
      examples: { valid: ['good'], invalid: ['bad'] },
    };

    render(<TeachModeOverlayContent content={content} />);

    expect(screen.getByText(/Test paragraph content/)).toBeInTheDocument();
    expect(screen.getByText('good')).toBeInTheDocument();
    expect(screen.getByText('bad')).toBeInTheDocument();
  });

  it('should handle missing optional sections', () => {
    const content = {
      paragraph: {
        content: 'Minimal content.',
      },
    };

    render(<TeachModeOverlayContent content={content} />);

    expect(screen.getByText(/Minimal content/)).toBeInTheDocument();
  });
});
