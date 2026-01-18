// Calculation Engine for Administrative Process

/**
 * Calculation result for fractional reserve spread
 */
export interface SpreadCalculation {
  loanAmount: number;
  reserveRatio: number;
  fractionallyReservedAmount: number;
  spread: number;
  usuryAmount?: number;
  calculationDate: string;
  loanReferenceId: string;
}

/**
 * Calculation result for usury analysis
 */
export interface UsuryCalculation {
  principal: number;
  interestRate: number;
  termMonths: number;
  totalInterestCharged: number;
  totalInterestAllowed: number;
  usuryAmount: number;
  isUsurious: boolean;
  stateLimit: number;
  calculationDate: string;
}

/**
 * State-specific usury limits (annual percentage rate)
 */
export interface StateUsuryLimits {
  [stateCode: string]: number;
}

/**
 * State usury limits (general, simplified)
 * Note: These are simplified and may not reflect current law or exceptions
 */
export const STATE_USURY_LIMITS: StateUsuryLimits = {
  'CA': 5,  // California general usury limit (non-exempt loans)
  'NY': 16, // New York civil usury limit
  'TX': 6,  // Texas general usury limit
  'FL': 18, // Florida general usury limit
  'IL': 9,  // Illinois general usury limit
  'PA': 6,  // Pennsylvania general usury limit
  'OH': 8,  // Ohio general usury limit
  'GA': 7,  // Georgia general usury limit
  'NC': 8,  // North Carolina general usury limit
  'MI': 7,  // Michigan general usury limit
  'NJ': 16, // New Jersey civil usury limit
  'VA': 8,  // Virginia general usury limit
  'WA': 12, // Washington civil usury limit
  'MA': 20, // Massachusetts civil usury limit
  'AZ': 10, // Arizona general usury limit
  'CO': 10, // Colorado general usury limit
  'MO': 10, // Missouri general usury limit
  'TN': 10, // Tennessee general usury limit
};

/**
 * Default usury limit for unspecified states
 */
const DEFAULT_USURY_LIMIT = 10;

/**
 * Calculate fractional reserve spread
 * @param loanAmount The original loan amount
 * @param reserveRatio The reserve ratio (e.g., 0.10 for 10%)
 * @param loanReferenceId Reference ID for the loan
 * @param interestRate Optional annual interest rate (decimal)
 * @param termMonths Optional loan term in months
 * @returns SpreadCalculation with calculated values
 */
export function calculateSpread(
  loanAmount: number,
  reserveRatio: number,
  loanReferenceId: string,
  interestRate?: number,
  termMonths?: number
): SpreadCalculation {
  // Validate inputs
  if (loanAmount <= 0) {
    throw new Error('Loan amount must be positive');
  }

  if (reserveRatio <= 0) {
    throw new Error('Reserve ratio must be greater than zero');
  }

  if (reserveRatio > 1) {
    throw new Error('Reserve ratio cannot exceed 100%');
  }

  // Calculate fractionally reserved amount
  // Formula: loanAmount / reserveRatio
  const fractionallyReservedAmount = loanAmount / reserveRatio;

  // Calculate the spread (difference)
  const spread = fractionallyReservedAmount - loanAmount;

  const result: SpreadCalculation = {
    loanAmount,
    reserveRatio,
    fractionallyReservedAmount,
    spread,
    calculationDate: new Date().toISOString(),
    loanReferenceId
  };

  // Optionally calculate usury
  if (interestRate !== undefined && termMonths !== undefined) {
    const usury = calculateUsuryRaw(loanAmount, interestRate, termMonths);
    result.usuryAmount = usury.usuryAmount;
  }

  return result;
}

/**
 * Calculate usury for a loan
 * @param principal Loan principal amount
 * @param interestRate Annual interest rate (decimal, e.g., 0.10 for 10%)
 * @param termMonths Loan term in months
 * @param stateCode Two-letter state code
 * @param customLimit Optional custom usury limit (overrides state limit)
 * @returns UsuryCalculation with all details
 */
export function calculateUsury(
  principal: number,
  interestRate: number,
  termMonths: number,
  stateCode: string,
  customLimit?: number
): UsuryCalculation {
  const stateLimit = customLimit ?? getUsuryLimit(stateCode);
  const termYears = termMonths / 12;

  // Calculate total interest charged
  const totalInterestCharged = principal * interestRate * termYears;

  // Calculate total interest allowed at state limit
  const totalInterestAllowed = principal * (stateLimit / 100) * termYears;

  // Calculate usury amount
  const usuryAmount = Math.max(0, totalInterestCharged - totalInterestAllowed);

  return {
    principal,
    interestRate,
    termMonths,
    totalInterestCharged,
    totalInterestAllowed,
    usuryAmount,
    isUsurious: usuryAmount > 0,
    stateLimit,
    calculationDate: new Date().toISOString()
  };
}

/**
 * Raw usury calculation without state limit checking
 */
function calculateUsuryRaw(
  principal: number,
  interestRate: number,
  termMonths: number,
  limitPercent: number = 5
): { totalInterestCharged: number; totalInterestAllowed: number; usuryAmount: number } {
  const termYears = termMonths / 12;
  const totalInterestCharged = principal * interestRate * termYears;
  const totalInterestAllowed = principal * (limitPercent / 100) * termYears;
  const usuryAmount = Math.max(0, totalInterestCharged - totalInterestAllowed);

  return { totalInterestCharged, totalInterestAllowed, usuryAmount };
}

/**
 * Get usury limit for a state
 * @param stateCode Two-letter state code
 * @returns Annual percentage rate limit
 */
export function getUsuryLimit(stateCode: string): number {
  return STATE_USURY_LIMITS[stateCode.toUpperCase()] ?? DEFAULT_USURY_LIMIT;
}

/**
 * Check if a loan is usurious
 * @param principal Loan principal
 * @param interestRate Annual interest rate (decimal)
 * @param termMonths Loan term in months
 * @param stateCode Two-letter state code
 * @returns True if loan exceeds usury limit
 */
export function isUsurious(
  principal: number,
  interestRate: number,
  termMonths: number,
  stateCode: string
): boolean {
  const result = calculateUsury(principal, interestRate, termMonths, stateCode);
  return result.isUsurious;
}

/**
 * Calculate effective APR from nominal rate
 * @param nominalRate Annual nominal rate (decimal)
 * @param compoundingPeriods Number of compounding periods per year
 * @returns Effective annual percentage rate
 */
export function calculateEffectiveAPR(
  nominalRate: number,
  compoundingPeriods: number
): number {
  // Formula: (1 + r/n)^n - 1
  // where r = nominal rate, n = compounding periods
  return Math.pow(1 + nominalRate / compoundingPeriods, compoundingPeriods) - 1;
}

/**
 * Calculate monthly payment for an installment loan
 * @param principal Loan amount
 * @param annualRate Annual interest rate (decimal)
 * @param months Loan term in months
 * @returns Monthly payment amount
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  months: number
): number {
  const monthlyRate = annualRate / 12;

  if (monthlyRate === 0) {
    return principal / months;
  }

  // Standard amortization formula
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                  (Math.pow(1 + monthlyRate, months) - 1);

  return payment;
}

/**
 * Calculate total cost of loan
 * @param principal Loan amount
 * @param annualRate Annual interest rate (decimal)
 * @param months Loan term in months
 * @returns Total cost including principal and interest
 */
export function calculateTotalLoanCost(
  principal: number,
  annualRate: number,
  months: number
): number {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, months);
  return monthlyPayment * months;
}

/**
 * Calculate interest-to-principal ratio
 * @param principal Loan amount
 * @param totalInterest Total interest paid
 * @returns Ratio as percentage
 */
export function calculateInterestRatio(
  principal: number,
  totalInterest: number
): number {
  return (totalInterest / principal) * 100;
}
