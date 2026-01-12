/**
 * Tests for CAFR API Client
 * 
 * Test file following TDD principles:
 * 1. search - should call FETCH with correct parameters
 * 2. getDocument - should retrieve a document by ID
 * 3. getPdfUrl - should return the correct PDF URL
 * 4. getFinancialSummary - should retrieve financial data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cafrApi } from './cafrApiClient';

// Mock global fetch
global.fetch = vi.fn();

describe('cafrApiClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('search', () => {
        it('should call fetch with correct URL and parameters', async () => {
            const mockResult = {
                documents: [],
                totalCount: 0,
                page: 1,
                pageSize: 20
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResult)
            });

            const params = {
                entityName: 'Los Angeles',
                state: 'CA',
                fiscalYear: 2024
            };

            const result = await cafrApi.search(params);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/cafr/search?entityName=Los+Angeles&state=CA&fiscalYear=2024')
            );
            expect(result).toEqual(mockResult);
        });

        it('should throw error if fetch fails', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                statusText: 'Internal Server Error'
            });

            await expect(cafrApi.search({ entityName: 'Test' })).rejects.toThrow('CAFR search failed: Internal Server Error');
        });
    });

    describe('getDocument', () => {
        it('should fetch document by ID', async () => {
            const mockDoc = {
                id: 'cafr-001',
                entityName: 'Test City',
                entityType: 'city',
                state: 'CA',
                fiscalYear: 2024,
                filingDate: '2024-06-30',
                pdfUrl: 'https://example.com/cafr.pdf'
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockDoc)
            });

            const result = await cafrApi.getDocument('cafr-001');

            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/cafr/documents/cafr-001'));
            expect(result).toEqual(mockDoc);
        });

        it('should throw error if document not found', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false
            });

            await expect(cafrApi.getDocument('invalid-id')).rejects.toThrow('CAFR document not found: invalid-id');
        });
    });

    describe('getFinancialSummary', () => {
        it('should fetch financial summary for a document', async () => {
            const mockSummary = {
                documentId: 'cafr-001',
                totalRevenue: 1000000,
                totalExpenditure: 950000,
                generalFundBalance: 50000,
                totalDebt: 200000
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockSummary)
            });

            const result = await cafrApi.getFinancialSummary('cafr-001');

            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/cafr/documents/cafr-001/summary'));
            expect(result).toEqual(mockSummary);
        });
    });

    describe('Utility Methods', () => {
        it('getStates should return a list of states', () => {
            const states = cafrApi.getStates();
            expect(states.length).toBeGreaterThan(0);
            expect(states.find(s => s.code === 'CA')).toBeDefined();
        });

        it('getFiscalYears should return recent years', () => {
            const years = cafrApi.getFiscalYears();
            const currentYear = new Date().getFullYear();
            expect(years).toContain(currentYear);
            expect(years).toContain(currentYear - 1);
        });
    });
});
