/**
 * Sample Employee Wage Data for EFW2 Test Fixtures
 *
 * Mock employee wage information following SSA EFW2 specifications
 */

import { createEmployeeWageRecord } from '../../../lib/efw2/records';
import type { EmployeeWageRecord } from '../../../lib/efw2/types';

/**
 * Sample employee record - full-time employee with standard wages
 */
export const sampleEmployee1: EmployeeWageRecord = createEmployeeWageRecord()
  .withSSN('123456789')
  .withLastName('SMITH')
  .withFirstName('JOHN')
  .withMiddleInitial('Q')
  .withAddressLine1('123 OAK STREET')
  .withAddressLine2('APT 4B')
  .withCity('BROOKLYN')
  .withState('NY')
  .withZipCode('11201')
  .withZipExtension('1234')
  .withWages(75000) // $75,000.00
  .withFederalTaxWithheld(12000) // $12,000.00
  .withSocialSecurityWages(75000) // $75,000.00
  .withSocialSecurityTaxWithheld(4650) // $4,650.00 (6.2%)
  .withMedicareWages(75000) // $75,000.00
  .withMedicareTaxWithheld(1087.5) // $1,087.50 (1.45%)
  .withSequenceNumber('00001')
  .build();

/**
 * Sample employee record - hourly worker with tips
 */
export const sampleEmployee2: EmployeeWageRecord = createEmployeeWageRecord()
  .withSSN('987654321')
  .withLastName('JOHNSON')
  .withFirstName('MARY')
  .withMiddleInitial('E')
  .withAddressLine1('456 MAPLE AVENUE')
  .withCity('STATEN ISLAND')
  .withState('NY')
  .withZipCode('10301')
  .withWages(45000) // $45,000.00
  .withFederalTaxWithheld(5400) // $5,400.00
  .withSocialSecurityWages(45000) // $45,000.00
  .withSocialSecurityTaxWithheld(2790) // $2,790.00
  .withMedicareWages(45000) // $45,000.00
  .withMedicareTaxWithheld(652.5) // $652.50
  .withSocialSecurityTips(3500) // $3,500.00 in tips
  .withAllocatedTips(1200) // $1,200.00 allocated tips
  .withIncomeTipsIndicator('X') // Income in tips
  .withSequenceNumber('00002')
  .build();

/**
 * Sample employee record - high earner with dependent care benefits
 */
export const sampleEmployee3: EmployeeWageRecord = createEmployeeWageRecord()
  .withSSN('111223333')
  .withLastName('WILLIAMS')
  .withFirstName('ROBERT')
  .withAddressLine1('789 PARK AVENUE')
  .withCity('NEW YORK')
  .withState('NY')
  .withZipCode('10022')
  .withWages(185000) // $185,000.00
  .withFederalTaxWithheld(45000) // $45,000.00
  .withSocialSecurityWages(160200) // $160,200.00 (SS wage cap)
  .withSocialSecurityTaxWithheld(9932.4) // $9,932.40
  .withMedicareWages(185000) // $185,000.00 (no cap)
  .withMedicareTaxWithheld(2682.5) // $2,682.50
  .withDependentCareBenefits(5000) // $5,000.00 dependent care
  .withNonqualifiedPlans(15000) // $15,000.00 nonqualified plans
  .withDeferredCompIndicator('D') // Deferred compensation
  .withSequenceNumber('00003')
  .build();

/**
 * Sample employee record - minimum wage worker
 */
export const sampleEmployee4: EmployeeWageRecord = createEmployeeWageRecord()
  .withSSN('444556666')
  .withLastName('GARCIA')
  .withFirstName('MARIA')
  .withAddressLine1('321 ELM COURT')
  .withCity('JERSEY CITY')
  .withState('NJ')
  .withZipCode('07302')
  .withWages(31200) // $31,200.00 ($15/hr, 2080 hours)
  .withFederalTaxWithheld(2800) // $2,800.00
  .withSocialSecurityWages(31200) // $31,200.00
  .withSocialSecurityTaxWithheld(1934.4) // $1,934.40
  .withMedicareWages(31200) // $31,200.00
  .withMedicareTaxWithheld(452.4) // $452.40
  .withSequenceNumber('00004')
  .build();

/**
 * Sample employee record - part-time worker
 */
export const sampleEmployee5: EmployeeWageRecord = createEmployeeWageRecord()
  .withSSN('777889999')
  .withLastName('CHEN')
  .withFirstName('DAVID')
  .withAddressLine1('555 BROADWAY')
  .withCity('NEW YORK')
  .withState('NY')
  .withZipCode('10003')
  .withWages(18500) // $18,500.00 (part-time)
  .withFederalTaxWithheld(1200) // $1,200.00
  .withSocialSecurityWages(18500) // $18,500.00
  .withSocialSecurityTaxWithheld(1147) // $1,147.00
  .withMedicareWages(18500) // $18,500.00
  .withMedicareTaxWithheld(268.25) // $268.25
  .withSequenceNumber('00005')
  .build();

/**
 * Collection of all sample employees
 */
export const sampleEmployees = {
  smith: sampleEmployee1,
  johnson: sampleEmployee2,
  williams: sampleEmployee3,
  garcia: sampleEmployee4,
  chen: sampleEmployee5
};

/**
 * All employees as array
 */
export const allSampleEmployees: EmployeeWageRecord[] = [
  sampleEmployee1,
  sampleEmployee2,
  sampleEmployee3,
  sampleEmployee4,
  sampleEmployee5
];
