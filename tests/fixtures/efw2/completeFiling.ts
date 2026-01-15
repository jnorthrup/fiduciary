/**
 * Complete EFW2 Filing Examples
 *
 * Complete mock filings combining employers, employees, and totals
 * for testing and validation
 */

import { createEFW2File, createTotalRecord } from '../../../lib/efw2/EFW2File';
import { sampleEmployer, sampleEmployers } from './sampleEmployer';
import { allSampleEmployees, sampleEmployees } from './sampleEmployees';

/**
 * Simple filing with one employer and one employee
 */
export function createSimpleFiling() {
  return createEFW2File()
    .addEmployerRecord(sampleEmployer)
    .addEmployeeRecord(sampleEmployees.smith)
    .addTotalRecord(
      createTotalRecord()
        .withEin(sampleEmployer.ein)
        .withEstablishmentNumber('0001')
        .withTotalEmployeeRecords(1)
        .withTotalWages(7500000) // $75,000.00 in cents
        .withTotalFederalTaxWithheld(1200000) // $12,000.00 in cents
        .withTotalSocialSecurityWages(7500000)
        .withTotalSocialSecurityTaxWithheld(465000) // $4,650.00 in cents
        .withTotalMedicareWages(7500000)
        .withTotalMedicareTaxWithheld(108750) // $1,087.50 in cents
        .withSequenceNumber('00001')
        .build()
    )
    .build();
}

/**
 * Complete filing with one employer and multiple employees
 */
export function createCompleteFiling() {
  return createEFW2File()
    .addEmployerRecord(sampleEmployer)
    .addEmployeeRecord(sampleEmployees.smith)
    .addEmployeeRecord(sampleEmployees.johnson)
    .addEmployeeRecord(sampleEmployees.williams)
    .addEmployeeRecord(sampleEmployees.garcia)
    .addEmployeeRecord(sampleEmployees.chen)
    .addTotalRecord(
      createTotalRecord()
        .withEin(sampleEmployer.ein)
        .withEstablishmentNumber('0001')
        .withTotalEmployeeRecords(5)
        .withTotalWages(35470000) // Sum of all wages in cents
        .withTotalFederalTaxWithheld(6640000)
        .withTotalSocialSecurityWages(35470000)
        .withTotalSocialSecurityTaxWithheld(2055380)
        .withTotalMedicareWages(35470000)
        .withTotalMedicareTaxWithheld(514315)
        .withSequenceNumber('00001')
        .build()
    )
    .build();
}

/**
 * Multi-establishment filing with one employer, multiple establishments
 */
export function createMultiEstablishmentFiling() {
  const mainOffice = sampleEmployer;
  const branchOffice = sampleEmployers.smallBusiness;

  return createEFW2File()
    .addEmployerRecord(mainOffice)
    .addEmployerRecord(branchOffice)
    .addEmployeeRecord(sampleEmployees.smith)
    .addEmployeeRecord(sampleEmployees.johnson)
    .addEmployeeRecord(sampleEmployees.garcia)
    .addTotalRecord(
      createTotalRecord()
        .withEin(mainOffice.ein)
        .withEstablishmentNumber('0001')
        .withTotalEmployeeRecords(3)
        .withTotalWages(15120000) // $75,000 + $45,000 + $31,200
        .withTotalFederalTaxWithheld(2020000)
        .withTotalSocialSecurityWages(15120000)
        .withTotalSocialSecurityTaxWithheld(937440)
        .withTotalMedicareWages(15120000)
        .withTotalMedicareTaxWithheld(219090)
        .withSequenceNumber('00001')
        .build()
    )
    .build();
}

/**
 * Filing with employee who has tips
 */
export function createTipsFiling() {
  return createEFW2File()
    .addEmployerRecord(sampleEmployer)
    .addEmployeeRecord(sampleEmployees.johnson) // Has tips
    .addTotalRecord(
      createTotalRecord()
        .withEin(sampleEmployer.ein)
        .withEstablishmentNumber('0001')
        .withTotalEmployeeRecords(1)
        .withTotalWages(4500000) // $45,000.00
        .withTotalFederalTaxWithheld(540000) // $5,400.00
        .withTotalSocialSecurityWages(4500000)
        .withTotalSocialSecurityTaxWithheld(279000)
        .withTotalMedicareWages(4500000)
        .withTotalMedicareTaxWithheld(65250)
        .withSequenceNumber('00001')
        .build()
    )
    .build();
}

/**
 * Filing with high earner (above SS wage cap)
 */
export function createHighEarnerFiling() {
  return createEFW2File()
    .addEmployerRecord(sampleEmployer)
    .addEmployeeRecord(sampleEmployees.williams) // High earner
    .addTotalRecord(
      createTotalRecord()
        .withEin(sampleEmployer.ein)
        .withEstablishmentNumber('0001')
        .withTotalEmployeeRecords(1)
        .withTotalWages(18500000) // $185,000.00
        .withTotalFederalTaxWithheld(4500000) // $45,000.00
        .withTotalSocialSecurityWages(16020000) // Capped at SS limit
        .withTotalSocialSecurityTaxWithheld(993240)
        .withTotalMedicareWages(18500000) // No cap for Medicare
        .withTotalMedicareTaxWithheld(268250)
        .withSequenceNumber('00001')
        .build()
    )
    .build();
}

/**
 * Export all filing examples
 */
export const filingExamples = {
  simple: createSimpleFiling,
  complete: createCompleteFiling,
  multiEstablishment: createMultiEstablishmentFiling,
  tips: createTipsFiling,
  highEarner: createHighEarnerFiling
};
