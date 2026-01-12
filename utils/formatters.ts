
import { REGEX_DIGITS_ONLY } from './constants';

/**
 * Format EIN to standard format XX-XXXXXXX
 */
export const formatEIN = (ein: string): string => {
    const cleaned = ein.replace(REGEX_DIGITS_ONLY, '');
    if (cleaned.length !== 9) return ein; // Return as is for now, let validation handle it
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
};

/**
 * Format SSN to standard format XXX-XX-XXXX
 */
export const formatSSN = (ssn: string): string => {
    const cleaned = ssn.replace(REGEX_DIGITS_ONLY, '');
    if (cleaned.length !== 9) return ssn;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
};

/**
 * Format EIN with leading 'XX-XXX' fallback if only last 4 provided
 */
export const formatEINOrPending = (einLast4?: string): string => {
    return einLast4 ? `XX-XXX${einLast4}` : 'PENDING';
};
