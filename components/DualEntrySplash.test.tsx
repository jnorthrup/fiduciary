/**
 * Tests for DualEntrySplash component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DualEntrySplash } from './DualEntrySplash';

describe('DualEntrySplash', () => {
    const mockOnSelectSkin = vi.fn();
    const defaultProps = {
        userEmail: 'test@example.com',
        userPhoto: 'https://example.com/photo.jpg',
        onSelectSkin: mockOnSelectSkin,
    };

    it('renders two skin option cards', () => {
        render(<DualEntrySplash {...defaultProps} />);

        expect(screen.getByText('Trust Ledger Classic')).toBeInTheDocument();
        expect(screen.getByText('Personal Finance')).toBeInTheDocument();
    });

    it('displays Lucide icons for each skin', () => {
        const { container } = render(<DualEntrySplash {...defaultProps} />);

        // Check for SVG icons (Building2 and Sparkles from lucide-react)
        const svgs = container.querySelectorAll('svg');
        expect(svgs.length).toBeGreaterThan(0);
    });

    it('calls onSelectSkin callback when jnorthrup card is clicked', () => {
        render(<DualEntrySplash {...defaultProps} />);

        const jnorthrupButton = screen.getByText('Trust Ledger Classic').closest('button');
        jnorthrupButton?.click();

        expect(mockOnSelectSkin).toHaveBeenCalledWith('jnorthrup');
    });

    it('calls onSelectSkin callback when lastrust card is clicked', () => {
        render(<DualEntrySplash {...defaultProps} />);

        const lastrustButton = screen.getByText('Personal Finance').closest('button');
        lastrustButton?.click();

        expect(mockOnSelectSkin).toHaveBeenCalledWith('lastrust');
    });

    it('is keyboard navigable', () => {
        const { container } = render(<DualEntrySplash {...defaultProps} />);

        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBe(2);

        buttons.forEach(button => {
            expect(button).toHaveAttribute('type');
        });
    });

    it('displays user email', () => {
        render(<DualEntrySplash {...defaultProps} />);

        expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('displays user photo when provided', () => {
        const { container } = render(<DualEntrySplash {...defaultProps} />);

        const images = container.querySelectorAll('img');
        expect(images.length).toBe(1);
        expect(images[0]).toHaveAttribute('src', 'https://example.com/photo.jpg');
    });

    it('works without user photo', () => {
        const props = { ...defaultProps, userPhoto: undefined };
        const { container } = render(<DualEntrySplash {...props} />);

        const images = container.querySelectorAll('img');
        expect(images.length).toBe(0);
    });
});
