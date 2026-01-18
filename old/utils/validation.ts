
import { REGEX_EIN, REGEX_SSN } from './constants';

/**
 * Validate TIN format (EIN: XX-XXXXXXX or SSN: XXX-XX-XXXX)
 */
export const isValidTINFormat = (tin: string): boolean => {
    return REGEX_EIN.test(tin) || REGEX_SSN.test(tin);
};

/**
 * Validate EIN format
 */
export const isValidEINFormat = (ein: string): boolean => {
    return REGEX_EIN.test(ein);
};

/**
 * Validate SSN format
 */
export const isValidSSNFormat = (ssn: string): boolean => {
    return REGEX_SSN.test(ssn);
};

/**
 * Determine TIN type from format
 */
export const getTINType = (tin: string): 'EIN' | 'SSN' | null => {
    if (REGEX_EIN.test(tin)) return 'EIN';
    if (REGEX_SSN.test(tin)) return 'SSN';
    return null;
};
