/**
 * Tests for CAFRViewer Component
 *
 * Test file following TDD principles:
 * 1. Initial render - should show empty state
 * 2. Document selected - should show loading state then PDF viewer
 * 3. Error state - should display error if PDF fails to load
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CAFRViewer } from './CAFRViewer';
import * as cafrApiClient from '../services/cafrApiClient';

// Mock CAFR API client
vi.mock('../services/cafrApiClient', () => ({
    cafrApi: {
        getPdfUrl: vi.fn(),
    },
}));

describe('CAFRViewer Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render empty state when no document is selected', () => {
        render(<CAFRViewer />);
        expect(screen.getByText(/Select a CAFR to view the document/i)).toBeInTheDocument();
    });

    it('should show loading state and then render iframe when document is selected', async () => {
        const mockDoc = {
            id: 'cafr-001',
            entityName: 'Test City',
            pdfUrl: 'https://example.com/cafr.pdf'
        };

        (cafrApiClient.cafrApi.getPdfUrl as any).mockResolvedValue('https://example.com/cafr.pdf');

        render(<CAFRViewer document={mockDoc as any} />);

        expect(screen.getByText(/Loading document.../i)).toBeInTheDocument();

        await waitFor(() => {
            const iframe = screen.getByTitle(/CAFR Document Viewer/i) as HTMLIFrameElement;
            expect(iframe).toBeInTheDocument();
            expect(iframe.src).toContain('https://example.com/cafr.pdf');
        });
    });

    it('should display error when PDF URL retrieval fails', async () => {
        const mockDoc = {
            id: 'cafr-001',
            entityName: 'Test City'
        };

        (cafrApiClient.cafrApi.getPdfUrl as any).mockRejectedValue(new Error('Failed to retrieve PDF URL'));

        render(<CAFRViewer document={mockDoc as any} />);

        await waitFor(() => {
            expect(screen.getByText('Failed to retrieve PDF URL')).toBeInTheDocument();
            expect(screen.getByText('Failed to load document')).toBeInTheDocument();
        });
    });

    it('should render buttons for full screen and download', async () => {
        const mockDoc = {
            id: 'cafr-001',
            entityName: 'Test City',
            pdfUrl: 'https://example.com/cafr.pdf'
        };

        (cafrApiClient.cafrApi.getPdfUrl as any).mockResolvedValue('https://example.com/cafr.pdf');

        render(<CAFRViewer document={mockDoc as any} />);

        await waitFor(() => {
            expect(screen.getByText(/View Fullscreen/i)).toBeInTheDocument();
            expect(screen.getByText(/Download/i)).toBeInTheDocument();
        });
    });
});
