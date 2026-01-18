/**
 * Payroll & HR Domain Types
 * Employee management and payroll processing
 */

export interface Employee {
  id: string;
  entityId: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  salary: number;
  payFrequency: string;
  status: 'Active' | 'Onboarding' | 'Terminated' | 'Leave';
  hireDate: string;
}

export interface PayrollRun {
  id: string;
  entityId: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  totalGross: number;
  totalEmployerTax: number;
  totalNetPay: number;
  status: 'Posted';
}

export interface SSAStatement {
  lastUpdated: string;
  eligibilityStatus: 'Qualified' | 'Not Qualified';
  estimatedRetirementBenefit: number;
  currentYear: number;
  taxedSocialSecurityEarnings: number;
  taxedMedicareEarnings: number;
  credits: number;
}
