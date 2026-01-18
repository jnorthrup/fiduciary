/**
 * EFW2 File Assembly
 *
 * Assembles EFW2 records into compliant SSA file format
 */

import type {
  EFW2File,
  EmployerRecord,
  EmployeeWageRecord,
  SpecialTaxRecord,
  WageDataRecord,
  TotalRecord,
  FinalRecord,
  ValidationResult
} from './types';
import { RecordType } from './types';

/**
 * EFW2 File Builder
 * Assembles all record types into a compliant SSA EFW2 file
 */
export class EFW2FileBuilder {
  private employerRecords: EmployerRecord[] = [];
  private employeeRecords: EmployeeWageRecord[] = [];
  private specialTaxRecords: SpecialTaxRecord[] = [];
  private wageDataRecords: WageDataRecord[] = [];
  private totalRecords: TotalRecord[] = [];
  private finalRecord: FinalRecord | null = null;

  /**
   * Add an employer record (RA)
   * Required: At least one employer record per file
   */
  addEmployerRecord(record: EmployerRecord): this {
    this.employerRecords.push(record);
    return this;
  }

  /**
   * Add an employee wage record (RE)
   * Required: At least one employee record per employer
   */
  addEmployeeRecord(record: EmployeeWageRecord): this {
    this.employeeRecords.push(record);
    return this;
  }

  /**
   * Add a special tax record (RS)
   * Optional
   */
  addSpecialTaxRecord(record: SpecialTaxRecord): this {
    this.specialTaxRecords.push(record);
    return this;
  }

  /**
   * Add a wage data record (RW)
   * Optional
   */
  addWageDataRecord(record: WageDataRecord): this {
    this.wageDataRecords.push(record);
    return this;
  }

  /**
   * Add a total record (RT)
   * Required: One total record per employer
   */
  addTotalRecord(record: TotalRecord): this {
    this.totalRecords.push(record);
    return this;
  }

  /**
   * Set the final record (RF)
   * Required: One final record at end of file
   */
  setFinalRecord(record: FinalRecord): this {
    this.finalRecord = record;
    return this;
  }

  /**
   * Generate the complete EFW2 file content
   * @returns EFW2 file content as string
   */
  build(): EFW2File {
    this.validate();

    const file: EFW2File = {
      header: this.generateHeader(),
      employerRecords: this.employerRecords,
      employeeRecords: this.employeeRecords,
      specialTaxRecords: this.specialTaxRecords.length > 0 ? this.specialTaxRecords : undefined,
      wageDataRecords: this.wageDataRecords.length > 0 ? this.wageDataRecords : undefined,
      totalRecords: this.totalRecords,
      footer: this.finalRecord || this.generateFinalRecord(),
      generate: () => this.generateFileContent(file),
      validate: () => this.validateFile(file)
    };

    return file;
  }

  /**
   * Validate file structure before building
   * @throws Error if validation fails
   */
  private validate(): void {
    if (this.employerRecords.length === 0) {
      throw new Error('EFW2 file must contain at least one employer record (RA)');
    }
    if (this.employeeRecords.length === 0) {
      throw new Error('EFW2 file must contain at least one employee wage record (RE)');
    }
    if (this.totalRecords.length === 0) {
      throw new Error('EFW2 file must contain at least one total record (RT)');
    }
  }

  /**
   * Generate file header
   * SSA EFW2 format requires specific file header
   */
  private generateHeader(): string {
    // File header format per SSA spec
    const parts = [
      'FH',                              // 2: File header identifier
      'EFW2',                            // 4: File format
      new Date().getFullYear().toString(), // 4: Tax year
      '',                                // 4: Filler
      '00001',                           // 5: File sequence number
      '',                                // 493: Filler to reach 512 bytes
    ];
    let header = parts.join('');
    header = header.padEnd(512, ' ');
    return header.substring(0, 512);
  }

  /**
   * Generate final record (RF) if not provided
   */
  private generateFinalRecord(): FinalRecord {
    const allRecords = [
      ...this.employerRecords,
      ...this.employeeRecords,
      ...this.specialTaxRecords,
      ...this.wageDataRecords,
      ...this.totalRecords
    ];

    const recordCounts = this.countRecordsByType(allRecords);

    const finalData: Omit<FinalRecord, 'toFixedWidth'> = {
      recordType: RecordType.FINAL,
      sequenceNumber: '99999',
      totalEmployerRecords: this.employerRecords.length.toString().padStart(7, '0'),
      totalEmployeeRecords: this.employeeRecords.length.toString().padStart(7, '0'),
      totalSpecialTaxRecords: this.specialTaxRecords.length.toString().padStart(7, '0'),
      totalWageRecords: this.wageDataRecords.length.toString().padStart(7, '0'),
      totalRecords: allRecords.length.toString().padStart(7, '0'),
      totalAllRecords: (allRecords.length + 2).toString().padStart(7, '0'),
      fileChecksum: this.calculateFileChecksum(allRecords)
    };

    return {
      ...finalData,
      toFixedWidth: () => this.generateFinalRecordFixedWidth(finalData)
    } as FinalRecord;
  }

  /**
   * Count records by type
   */
  private countRecordsByType(records: any[]): Record<string, number> {
    return records.reduce((acc, record) => {
      const type = record.recordType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Calculate file checksum
   * Simple checksum for validation (production would use SSA algorithm)
   */
  private calculateFileChecksum(records: any[]): string {
    const recordCount = records.length.toString();
    let sum = 0;
    for (const char of recordCount) {
      sum += parseInt(char, 10);
    }
    return (sum % 10).toString().padStart(10, '0');
  }

  /**
   * Generate final record fixed-width format
   */
  private generateFinalRecordFixedWidth(record: Omit<FinalRecord, 'toFixedWidth'>): string {
    const parts = [
      record.recordType,              // 2
      record.sequenceNumber,           // 5
      '',                              // 5
      record.totalEmployerRecords,    // 7
      record.totalEmployeeRecords,    // 7
      record.totalSpecialTaxRecords || '0000000', // 7
      record.totalWageRecords || '0000000',       // 7
      record.totalRecords,            // 7
      record.totalAllRecords,         // 7
      record.fileChecksum,            // 10
      '',                              // 454 filler to 512
    ];
    let recordStr = parts.join('');
    recordStr = recordStr.padEnd(512, ' ');
    return recordStr.substring(0, 512);
  }

  /**
   * Generate complete file content
   */
  private generateFileContent(file: EFW2File): string {
    const lines: string[] = [];

    // Add header
    lines.push(file.header);

    // Add employer records
    for (const record of file.employerRecords) {
      lines.push(record.toFixedWidth());
    }

    // Add employee records
    for (const record of file.employeeRecords) {
      lines.push(record.toFixedWidth());
    }

    // Add special tax records
    if (file.specialTaxRecords) {
      for (const record of file.specialTaxRecords) {
        lines.push(record.toFixedWidth());
      }
    }

    // Add wage data records
    if (file.wageDataRecords) {
      for (const record of file.wageDataRecords) {
        lines.push(record.toFixedWidth());
      }
    }

    // Add total records
    for (const record of file.totalRecords) {
      lines.push(record.toFixedWidth());
    }

    // Add final record
    lines.push(file.footer.toFixedWidth());

    return lines.join('\n');
  }

  /**
   * Validate the complete file
   */
  private validateFile(file: EFW2File): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check record counts
    if (file.employerRecords.length === 0) {
      errors.push('No employer records found');
    }
    if (file.employeeRecords.length === 0) {
      errors.push('No employee wage records found');
    }
    if (file.totalRecords.length === 0) {
      errors.push('No total records found');
    }

    // Check that total records match employee counts
    for (const total of file.totalRecords) {
      const employeeCount = parseInt(total.totalEmployeeRecords, 10);
      if (employeeCount !== file.employeeRecords.length) {
        warnings.push(`Total record employee count (${employeeCount}) does not match actual employee records (${file.employeeRecords.length})`);
      }
    }

    // Validate record sequence numbers
    let expectedSeq = 1;
    for (const record of [...file.employerRecords, ...file.employeeRecords]) {
      const seq = parseInt(record.sequenceNumber, 10);
      if (seq !== expectedSeq) {
        warnings.push(`Record sequence number mismatch: expected ${expectedSeq}, found ${seq}`);
      }
      expectedSeq++;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Create a new EFW2FileBuilder
 */
export function createEFW2File(): EFW2FileBuilder {
  return new EFW2FileBuilder();
}
