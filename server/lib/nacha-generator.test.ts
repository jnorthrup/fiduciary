import { describe, it, expect } from 'vitest';
import {
  padRight,
  padLeft,
  generateFileHeader,
  generateBatchHeader,
  generateEntryDetail,
  generateBatchControl,
  generateFileControl,
  generateNachaFile
} from './nacha-generator.js';

describe('nacha-generator', () => {
  describe('padRight', () => {
    it('pads string with spaces to fixed length', () => {
      expect(padRight('test', 10)).toBe('test      ');
      expect(padRight('longstring', 5)).toBe('longs');
      expect(padRight('', 3)).toBe('   ');
    });
  });

  describe('padLeft', () => {
    it('pads number with zeros to fixed length', () => {
      expect(padLeft(42, 5)).toBe('00042');
      expect(padLeft(123, 2)).toBe('23');
      expect(padLeft(0, 3)).toBe('000');
      expect(padLeft('001', 5)).toBe('00001');
    });
  });

  describe('generateFileHeader', () => {
    it('generates valid 94-char File Header Record (Type 1)', () => {
      const config = {
        immediateDestination: '041000014',
        immediateOrigin: '121000358',
        fileDate: '260122',
        fileTime: '1230',
        immediateDestinationName: 'RECEIVING BANK',
        immediateOriginName: 'GUBERT TRUST'
      };

      const result = generateFileHeader(config);
      expect(result).toHaveLength(94);
      expect(result[0]).toBe('1');
      expect(result.substring(1, 3)).toBe('01');
      expect(result.substring(34, 37)).toBe('094');
      expect(result.substring(37, 39)).toBe('10');
    });
  });

  describe('generateBatchHeader', () => {
    it('generates valid 94-char Batch Header Record (Type 5)', () => {
      const config = {
        companyName: 'GUBERT TRUST',
        companyId: '1234567890',
        secCode: 'PPD',
        companyEntryDescription: 'UTILITY PMT',
        fileDate: '260122',
        effectiveDate: '260123',
        odfiRouting: '121000358'
      };

      const result = generateBatchHeader(config, 1);
      expect(result).toHaveLength(94);
      expect(result[0]).toBe('5');
      expect(result.substring(1, 4)).toBe('200');
      expect(result.substring(50, 53)).toBe('PPD');
    });
  });

  describe('generateEntryDetail', () => {
    it('generates valid 94-char Entry Detail Record (Type 6)', () => {
      const entry = {
        transactionCode: '22',
        rdfiRouting: '041000014',
        dfiAccount: '9200549316464',
        amount: 41178,
        individualId: '200046283809',
        individualName: 'DTE ENERGY'
      };
      const config = {
        odfiRouting: '121000358'
      };

      const result = generateEntryDetail(entry, 1, config);
      expect(result).toHaveLength(94);
      expect(result[0]).toBe('6');
      expect(result.substring(1, 3)).toBe('22');
      expect(result.substring(29, 39)).toBe('0000041178');
    });
  });

  describe('generateBatchControl', () => {
    it('generates valid 94-char Batch Control Record (Type 8)', () => {
      const batch = {
        entryCount: 1,
        entryHash: '04100001',
        debitTotal: 0,
        creditTotal: 41178
      };
      const config = {
        companyId: '1234567890',
        odfiRouting: '121000358'
      };

      const result = generateBatchControl(batch, 1, config);
      expect(result).toHaveLength(94);
      expect(result[0]).toBe('8');
      expect(result.substring(1, 4)).toBe('200');
      expect(result.substring(4, 10)).toBe('000001');
    });
  });

  describe('generateFileControl', () => {
    it('generates valid 94-char File Control Record (Type 9)', () => {
      const file = {
        batchCount: 1,
        blockCount: 1,
        entryCount: 1,
        entryHash: '04100001',
        debitTotal: 0,
        creditTotal: 41178
      };

      const result = generateFileControl(file);
      expect(result).toHaveLength(94);
      expect(result[0]).toBe('9');
      expect(result.substring(1, 7)).toBe('000001');
      expect(result.substring(7, 13)).toBe('000001');
    });
  });

  describe('generateNachaFile', () => {
    it('generates complete NACHA file with CRLF line endings', () => {
      const config = {
        immediateDestination: '041000014',
        immediateDestinationName: 'RECEIVING BANK',
        immediateOrigin: '121000358',
        immediateOriginName: 'GUBERT TRUST',
        fileDate: '260122',
        fileTime: '1230',
        companyName: 'GUBERT TRUST',
        companyId: '1234567890',
        secCode: 'PPD',
        companyEntryDescription: 'UTILITY PMT',
        effectiveDate: '260123',
        odfiRouting: '121000358'
      };

      const entries = [{
        transactionCode: '22',
        rdfiRouting: '041000014',
        dfiAccount: '9200549316464',
        amount: 41178,
        individualId: '200046283809',
        individualName: 'DTE ENERGY'
      }];

      const result = generateNachaFile(config, entries);

      expect(result).toBeInstanceOf(Buffer);
      const text = result.toString('ascii');

      // Check CRLF line endings
      expect(text).toContain('\r\n');

      // Split and check line lengths (excluding CRLF)
      const lines = text.split('\r\n').filter(l => l.length > 0);
      lines.forEach(line => {
        expect(line).toHaveLength(94);
      });

      // Verify block padding to 10 records
      expect(lines.length).toBe(10);

      // Check record types
      expect(lines[0][0]).toBe('1'); // File Header
      expect(lines[1][0]).toBe('5'); // Batch Header
      expect(lines[2][0]).toBe('6'); // Entry Detail
      expect(lines[3][0]).toBe('8'); // Batch Control
      expect(lines[4][0]).toBe('9'); // File Control
      expect(lines[5]).toMatch(/^9{94}$/); // Padding
    });

    it('calculates entry hash correctly', () => {
      const config = {
        immediateDestination: '041000014',
        immediateDestinationName: 'RECEIVING BANK',
        immediateOrigin: '121000358',
        immediateOriginName: 'GUBERT TRUST',
        fileDate: '260122',
        fileTime: '1230',
        companyName: 'GUBERT TRUST',
        companyId: '1234567890',
        secCode: 'PPD',
        companyEntryDescription: 'UTILITY PMT',
        effectiveDate: '260123',
        odfiRouting: '121000358'
      };

      const entries = [{
        transactionCode: '22',
        rdfiRouting: '041000014',
        dfiAccount: '9200549316464',
        amount: 41178,
        individualId: '200046283809',
        individualName: 'DTE ENERGY'
      }];

      const result = generateNachaFile(config, entries);
      const text = result.toString('ascii');
      const lines = text.split('\r\n').filter(l => l.length > 0);

      // Entry hash should be first 8 digits of RDFI routing (04100001)
      // Left-padded to 10 characters: 0004100001
      const batchControlLine = lines[3];
      expect(batchControlLine.substring(10, 20)).toBe('0004100001');
    });

    it('matches bash script output for test mode DTE payment', () => {
      // Configuration matching scripts/generate-nacha.sh --test
      const config = {
        immediateDestination: '091000019',
        immediateDestinationName: 'RECEIVING BANK',
        immediateOrigin: '091000019',
        immediateOriginName: 'GUBERT TRUST',
        fileDate: '260122',
        fileTime: '2200',
        companyName: 'GUBERT TRUST',
        companyId: '1234567890',
        secCode: 'PPD',
        companyEntryDescription: 'UTILITY PMT',
        effectiveDate: '260123',
        odfiRouting: '091000019'
      };

      const entries = [{
        transactionCode: '22',
        rdfiRouting: '091000019',
        dfiAccount: '9200549316464',
        amount: 41178,
        individualId: '200046283809',
        individualName: 'DTE ENERGY'
      }];

      const result = generateNachaFile(config, entries);
      const text = result.toString('ascii');
      const lines = text.split('\r\n').filter(l => l.length > 0);

      // Expected output matching bash script
      // Record 1: File Header
      expect(lines[0]).toBe('101 09100001900910000192601222200A094101RECEIVING BANK         GUBERT TRUST                   ');

      // Record 2: Batch Header
      expect(lines[1]).toBe('5200GUBERT TRUST                        1234567890PPDUTILITY PM260122260123   1091000010000001');

      // Record 3: Entry Detail
      expect(lines[2]).toBe('6220910000199200549316464    0000041178200046283809   DTE ENERGY              0091000010000001');

      // Record 4: Batch Control
      expect(lines[3]).toBe('820000000100091000010000000000000000000411781234567890                         091000010000001');

      // Record 5: File Control
      expect(lines[4]).toBe('9000001000001000000010009100001000000000000000000041178                                       ');

      // Records 6-10: Padding (all 9s)
      for (let i = 5; i < 10; i++) {
        expect(lines[i]).toMatch(/^9{94}$/);
      }
    });
  });
});
