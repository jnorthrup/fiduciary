import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PreviewPane } from './PreviewPane';
import { Affidavit } from '../../types/admin-process';

describe('PreviewPane', () => {
    const mockAffidavit: Partial<Affidavit> = {
        title: 'Test Affidavit Title',
        affiant: {
            name: 'John Doe',
            entityType: 'Individual',
            capacity: 'Beneficiary',
            address: { street: '123 Main', city: 'TestCity', state: 'TS', zip: '12345' }
        },
        claims: [
            {
                id: '1',
                description: 'First claim statement.',
                legalBasis: 'Common Law',
                supportingCitations: [
                    { type: 'statute', title: 'Test Act', url: 'http://test.com', section: '1' }
                ],
                timestamp: '2023-01-01'
            }
        ]
    };

    it('renders empty state when no content provided', () => {
        render(<PreviewPane affidavit={{}} />);
        expect(screen.getByText('Document Preview will appear here')).toBeInTheDocument();
    });

    it('renders affidavit title and affiant info', () => {
        render(<PreviewPane affidavit={mockAffidavit} />);
        expect(screen.getByText('Test Affidavit Title')).toBeInTheDocument();
        expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Beneficiary')[0]).toBeInTheDocument();
        expect(screen.getByText(/STATE OF TS/)).toBeInTheDocument();
    });

    it('renders claims and citations', () => {
        render(<PreviewPane affidavit={mockAffidavit} />);
        expect(screen.getByText(/First claim statement/)).toBeInTheDocument();
        expect(screen.getByText(/Test Act/)).toBeInTheDocument();
    });

    it('renders notary block placeholder', () => {
        render(<PreviewPane affidavit={mockAffidavit} />);
        expect(screen.getByText(/JURAT \/ ACKNOWLEDGMENT/)).toBeInTheDocument();
        expect(screen.getByText('[NOTARY SEAL PLACEHOLDER]')).toBeInTheDocument();
    });
});
