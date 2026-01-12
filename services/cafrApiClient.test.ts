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

    describe('Revenue Extraction', () => {
        it('should extract revenue breakdown from document', async () => {
            const mockRevenueData = {
                documentId: 'cafr-001',
                revenue: {
                    total: 1000000,
                    breakdown: [
                        { category: 'Property Taxes', amount: 400000 },
                        { category: 'Sales Taxes', amount: 300000 },
                        { category: 'Federal Grants', amount: 200000 },
                        { category: 'Other', amount: 100000 }
                    ],
                    fiscalYear: 2024
                }
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockRevenueData)
            });

            const result = await cafrApi.extractRevenue('cafr-001');

            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/cafr/documents/cafr-001/revenue'));
            expect(result).toEqual(mockRevenueData);
            expect(result.revenue.total).toBe(1000000);
            expect(result.revenue.breakdown.length).toBe(4);
        });

        it('should throw error when revenue extraction fails', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                statusText: 'Revenue data not available'
            });

            await expect(cafrApi.extractRevenue('cafr-001')).rejects.toThrow('Revenue extraction failed: Revenue data not available');
        });
    });

    describe('Expenditure Extraction', () => {
        it('should extract expenditure breakdown from document', async () => {
            const mockExpenditureData = {
                documentId: 'cafr-001',
                expenditure: {
                    total: 950000,
                    breakdown: [
                        { category: 'Public Safety', amount: 350000 },
                        { category: 'Education', amount: 300000 },
                        { category: 'Infrastructure', amount: 200000 },
                        { category: 'Administration', amount: 100000 }
                    ],
                    fiscalYear: 2024
                }
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockExpenditureData)
            });

            const result = await cafrApi.extractExpenditure('cafr-001');

            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/cafr/documents/cafr-001/expenditure'));
            expect(result).toEqual(mockExpenditureData);
            expect(result.expenditure.total).toBe(950000);
            expect(result.expenditure.breakdown.length).toBe(4);
        });

        it('should throw error when expenditure extraction fails', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                statusText: 'Expenditure data not available'
            });

            await expect(cafrApi.extractExpenditure('cafr-001')).rejects.toThrow('Expenditure extraction failed: Expenditure data not available');
        });
    });

    describe('Debt Ratio Calculation', () => {
        it('should calculate debt ratio from financial summary', async () => {
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

            const result = await cafrApi.calculateDebtRatio('cafr-001');

            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/cafr/documents/cafr-001/summary'));
            expect(result.debtRatio).toBeCloseTo(0.2, 2); // 200000 / 1000000 = 0.2
            expect(result.perCapitaDebt).toBeUndefined();
        });

        it('should handle zero revenue when calculating debt ratio', async () => {
            const mockSummary = {
                documentId: 'cafr-002',
                totalRevenue: 0,
                totalExpenditure: 100000,
                generalFundBalance: 0,
                totalDebt: 50000
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockSummary)
            });

            const result = await cafrApi.calculateDebtRatio('cafr-002');

            expect(result.debtRatio).toBeNull();
        });

        it('should calculate per capita debt when population provided', async () => {
            const mockSummary = {
                documentId: 'cafr-001',
                totalRevenue: 1000000,
                totalExpenditure: 950000,
                generalFundBalance: 50000,
                totalDebt: 200000,
                populationServed: 10000
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockSummary)
            });

            const result = await cafrApi.calculateDebtRatio('cafr-001');

            expect(result.perCapitaDebt).toBe(20); // 200000 / 10000 = 20
        });
    });

    describe('Historical Comparison', () => {
        it('should compare year-over-year financial data', async () => {
            const mockComparison = {
                entityId: 'los-angeles-ca',
                years: [
                    {
                        fiscalYear: 2024,
                        totalRevenue: 1000000,
                        totalExpenditure: 950000,
                        generalFundBalance: 50000,
                        totalDebt: 200000,
                        debtRatio: 0.2
                    },
                    {
                        fiscalYear: 2023,
                        totalRevenue: 950000,
                        totalExpenditure: 920000,
                        generalFundBalance: 30000,
                        totalDebt: 180000,
                        debtRatio: 0.189
                    },
                    {
                        fiscalYear: 2022,
                        totalRevenue: 900000,
                        totalExpenditure: 880000,
                        generalFundBalance: 20000,
                        totalDebt: 160000,
                        debtRatio: 0.178
                    }
                ],
                trends: {
                    revenueChange: 0.111, // +11.1% from 2022 to 2024
                    expenditureChange: 0.08, // +8% from 2022 to 2024
                    debtRatioChange: 0.022, // +2.2% from 2022 to 2024
                    fundBalanceGrowth: 150 // +150% from 2022 to 2024
                }
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockComparison)
            });

            const result = await cafrApi.getHistoricalComparison('los-angeles-ca', [2024, 2023, 2022]);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/cafr/entities/los-angeles-ca/comparison?years=2024,2023,2022')
            );
            expect(result.years.length).toBe(3);
            expect(result.trends.revenueChange).toBeCloseTo(0.111, 3);
        });

        it('should throw error when historical comparison fails', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                statusText: 'Historical data not available'
            });

            await expect(cafrApi.getHistoricalComparison('los-angeles-ca', [2024, 2023]))
                .rejects.toThrow('Historical comparison failed: Historical data not available');
        });

        it('should calculate year-over-year percentage changes', async () => {
            const mockComparison = {
                entityId: 'test-city',
                years: [
                    { fiscalYear: 2024, totalRevenue: 1100000, totalExpenditure: 1000000, totalDebt: 200000 },
                    { fiscalYear: 2023, totalRevenue: 1000000, totalExpenditure: 950000, totalDebt: 190000 }
                ],
                trends: {
                    revenueChange: 0.1, // +10%
                    expenditureChange: 0.0526, // +5.26%
                    debtRatioChange: 0.0526 // +5.26%
                }
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockComparison)
            });

            const result = await cafrApi.getHistoricalComparison('test-city', [2024, 2023]);

            expect(result.years[0].totalRevenue).toBe(1100000);
            expect(result.trends.revenueChange).toBeCloseTo(0.1, 1);
        });
    });
});
