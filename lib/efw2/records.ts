/**
 * EFW2 Record Builders
 *
 * Builder classes and functions for creating SSA EFW2 format records
 */

import {
  EmployerRecord,
  RecordType,
  type EmployeeWageRecord,
  type SpecialTaxRecord,
  type WageDataRecord,
  type TotalRecord
} from './types';

/**
 * RA - Employer Record Builder
 * Builds Record A (Employer Identification and Establishment Information)
 */
export class EmployerRecordBuilder {
  private record: Partial<EmployerRecord> = {
    recordType: RecordType.EMPLOYER,
    sequenceNumber: '00001'
  };

  /** Set Employer Identification Number (9 digits) */
  withEin(ein: string): this {
    this.record.ein = ein.replace(/[^0-9]/g, '').padStart(9, '0');
    return this;
  }

  /** Set employer name (max 57 chars) */
  withEmployerName(name: string): this {
    this.record.employerName = name.substring(0, 57).padEnd(57, ' ');
    return this;
  }

  /** Set address line 1 (max 22 chars) */
  withAddressLine1(address: string): this {
    this.record.addressLine1 = address.substring(0, 22).padEnd(22, ' ');
    return this;
  }

  /** Set address line 2 (max 22 chars) */
  withAddressLine2(address: string): this {
    this.record.addressLine2 = address.substring(0, 22).padEnd(22, ' ');
    return this;
  }

  /** Set city (max 22 chars) */
  withCity(city: string): this {
    this.record.city = city.substring(0, 22).padEnd(22, ' ');
    return this;
  }

  /** Set state abbreviation (2 chars) */
  withState(state: string): this {
    this.record.state = state.substring(0, 2).toUpperCase().padEnd(2, ' ');
    return this;
  }

  /** Set ZIP code (5 digits) */
  withZipCode(zip: string): this {
    this.record.zipCode = zip.replace(/[^0-9]/g, '').padStart(5, '0');
    return this;
  }

  /** Set ZIP extension (4 digits) */
  withZipExtension(extension: string): this {
    this.record.zipExtension = extension.replace(/[^0-9]/g, '').padStart(4, '0');
    return this;
  }

  /** Set foreign address information */
  withForeignAddress(
    postalCode: string,
    province: string,
    countryCode: string
  ): this {
    this.record.foreignPostalCode = postalCode.substring(0, 15).padEnd(15, ' ');
    this.record.foreignProvince = province.substring(0, 15).padEnd(15, ' ');
    this.record.foreignCountryCode = countryCode.substring(0, 2).toUpperCase();
    return this;
  }

  /** Set kind of employer (1 char) */
  withKindOfEmployer(kind: string): this {
    const validKinds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    this.record.kindOfEmployer = validKinds.includes(kind.toUpperCase()) ? kind.toUpperCase() : 'A';
    return this;
  }

  /** Set kind of payer (1 char) */
  withKindOfPayer(kind: string): this {
    const validKinds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    this.record.kindOfPayer = validKinds.includes(kind.toUpperCase()) ? kind.toUpperCase() : 'A';
    return this;
  }

  /** Set third party sick pay indicator */
  withThirdPartySickPay(indicator: string): this {
    this.record.thirdPartySickPay = indicator.substring(0, 1);
    return this;
  }

  /** Set establishment number (4 digits) */
  withEstablishmentNumber(number: string): this {
    this.record.establishmentNumber = number.replace(/[^0-9]/g, '').padStart(4, '0');
    return this;
  }

  /** Set sequence number */
  withSequenceNumber(seq: string): this {
    this.record.sequenceNumber = seq.replace(/[^0-9]/g, '').padStart(5, '0');
    return this;
  }

  /**
   * Build the employer record
   * @throws Error if required fields are missing
   */
  build(): EmployerRecord {
    // Validate required fields
    const required = ['ein', 'employerName', 'addressLine1', 'city', 'state', 'zipCode', 'kindOfEmployer', 'kindOfPayer'] as const;
    for (const field of required) {
      if (!this.record[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return {
      ...this.record,
      recordType: RecordType.EMPLOYER,
      sequenceNumber: this.record.sequenceNumber || '00001',
      ein: this.record.ein!,
      employerName: this.record.employerName!,
      addressLine1: this.record.addressLine1!,
      addressLine2: this.record.addressLine2 || '',
      city: this.record.city!,
      state: this.record.state!,
      zipCode: this.record.zipCode!,
      zipExtension: this.record.zipExtension || '0000',
      foreignPostalCode: this.record.foreignPostalCode,
      foreignProvince: this.record.foreignProvince,
      foreignCountryCode: this.record.foreignCountryCode,
      kindOfEmployer: this.record.kindOfEmployer!,
      kindOfPayer: this.record.kindOfPayer!,
      thirdPartySickPay: this.record.thirdPartySickPay || ' ',
      establishmentNumber: this.record.establishmentNumber || '0000',
      toFixedWidth: () => this.toFixedWidth(this.record as EmployerRecord)
    } as EmployerRecord;
  }

  /**
   * Generate fixed-width format string (512 bytes)
   * EFW2 format specification: All records are exactly 512 bytes
   */
  private toFixedWidth(record: EmployerRecord): string {
    const parts = [
      record.recordType,                    // 2: Record type
      record.sequenceNumber,                 // 5: Sequence number
      '',                                    // 5: Filler
      record.ein,                            // 9: EIN
      '',                                    // 3: Filler
      record.employerName,                   // 57: Employer name
      '',                                    // 5: Filler
      record.addressLine1,                   // 22: Address line 1
      record.addressLine2 || '',             // 22: Address line 2
      record.city,                           // 22: City
      record.state,                          // 2: State
      record.zipCode,                        // 5: ZIP code
      record.zipExtension || '0000',         // 4: ZIP extension
      record.foreignPostalCode || '',        // 15: Foreign postal code
      record.foreignProvince || '',          // 15: Foreign province
      record.foreignCountryCode || '',       // 2: Foreign country code
      '',                                    // 7: Filler
      record.kindOfEmployer,                 // 1: Kind of employer
      record.kindOfPayer,                    // 1: Kind of payer
      record.thirdPartySickPay || ' ',       // 1: Third party sick pay
      record.establishmentNumber || '0000',  // 4: Establishment number
      '',                                    // 314: Filler to reach 512 bytes
    ];

    // Join all parts and pad/fill to exactly 512 bytes
    let recordStr = parts.join('');
    recordStr = recordStr.padEnd(512, ' ');
    return recordStr.substring(0, 512);
  }
}

/**
 * Create a new EmployerRecordBuilder
 */
export function createEmployerRecord(): EmployerRecordBuilder {
  return new EmployerRecordBuilder();
}

/**
 * RE - Employee Wage Record Builder
 * Builds Record E (Employee Wage and Tax Information)
 */
export class EmployeeWageRecordBuilder {
  private record: Partial<EmployeeWageRecord> = {
    recordType: RecordType.EMPLOYEE_WAGE,
    sequenceNumber: '00001'
  };

  /** Set Employee SSN (9 digits) */
  withSSN(ssn: string): this {
    this.record.employeeSSN = ssn.replace(/[^0-9]/g, '').padStart(9, '0');
    return this;
  }

  /** Set employee last name (max 20 chars) */
  withLastName(name: string): this {
    this.record.employeeLastName = name.substring(0, 20).padEnd(20, ' ');
    return this;
  }

  /** Set employee first name (max 15 chars) */
  withFirstName(name: string): this {
    this.record.employeeFirstName = name.substring(0, 15).padEnd(15, ' ');
    return this;
  }

  /** Set employee middle initial (1 char) */
  withMiddleInitial(initial: string): this {
    this.record.employeeMiddleInitial = initial.substring(0, 1).toUpperCase();
    return this;
  }

  /** Set address line 1 (max 22 chars) */
  withAddressLine1(address: string): this {
    this.record.addressLine1 = address.substring(0, 22).padEnd(22, ' ');
    return this;
  }

  /** Set address line 2 (max 22 chars) */
  withAddressLine2(address: string): this {
    this.record.addressLine2 = address.substring(0, 22).padEnd(22, ' ');
    return this;
  }

  /** Set city (max 22 chars) */
  withCity(city: string): this {
    this.record.city = city.substring(0, 22).padEnd(22, ' ');
    return this;
  }

  /** Set state abbreviation (2 chars) */
  withState(state: string): this {
    this.record.state = state.substring(0, 2).toUpperCase().padEnd(2, ' ');
    return this;
  }

  /** Set ZIP code (5 digits) */
  withZipCode(zip: string): this {
    this.record.zipCode = zip.replace(/[^0-9]/g, '').padStart(5, '0');
    return this;
  }

  /** Set ZIP extension (4 digits) */
  withZipExtension(extension: string): this {
    this.record.zipExtension = extension.replace(/[^0-9]/g, '').padStart(4, '0');
    return this;
  }

  /**
   * Set wages, tips, other compensation (decimal implied)
   * Format: 11 characters, cents in last 2 positions
   */
  withWages(amount: number): this {
    this.record.wages = this.formatAmount(amount, 11);
    return this;
  }

  /** Set federal income tax withheld (decimal implied) */
  withFederalTaxWithheld(amount: number): this {
    this.record.federalTaxWithheld = this.formatAmount(amount, 11);
    return this;
  }

  /** Set social security wages (decimal implied) */
  withSocialSecurityWages(amount: number): this {
    this.record.socialSecurityWages = this.formatAmount(amount, 10);
    return this;
  }

  /** Set social security tax withheld (decimal implied) */
  withSocialSecurityTaxWithheld(amount: number): this {
    this.record.socialSecurityTaxWithheld = this.formatAmount(amount, 10);
    return this;
  }

  /** Set Medicare wages and tips (decimal implied) */
  withMedicareWages(amount: number): this {
    this.record.medicareWages = this.formatAmount(amount, 10);
    return this;
  }

  /** Set Medicare tax withheld (decimal implied) */
  withMedicareTaxWithheld(amount: number): this {
    this.record.medicareTaxWithheld = this.formatAmount(amount, 10);
    return this;
  }

  /** Set social security tips (decimal implied) */
  withSocialSecurityTips(amount: number): this {
    this.record.socialSecurityTips = this.formatAmount(amount, 10);
    return this;
  }

  /** Set allocated tips (decimal implied) */
  withAllocatedTips(amount: number): this {
    this.record.allocatedTips = this.formatAmount(amount, 10);
    return this;
  }

  /** Set dependent care benefits (decimal implied) */
  withDependentCareBenefits(amount: number): this {
    this.record.dependentCareBenefits = this.formatAmount(amount, 12);
    return this;
  }

  /** Set nonqualified plans (decimal implied) */
  withNonqualifiedPlans(amount: number): this {
    this.record.nonqualifiedPlans = this.formatAmount(amount, 12);
    return this;
  }

  /** Set income in the form of tips indicator */
  withIncomeTipsIndicator(indicator: string): this {
    this.record.incomeTipsIndicator = indicator.substring(0, 1);
    return this;
  }

  /** Set deferred compensation indicator */
  withDeferredCompIndicator(indicator: string): this {
    this.record.deferredCompIndicator = indicator.substring(0, 1);
    return this;
  }

  /** Set sequence number */
  withSequenceNumber(seq: string): this {
    this.record.sequenceNumber = seq.replace(/[^0-9]/g, '').padStart(5, '0');
    return this;
  }

  /**
   * Format amount to fixed-width decimal-implied format
   * Cents are stored in last 2 positions
   */
  private formatAmount(amount: number, width: number): string {
    const cents = Math.round(amount * 100);
    return cents.toString().padStart(width, '0');
  }

  /**
   * Build the employee wage record
   * @throws Error if required fields are missing
   */
  build(): EmployeeWageRecord {
    const required = ['employeeSSN', 'employeeLastName', 'employeeFirstName', 'addressLine1', 'city', 'state', 'zipCode', 'wages', 'federalTaxWithheld', 'socialSecurityWages', 'socialSecurityTaxWithheld', 'medicareWages', 'medicareTaxWithheld'] as const;
    for (const field of required) {
      if (!this.record[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return {
      ...this.record,
      recordType: RecordType.EMPLOYEE_WAGE,
      sequenceNumber: this.record.sequenceNumber || '00001',
      employeeSSN: this.record.employeeSSN!,
      employeeLastName: this.record.employeeLastName!,
      employeeFirstName: this.record.employeeFirstName!,
      employeeMiddleInitial: this.record.employeeMiddleInitial || ' ',
      addressLine1: this.record.addressLine1!,
      addressLine2: this.record.addressLine2 || '',
      city: this.record.city!,
      state: this.record.state!,
      zipCode: this.record.zipCode!,
      zipExtension: this.record.zipExtension || '0000',
      wages: this.record.wages!,
      federalTaxWithheld: this.record.federalTaxWithheld!,
      socialSecurityWages: this.record.socialSecurityWages!,
      socialSecurityTaxWithheld: this.record.socialSecurityTaxWithheld!,
      medicareWages: this.record.medicareWages!,
      medicareTaxWithheld: this.record.medicareTaxWithheld!,
      socialSecurityTips: this.record.socialSecurityTips || '0000000000',
      allocatedTips: this.record.allocatedTips || '0000000000',
      dependentCareBenefits: this.record.dependentCareBenefits || '000000000000',
      nonqualifiedPlans: this.record.nonqualifiedPlans || '000000000000',
      incomeTipsIndicator: this.record.incomeTipsIndicator || ' ',
      deferredCompIndicator: this.record.deferredCompIndicator || ' ',
      toFixedWidth: () => this.toFixedWidth(this.record as EmployeeWageRecord)
    } as EmployeeWageRecord;
  }

  /**
   * Generate fixed-width format string (512 bytes)
   */
  private toFixedWidth(record: EmployeeWageRecord): string {
    const parts = [
      record.recordType,                       // 2: Record type
      record.sequenceNumber,                    // 5: Sequence number
      '',                                       // 5: Filler
      record.employeeSSN,                       // 9: SSN
      record.employeeLastName,                  // 20: Last name
      record.employeeFirstName,                 // 15: First name
      record.employeeMiddleInitial || ' ',      // 1: Middle initial
      '',                                       // 1: Filler
      record.addressLine1,                      // 22: Address line 1
      record.addressLine2 || '',                // 22: Address line 2
      record.city,                              // 22: City
      record.state,                             // 2: State
      record.zipCode,                           // 5: ZIP code
      record.zipExtension || '0000',            // 4: ZIP extension
      '',                                       // 2: Filler
      record.wages,                             // 11: Wages
      record.federalTaxWithheld,                // 11: Federal tax withheld
      '',                                       // 2: Filler
      record.socialSecurityWages,               // 10: SS wages
      record.socialSecurityTaxWithheld,         // 10: SS tax withheld
      record.medicareWages,                     // 10: Medicare wages
      record.medicareTaxWithheld,               // 10: Medicare tax withheld
      record.socialSecurityTips || '0000000000', // 10: SS tips
      record.allocatedTips || '0000000000',     // 10: Allocated tips
      '',                                       // 2: Filler
      record.dependentCareBenefits || '000000000000', // 12: Dependent care
      record.nonqualifiedPlans || '000000000000',     // 12: Nonqualified plans
      '',                                       // 268: Filler
      record.incomeTipsIndicator || ' ',        // 1: Income tips indicator
      record.deferredCompIndicator || ' ',      // 1: Deferred comp indicator
      '',                                       // 8: Filler to reach 512 bytes
    ];

    let recordStr = parts.join('');
    recordStr = recordStr.padEnd(512, ' ');
    return recordStr.substring(0, 512);
  }
}

/**
 * Create a new EmployeeWageRecordBuilder
 */
export function createEmployeeWageRecord(): EmployeeWageRecordBuilder {
  return new EmployeeWageRecordBuilder();
}

/**
 * RS - Special Tax Record Builder
 * Builds Record S (Special Tax and Reporting Information)
 */
export class SpecialTaxRecordBuilder {
  private record: Partial<SpecialTaxRecord> = {
    recordType: RecordType.SPECIAL_TAX,
    sequenceNumber: '00001'
  };

  /** Set Employer EIN (9 digits) */
  withEin(ein: string): this {
    this.record.ein = ein.replace(/[^0-9]/g, '').padStart(9, '0');
    return this;
  }

  /** Set special tax indicator (1 char) */
  withSpecialTaxIndicator(indicator: string): this {
    this.record.specialTaxIndicator = indicator.substring(0, 1);
    return this;
  }

  /** Set special tax amount (decimal implied) */
  withSpecialTaxAmount(amount: number): this {
    const cents = Math.round(amount * 100);
    this.record.specialTaxAmount = cents.toString().padStart(12, '0');
    return this;
  }

  /** Set special tax description (max 30 chars) */
  withSpecialTaxDescription(description: string): this {
    this.record.specialTaxDescription = description.substring(0, 30).padEnd(30, ' ');
    return this;
  }

  /** Set sequence number */
  withSequenceNumber(seq: string): this {
    this.record.sequenceNumber = seq.replace(/[^0-9]/g, '').padStart(5, '0');
    return this;
  }

  build(): SpecialTaxRecord {
    if (!this.record.ein || !this.record.specialTaxIndicator) {
      throw new Error('Missing required fields: ein, specialTaxIndicator');
    }

    return {
      ...this.record,
      recordType: RecordType.SPECIAL_TAX,
      sequenceNumber: this.record.sequenceNumber || '00001',
      ein: this.record.ein!,
      specialTaxIndicator: this.record.specialTaxIndicator!,
      specialTaxAmount: this.record.specialTaxAmount || '000000000000',
      specialTaxDescription: this.record.specialTaxDescription || '',
      toFixedWidth: () => this.toFixedWidth(this.record as SpecialTaxRecord)
    } as SpecialTaxRecord;
  }

  private toFixedWidth(record: SpecialTaxRecord): string {
    const parts = [
      record.recordType,                      // 2
      record.sequenceNumber,                   // 5
      '',                                       // 5
      record.ein,                              // 9
      '',                                       // 3
      record.specialTaxIndicator,              // 1
      '',                                       // 1
      record.specialTaxAmount || '000000000000', // 12
      record.specialTaxDescription || '',      // 30
      '',                                       // 434 filler to 512
    ];
    let recordStr = parts.join('');
    recordStr = recordStr.padEnd(512, ' ');
    return recordStr.substring(0, 512);
  }
}

export function createSpecialTaxRecord(): SpecialTaxRecordBuilder {
  return new SpecialTaxRecordBuilder();
}

/**
 * RT - Total Record Builder
 * Builds Record T (Total Counts and Amounts)
 */
export class TotalRecordBuilder {
  private record: Partial<TotalRecord> = {
    recordType: RecordType.TOTAL,
    sequenceNumber: '00001'
  };

  withEin(ein: string): this {
    this.record.ein = ein.replace(/[^0-9]/g, '').padStart(9, '0');
    return this;
  }

  withEstablishmentNumber(number: string): this {
    this.record.establishmentNumber = number.replace(/[^0-9]/g, '').padStart(4, '0');
    return this;
  }

  withTotalEmployeeRecords(count: number): this {
    this.record.totalEmployeeRecords = count.toString().padStart(7, '0');
    return this;
  }

  withTotalWages(amount: number): this {
    this.record.totalWages = this.formatAmount(amount, 14);
    return this;
  }

  withTotalFederalTaxWithheld(amount: number): this {
    this.record.totalFederalTaxWithheld = this.formatAmount(amount, 14);
    return this;
  }

  withTotalSocialSecurityWages(amount: number): this {
    this.record.totalSocialSecurityWages = this.formatAmount(amount, 14);
    return this;
  }

  withTotalSocialSecurityTaxWithheld(amount: number): this {
    this.record.totalSocialSecurityTaxWithheld = this.formatAmount(amount, 14);
    return this;
  }

  withTotalMedicareWages(amount: number): this {
    this.record.totalMedicareWages = this.formatAmount(amount, 14);
    return this;
  }

  withTotalMedicareTaxWithheld(amount: number): this {
    this.record.totalMedicareTaxWithheld = this.formatAmount(amount, 14);
    return this;
  }

  withSequenceNumber(seq: string): this {
    this.record.sequenceNumber = seq.replace(/[^0-9]/g, '').padStart(5, '0');
    return this;
  }

  private formatAmount(amount: number, width: number): string {
    const cents = Math.round(amount * 100);
    return cents.toString().padStart(width, '0');
  }

  build(): TotalRecord {
    if (!this.record.ein || !this.record.totalEmployeeRecords) {
      throw new Error('Missing required fields: ein, totalEmployeeRecords');
    }

    const checksum = this.calculateChecksum();

    return {
      ...this.record,
      recordType: RecordType.TOTAL,
      sequenceNumber: this.record.sequenceNumber || '00001',
      ein: this.record.ein!,
      establishmentNumber: this.record.establishmentNumber || '0000',
      totalEmployeeRecords: this.record.totalEmployeeRecords!,
      totalWages: this.record.totalWages || '00000000000000',
      totalFederalTaxWithheld: this.record.totalFederalTaxWithheld || '00000000000000',
      totalSocialSecurityWages: this.record.totalSocialSecurityWages || '00000000000000',
      totalSocialSecurityTaxWithheld: this.record.totalSocialSecurityTaxWithheld || '00000000000000',
      totalMedicareWages: this.record.totalMedicareWages || '00000000000000',
      totalMedicareTaxWithheld: this.record.totalMedicareTaxWithheld || '00000000000000',
      recordCountChecksum: checksum.recordCount,
      financialChecksum: checksum.financial,
      toFixedWidth: () => this.toFixedWidth(this.record as TotalRecord)
    } as TotalRecord;
  }

  private calculateChecksum(): { recordCount: string; financial: string } {
    // Simple checksum calculation per SSA spec
    // In production, this would use the official SSA algorithm
    const recordCount = this.record.totalEmployeeRecords || '0';
    const recordCountChecksum = recordCount.split('').reduce((acc, c) => acc + parseInt(c), 0) % 10;

    const totalWages = parseInt(this.record.totalWages || '0');
    const financialChecksum = totalWages % 10;

    return {
      recordCount: recordCountChecksum.toString().padStart(10, '0'),
      financial: financialChecksum.toString().padStart(10, '0')
    };
  }

  private toFixedWidth(record: TotalRecord): string {
    const parts = [
      record.recordType,                         // 2
      record.sequenceNumber,                      // 5
      '',                                         // 5
      record.ein,                                 // 9
      '',                                         // 3
      record.establishmentNumber || '0000',       // 4
      record.totalEmployeeRecords,                // 7
      record.totalWages,                          // 14
      record.totalFederalTaxWithheld,             // 14
      record.totalSocialSecurityWages,            // 14
      record.totalSocialSecurityTaxWithheld,      // 14
      record.totalMedicareWages,                  // 14
      record.totalMedicareTaxWithheld,            // 14
      record.recordCountChecksum,                 // 10
      record.financialChecksum,                   // 10
      '',                                         // 377 filler to 512
    ];
    let recordStr = parts.join('');
    recordStr = recordStr.padEnd(512, ' ');
    return recordStr.substring(0, 512);
  }
}

export function createTotalRecord(): TotalRecordBuilder {
  return new TotalRecordBuilder();
}

/**
 * RW - Wage Data Record Builder
 */
export class WageDataRecordBuilder {
  private record: Partial<WageDataRecord> = {
    recordType: RecordType.WAGE_DATA,
    sequenceNumber: '00001'
  };

  withEmployeeSSN(ssn: string): this {
    this.record.employeeSSN = ssn.replace(/[^0-9]/g, '').padStart(9, '0');
    return this;
  }

  withWageTypeCode(code: string): this {
    this.record.wageTypeCode = code.substring(0, 2).toUpperCase();
    return this;
  }

  withWageAmount(amount: number): this {
    const cents = Math.round(amount * 100);
    this.record.wageAmount = cents.toString().padStart(11, '0');
    return this;
  }

  withTaxAmount(amount: number): this {
    const cents = Math.round(amount * 100);
    this.record.taxAmount = cents.toString().padStart(11, '0');
    return this;
  }

  withSequenceNumber(seq: string): this {
    this.record.sequenceNumber = seq.replace(/[^0-9]/g, '').padStart(5, '0');
    return this;
  }

  build(): WageDataRecord {
    if (!this.record.employeeSSN || !this.record.wageTypeCode || !this.record.wageAmount) {
      throw new Error('Missing required fields: employeeSSN, wageTypeCode, wageAmount');
    }

    return {
      ...this.record,
      recordType: RecordType.WAGE_DATA,
      sequenceNumber: this.record.sequenceNumber || '00001',
      employeeSSN: this.record.employeeSSN!,
      wageTypeCode: this.record.wageTypeCode!,
      wageAmount: this.record.wageAmount!,
      taxAmount: this.record.taxAmount || '00000000000',
      toFixedWidth: () => this.toFixedWidth(this.record as WageDataRecord)
    } as WageDataRecord;
  }

  private toFixedWidth(record: WageDataRecord): string {
    const parts = [
      record.recordType,          // 2
      record.sequenceNumber,       // 5
      '',                          // 5
      record.employeeSSN,          // 9
      '',                          // 3
      record.wageTypeCode,         // 2
      '',                          // 2
      record.wageAmount,           // 11
      record.taxAmount || '00000000000', // 11
      '',                          // 462 filler to 512
    ];
    let recordStr = parts.join('');
    recordStr = recordStr.padEnd(512, ' ');
    return recordStr.substring(0, 512);
  }
}

export function createWageDataRecord(): WageDataRecordBuilder {
  return new WageDataRecordBuilder();
}
