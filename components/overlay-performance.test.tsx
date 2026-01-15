/**
 * Overlay Performance Tests
 *
 * Tests for Teach Mode overlay render performance.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeachModeOverlay } from './overlay-interaction';
import { TeachModeContent } from './overlay-content';
import { queryPDFContent } from '../services/teach-mode/pdf-retrieval';
import React from 'react';

describe('Overlay Render Performance', () => {
  const mockContent: TeachModeContent = {
    paragraph: {
      content: 'This is a long paragraph of text that needs to be rendered quickly. ' +
               'It contains multiple sentences and should test the performance of the ' +
               'rendering engine when displaying the overlay content.'
    },
    taxonomy: [
      { label: 'Level 1', path: ['Level 1'] },
      { label: 'Level 2', path: ['Level 1', 'Level 2'] },
      { label: 'Level 3', path: ['Level 1', 'Level 2', 'Level 3'] }
    ],
    examples: {
      valid: ['Example 1', 'Example 2', 'Example 3'],
      invalid: ['Bad Example 1', 'Bad Example 2']
    }
  };

  it('should render overlay in less than 100ms', () => {
    const start = performance.now();
    
    render(
      <TeachModeOverlay 
        visible={true} 
        onVisibleChange={() => {}} 
        content={mockContent}
      />
    );
    
    const end = performance.now();
    const duration = end - start;
    
    // Check if content is actually rendered
    expect(screen.getByText(/Level 3/)).toBeInTheDocument();
    
    console.log(`Overlay render duration: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(100);
  });

  it('should handle many updates efficiently', () => {
    const { rerender } = render(
      <TeachModeOverlay 
        visible={true} 
        onVisibleChange={() => {}} 
        content={mockContent}
      />
    );

    const start = performance.now();
    
    // Perform 100 updates
    for (let i = 0; i < 100; i++) {
      const newContent = {
        ...mockContent,
        paragraph: { content: `Update ${i}: ${mockContent.paragraph.content}` }
      };
      rerender(
        <TeachModeOverlay 
          visible={true} 
          onVisibleChange={() => {}} 
          content={newContent}
        />
      );
    }
    
    const end = performance.now();
    const avgDuration = (end - start) / 100;
    
    console.log(`Average overlay update duration: ${avgDuration.toFixed(2)}ms`);
    expect(avgDuration).toBeLessThan(10); // Each update should be very fast
  });
});

describe('AI Retrieval Performance', () => {
  it('should retrieve paragraphs in less than 500ms (with cache)', async () => {
    const query = {
      fieldId: 'perf_test',
      description: 'Performance test query',
      formId: 'i1099nec'
    };

    // First call to prime cache
    await queryPDFContent(query);

    const start = performance.now();
    const result = await queryPDFContent(query);
    const end = performance.now();
    const duration = end - start;

    expect(result.metadata.cacheHit).toBe(true);
    console.log(`Cached AI retrieval duration: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(500);
  });

  it('should handle concurrent requests efficiently', async () => {
    const queries = Array.from({ length: 10 }, (_, i) => ({
      fieldId: `field_${i}`,
      description: `Description ${i}`,
      formId: 'i1099nec'
    }));

    const start = performance.now();
    await Promise.all(queries.map(q => queryPDFContent(q)));
    const end = performance.now();
    const duration = end - start;

    console.log(`10 concurrent AI retrievals duration: ${duration.toFixed(2)}ms`);
    // Even concurrent requests should be relatively fast if some are cached or handled in parallel
    expect(duration).toBeLessThan(2000); 
  });
});
