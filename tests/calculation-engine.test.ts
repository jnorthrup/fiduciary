import { describe, it, expect } from 'vitest';
import {
  calculateSpread,
  calculateUsury,
  SpreadCalculation,
  UsuryCalculation,
  StateUsuryLimits,
  getUsuryLimit,
  isUsurious,
  calculateEffectiveAPR
} from '../types/calculation-engine';

describe('Fractional Reserve Calculator', () => {
  describe('calculateSpread', () => {
    it('should calculate spread with 10% reserve ratio', () => {
      const result: SpreadCalculation = calculateSpread(100000, 0.10, 'loan-001');

      expect(result.loanAmount).toBe(100000);
      expect(result.reserveRatio).toBe(0.10);
      // 100,000 / 0.10 = 1,000,000 fractionally reserved amount
      expect(result.fractionallyReservedAmount).toBe(1000000);
      expect(result.spread).toBe(900000); // 1,000,000 - 100,000
      expect(result.loanReferenceId).toBe('loan-001');
    });

    it('should calculate spread with 9% reserve ratio (speaker claim)', () => {
      const result: SpreadCalculation = calculateSpread(35000, 0.09, 'loan-002');

      expect(result.loanAmount).toBe(35000);
      expect(result.reserveRatio).toBe(0.09);
      // 35,000 / 0.09 = 388,888.89
      expect(result.fractionallyReservedAmount).toBeCloseTo(388888.89, 2);
      expect(result.spread).toBeCloseTo(353888.89, 2); // 388,888.89 - 35,000
    });

    it('should calculate spread with 1% reserve ratio', () => {
      const result: SpreadCalculation = calculateSpread(50000, 0.01, 'loan-003');

      expect(result.loanAmount).toBe(50000);
      // 50,000 / 0.01 = 5,000,000
      expect(result.fractionallyReservedAmount).toBe(5000000);
      expect(result.spread).toBe(4950000);
    });

    it('should calculate usury amount when interest rate exceeds threshold', () => {
      const result: SpreadCalculation = calculateSpread(100000, 0.10, 'loan-004', 0.15, 60);

      expect(result.loanAmount).toBe(100000);
      expect(result.spread).toBe(900000);
      expect(result.usuryAmount).toBeDefined();
      // Total interest = 100,000 * 0.15 * (60/12) = 75,000
      // At 5% threshold: 100,000 * 0.05 * (60/12) = 25,000
      // Usury = 75,000 - 25,000 = 50,000
      expect(result.usuryAmount).toBe(50000);
    });

    it('should handle edge case of zero reserve ratio', () => {
      expect(() => calculateSpread(100000, 0, 'loan-005'))
        .toThrow('Reserve ratio must be greater than zero');
    });

    it('should handle edge case of negative loan amount', () => {
      expect(() => calculateSpread(-10000, 0.10, 'loan-006'))
        .toThrow('Loan amount must be positive');
    });

    it('should include calculation timestamp', () => {
      const before = new Date();
      const result: SpreadCalculation = calculateSpread(100000, 0.10, 'loan-007');
      const after = new Date();

      expect(result.calculationDate).toBeDefined();
      const calcDate = new Date(result.calculationDate);
      expect(calcDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(calcDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('calculateUsury', () => {
    it('should calculate usury for loan exceeding state limit', () => {
      const result: UsuryCalculation = calculateUsury(10000, 0.20, 36, 'CA', 5);

      expect(result.principal).toBe(10000);
      expect(result.interestRate).toBe(0.20); // 20%
      expect(result.termMonths).toBe(36);

      // Total interest at 20%: 10,000 * 0.20 * 3 = 6,000
      // Total interest at 5% limit: 10,000 * 0.05 * 3 = 1,500
      expect(result.totalInterestCharged).toBe(6000);
      expect(result.totalInterestAllowed).toBe(1500);
      expect(result.usuryAmount).toBe(4500);
      expect(result.isUsurious).toBe(true);
    });

    it('should return zero usury for loan within limits', () => {
      const result: UsuryCalculation = calculateUsury(10000, 0.05, 36, 'CA', 5);

      expect(result.principal).toBe(10000);
      expect(result.totalInterestCharged).toBe(1500); // 10,000 * 0.05 * 3
      expect(result.totalInterestAllowed).toBe(1500);
      expect(result.usuryAmount).toBe(0);
      expect(result.isUsurious).toBe(false);
    });

    it('should calculate usury for different state limits', () => {
      const nyResult: UsuryCalculation = calculateUsury(10000, 0.18, 60, 'NY', 16);
      expect(nyResult.isUsurious).toBe(true);

      const txResult: UsuryCalculation = calculateUsury(10000, 0.12, 60, 'TX', 6);
      expect(txResult.isUsurious).toBe(true);
    });

    it('should handle zero interest rate', () => {
      const result: UsuryCalculation = calculateUsury(10000, 0, 36, 'CA', 5);

      expect(result.totalInterestCharged).toBe(0);
      expect(result.usuryAmount).toBe(0);
      expect(result.isUsurious).toBe(false);
    });

    it('should calculate total interest correctly for various terms', () => {
      const month12: UsuryCalculation = calculateUsury(10000, 0.10, 12, 'CA', 5);
      expect(month12.totalInterestCharged).toBe(1000); // 10,000 * 0.10 * 1

      const month24: UsuryCalculation = calculateUsury(10000, 0.10, 24, 'CA', 5);
      expect(month24.totalInterestCharged).toBe(2000); // 10,000 * 0.10 * 2

      const month60: UsuryCalculation = calculateUsury(10000, 0.10, 60, 'CA', 5);
      expect(month60.totalInterestCharged).toBe(5000); // 10,000 * 0.10 * 5
    });
  });

  describe('StateUsuryLimits', () => {
    it('should return correct limits for major states', () => {
      expect(getUsuryLimit('CA')).toBe(5); // California general usury limit
      expect(getUsuryLimit('NY')).toBe(16); // New York
      expect(getUsuryLimit('TX')).toBe(6); // Texas
      expect(getUsuryLimit('FL')).toBe(18); // Florida
    });

    it('should return default limit for unspecified state', () => {
      const limit = getUsuryLimit('ZZ');
      expect(limit).toBe(10); // Default federal rate
    });
  });

  describe('isUsurious', () => {
    it('should identify usurious loans', () => {
      expect(isUsurious(10000, 0.20, 36, 'CA')).toBe(true);
      expect(isUsurious(10000, 0.15, 36, 'CA')).toBe(true);
      expect(isUsurious(10000, 0.10, 36, 'CA')).toBe(true);
    });

    it('should identify non-usurious loans', () => {
      expect(isUsurious(10000, 0.05, 36, 'CA')).toBe(false);
      expect(isUsurious(10000, 0.04, 36, 'CA')).toBe(false);
      expect(isUsurious(10000, 0.03, 36, 'CA')).toBe(false);
    });
  });

  describe('calculateEffectiveAPR', () => {
    it('should calculate APR from nominal rate and compounding', () => {
      // 6% nominal with monthly compounding
      const apr = calculateEffectiveAPR(0.06, 12);
      expect(apr).toBeCloseTo(0.0617, 3); // Approximately 6.17%
    });

    it('should handle annual compounding', () => {
      const apr = calculateEffectiveAPR(0.05, 1);
      expect(apr).toBeCloseTo(0.05, 5); // Same as nominal for annual compounding
    });

    it('should handle daily compounding', () => {
      const apr = calculateEffectiveAPR(0.05, 365);
      expect(apr).toBeCloseTo(0.0513, 3); // Approximately 5.13%
    });
  });
});
