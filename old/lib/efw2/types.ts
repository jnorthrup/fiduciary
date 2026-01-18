/**
 * EFW2 (Electronic Filing W-2) Type Definitions
 *
 * Based on SSA Publication 1220: Specifications for Filing Forms W-2 Electronically
 * https://www.ssa.gov/employer/efw/23efw2.pdf
 */

/**
 * Record type identifier for each EFW2 record type
 */
export enum RecordType {
  /** Record A - Employer identification and establishment information */
  EMPLOYER = 'RA',
  /** Record S - Special tax and reporting information */
  SPECIAL_TAX = 'RS',
  /** Record E - Employee wage and tax information */
  EMPLOYEE_WAGE = 'RE',
  /** Record W - Wage data detail */
  WAGE_DATA = 'RW',
  /** Record T - Total counts and amounts */
  TOTAL = 'RT',
  /** Record U - Update/correction information */
  UPDATE = 'RU',
  /** Record F - File/record count totals */
  FINAL = 'RF'
}

/**
 * Base interface for all EFW2 records
 * All records are fixed-width text format (512 bytes per record)
 */
export interface EFW2Record {
  /** Record type identifier (2 characters) */
  recordType: RecordType;
  /** Sequence number within the file (5 characters, right-justified) */
  sequenceNumber: string;
  /** Generates the fixed-width text representation of this record */
  toFixedWidth(): string;
}

/**
 * Record A - Employer Identification and Establishment Information
 * Required as first record in each EFW2 submission
 */
export interface EmployerRecord extends EFW2Record {
  recordType: RecordType.EMPLOYER;

  /** Employer Identification Number (EIN) - 9 characters */
  ein: string;
  /** Employer name - 57 characters */
  employerName: string;
  /** Employer mailing address line 1 - 22 characters */
  addressLine1: string;
  /** Employer mailing address line 2 - 22 characters */
  addressLine2: string;
  /** City - 22 characters */
  city: string;
  /** State abbreviation - 2 characters */
  state: string;
  /** ZIP code - 5 characters */
  zipCode: string;
  /** ZIP extension - 4 characters */
  zipExtension: string;
  /** Employer foreign postal code - 15 characters (if foreign address) */
  foreignPostalCode?: string;
  /** Employer foreign province/state - 15 characters (if foreign address) */
  foreignProvince?: string;
  /** Employer foreign country code - 2 characters (if foreign address) */
  foreignCountryCode?: string;
  /** Kind of employer - 1 character */
  kindOfEmployer: string;
  /** Kind of payer - 1 character */
  kindOfPayer: string;
  /** Third party sick pay indicator - 1 character */
  thirdPartySickPay?: string;
  /** Establishment number - 4 characters */
  establishmentNumber?: string;
}

/**
 * Record S - Special Tax and Reporting Information
 * Optional record for special reporting situations
 */
export interface SpecialTaxRecord extends EFW2Record {
  recordType: RecordType.SPECIAL_TAX;

  /** Employer EIN - 9 characters */
  ein: string;
  /** Special tax indicator - 1 character */
  specialTaxIndicator: string;
  /** Special tax amount - 12 characters (decimal implied) */
  specialTaxAmount?: string;
  /** Special tax description - 30 characters */
  specialTaxDescription?: string;
}

/**
 * Record E - Employee Wage and Tax Information
 * Required for each employee
 */
export interface EmployeeWageRecord extends EFW2Record {
  recordType: RecordType.EMPLOYEE_WAGE;

  /** Employee SSN - 9 characters */
  employeeSSN: string;
  /** Employee name (last) - 20 characters */
  employeeLastName: string;
  /** Employee name (first) - 15 characters */
  employeeFirstName: string;
  /** Employee middle initial - 1 character */
  employeeMiddleInitial?: string;
  /** Employee mailing address line 1 - 22 characters */
  addressLine1: string;
  /** Employee mailing address line 2 - 22 characters */
  addressLine2?: string;
  /** City - 22 characters */
  city: string;
  /** State abbreviation - 2 characters */
  state: string;
  /** ZIP code - 5 characters */
  zipCode: string;
  /** ZIP extension - 4 characters */
  zipExtension?: string;
  /** Wages, tips, other compensation - 11 characters (decimal implied) */
  wages: string;
  /** Federal income tax withheld - 11 characters (decimal implied) */
  federalTaxWithheld: string;
  /** Social security wages - 10 characters (decimal implied) */
  socialSecurityWages: string;
  /** Social security tax withheld - 10 characters (decimal implied) */
  socialSecurityTaxWithheld: string;
  /** Medicare wages and tips - 10 characters (decimal implied) */
  medicareWages: string;
  /** Medicare tax withheld - 10 characters (decimal implied) */
  medicareTaxWithheld: string;
  /** Social security tips - 10 characters (decimal implied) */
  socialSecurityTips?: string;
  /** Allocated tips - 10 characters (decimal implied) */
  allocatedTips?: string;
  /** Dependent care benefits - 12 characters (decimal implied) */
  dependentCareBenefits?: string;
  /** Nonqualified plans - 12 characters (decimal implied) */
  nonqualifiedPlans?: string;
  /** Income in the form of tips - 1 character */
  incomeTipsIndicator?: string;
  /** Deferred compensation - 1 character */
  deferredCompIndicator?: string;
}

/**
 * Record W - Wage Data Detail
 * Additional wage breakdown information
 */
export interface WageDataRecord extends EFW2Record {
  recordType: RecordType.WAGE_DATA;

  /** Employee SSN - 9 characters */
  employeeSSN: string;
  /** Wage type code - 2 characters */
  wageTypeCode: string;
  /** Wage amount - 11 characters (decimal implied) */
  wageAmount: string;
  /** Tax amount - 11 characters (decimal implied) */
  taxAmount?: string;
}

/**
 * Record T - Total Counts and Amounts
 * Required summary record at end of each employer's submission
 */
export interface TotalRecord extends EFW2Record {
  recordType: RecordType.TOTAL;

  /** Employer EIN - 9 characters */
  ein: string;
  /** Establishment number - 4 characters */
  establishmentNumber?: string;
  /** Total number of RE records - 7 characters */
  totalEmployeeRecords: string;
  /** Total wages - 14 characters (decimal implied) */
  totalWages: string;
  /** Total federal income tax withheld - 14 characters (decimal implied) */
  totalFederalTaxWithheld: string;
  /** Total social security wages - 14 characters (decimal implied) */
  totalSocialSecurityWages: string;
  /** Total social security tax withheld - 14 characters (decimal implied) */
  totalSocialSecurityTaxWithheld: string;
  /** Total Medicare wages - 14 characters (decimal implied) */
  totalMedicareWages: string;
  /** Total Medicare tax withheld - 14 characters (decimal implied) */
  totalMedicareTaxWithheld: string;
  /** Record count checksum - 10 characters */
  recordCountChecksum: string;
  /** Financial checksum - 10 characters */
  financialChecksum: string;
}

/**
 * Record U - Update/Correction Information
 * Used for W-2c corrections
 */
export interface UpdateRecord extends EFW2Record {
  recordType: RecordType.UPDATE;

  /** Original SSN - 9 characters */
  originalSSN?: string;
  /** Original EIN - 9 characters */
  originalEIN?: string;
  /** Correction indicator - 1 character */
  correctionIndicator: string;
  /** Update reason code - 2 characters */
  updateReasonCode: string;
}

/**
 * Record F - Final Record
 * File footer with total record counts
 */
export interface FinalRecord extends EFW2Record {
  recordType: RecordType.FINAL;

  /** Total number of RA records in file - 7 characters */
  totalEmployerRecords: string;
  /** Total number of RE records in file - 7 characters */
  totalEmployeeRecords: string;
  /** Total number of RS records in file - 7 characters */
  totalSpecialTaxRecords: string;
  /** Total number of RW records in file - 7 characters */
  totalWageRecords: string;
  /** Total number of RT records in file - 7 characters */
  totalRecords: string;
  /** Total records in file - 7 characters */
  totalAllRecords: string;
  /** File checksum - 10 characters */
  fileChecksum: string;
}

/**
 * Complete EFW2 file structure
 */
export interface EFW2File {
  /** File header record */
  header: string;
  /** All employer records */
  employerRecords: EmployerRecord[];
  /** All employee wage records */
  employeeRecords: EmployeeWageRecord[];
  /** All special tax records */
  specialTaxRecords?: SpecialTaxRecord[];
  /** All wage data records */
  wageDataRecords?: WageDataRecord[];
  /** Total records by employer */
  totalRecords: TotalRecord[];
  /** File footer */
  footer: FinalRecord;
  /** Generates the complete EFW2 file content */
  generate(): string;
  /** Validates record counts and checksums */
  validate(): ValidationResult;
}

/**
 * Validation result for EFW2 file
 */
export interface ValidationResult {
  /** Whether the file is valid */
  isValid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
}
