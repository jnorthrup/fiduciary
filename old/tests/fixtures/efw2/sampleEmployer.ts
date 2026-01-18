/**
 * Sample Employer Data for EFW2 Test Fixtures
 *
 * Mock employer information following SSA EFW2 specifications
 */

import { createEmployerRecord } from '../../../lib/efw2/records';
import type { EmployerRecord } from '../../../lib/efw2/types';

/**
 * Sample employer record for testing
 * Uses realistic but fictitious data
 */
export const sampleEmployer: EmployerRecord = createEmployerRecord()
  .withEin('123456789')
  .withEmployerName('ACME CORPORATION INC')
  .withAddressLine1('123 BUSINESS PARKWAY')
  .withAddressLine2('SUITE 100')
  .withCity('NEW YORK')
  .withState('NY')
  .withZipCode('10001')
  .withZipExtension('1234')
  .withKindOfEmployer('A') // Federal government
  .withKindOfPayer('A') // Third-party sick pay
  .withEstablishmentNumber('0001')
  .withSequenceNumber('00001')
  .build();

/**
 * Sample employer record with foreign address
 */
export const sampleForeignEmployer: EmployerRecord = createEmployerRecord()
  .withEin('987654321')
  .withEmployerName('GLOBAL VENTURES LTD')
  .withAddressLine1('789 INTERNATIONAL PLAZA')
  .withCity('LONDON')
  .withForeignAddress('SW1A 1AA', 'ENGLAND', 'UK')
  .withKindOfEmployer('B') // State government
  .withKindOfPayer('B') // Section 457
  .withEstablishmentNumber('0002')
  .withSequenceNumber('00001')
  .build();

/**
 * Sample small business employer
 */
export const sampleSmallBusinessEmployer: EmployerRecord = createEmployerRecord()
  .withEin('111223333')
  .withEmployerName('SMALL BUSINESS CO')
  .withAddressLine1('456 MAIN STREET')
  .withCity('AUSTIN')
  .withState('TX')
  .withZipCode('78701')
  .withKindOfEmployer('C') // Tax-exempt organization
  .withKindOfPayer('C') // Direct sale
  .withEstablishmentNumber('0001')
  .withSequenceNumber('00001')
  .build();

export const sampleEmployers = {
  acme: sampleEmployer,
  global: sampleForeignEmployer,
  smallBusiness: sampleSmallBusinessEmployer
};
