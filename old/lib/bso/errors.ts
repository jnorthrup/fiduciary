/**
 * BSO Error Code Mapping Module
 *
 * Maps SSA Business Services Online (BSO) error codes to user-friendly
 * messages with actionable resolution suggestions.
 *
 * Based on SSA BSO error code documentation
 * https://www.ssa.gov/employer/bsocerrorcodes
 */

import type { BSOErrorDetail } from '../types';

/**
 * BSO Error Categories
 */
export enum BSOErrorCategory {
  /** Authentication and authorization failures */
  AUTHENTICATION = 'Authentication',
  /** Data validation errors */
  VALIDATION = 'Validation',
  /** System or service errors */
  SYSTEM = 'System',
  /** Unknown or uncategorized errors */
  UNKNOWN = 'Unknown'
}

/**
 * SSA BSO error code mappings
 */
export const BSO_ERROR_CODES: Record<string, BSOErrorMapping> = {
  // Authentication Errors (BSO-9xx)
  'BSO-900': {
    code: 'BSO-900',
    message: 'Authentication failed - Invalid username or password',
    category: BSOErrorCategory.AUTHENTICATION,
    resolution: 'Verify your username and password. If you\'ve forgotten your credentials, use the "Forgot Password" link on the BSO login page.',
    severity: 'error'
  },
  'BSO-901': {
    code: 'BSO-901',
    message: 'Account locked - Too many failed login attempts',
    category: BSOErrorCategory.AUTHENTICATION,
    resolution: 'Your account has been temporarily locked due to multiple failed login attempts. Wait 15 minutes and try again, or contact SSA BSO Support for immediate assistance.',
    severity: 'error'
  },
  'BSO-902': {
    code: 'BSO-902',
    message: 'Session expired - Please log in again',
    category: BSOErrorCategory.AUTHENTICATION,
    resolution: 'Your session has timed out due to inactivity. Please log in again to continue.',
    severity: 'warning'
  },
  'BSO-903': {
    code: 'BSO-903',
    message: 'Unauthorized access - Insufficient permissions',
    category: BSOErrorCategory.AUTHENTICATION,
    resolution: 'Your account does not have permission to access this resource. Contact your organization administrator to request the necessary permissions.',
    severity: 'error'
  },

  // Authorization Errors (BSO-4xx)
  'BSO-403': {
    code: 'BSO-403',
    message: 'Access denied - Employer not linked to your account',
    category: BSOErrorCategory.AUTHENTICATION,
    resolution: 'This employer is not linked to your BSO user account. Use the "Add Employer" feature in BSO to link this employer to your account, or contact your payroll administrator.',
    severity: 'error'
  },
  'BSO-404': {
    code: 'BSO-404',
    message: 'Employer not found - Invalid EIN',
    category: BSOErrorCategory.VALIDATION,
    resolution: 'The Employer Identification Number (EIN) entered is not found in SSA records. Verify the EIN is correct and formatted as XX-XXXXXXX.',
    severity: 'error'
  },

  // Validation Errors (BSO-1xx)
  'BSO-101': {
    code: 'BSO-101',
    message: 'Invalid EIN format - Must be 9 digits',
    category: BSOErrorCategory.VALIDATION,
    resolution: 'Enter a valid 9-digit Employer Identification Number (EIN) in the format XX-XXXXXXX.',
    severity: 'error'
  },
  'BSO-102': {
    code: 'BSO-102',
    message: 'Invalid SSN format - Must be 9 digits',
    category: BSOErrorCategory.VALIDATION,
    resolution: 'Enter a valid 9-digit Social Security Number (SSN) in the format XXX-XX-XXXX.',
    severity: 'error'
  },
  'BSO-103': {
    code: 'BSO-103',
    message: 'Invalid tax year - Must be current or prior year',
    category: BSOErrorCategory.VALIDATION,
    resolution: 'W-2 forms can only be filed for the current tax year or the two prior years. Verify the tax year selected.',
    severity: 'error'
  },
  'BSO-104': {
    code: 'BSO-104',
    message: 'Required field missing - Employee name',
    category: BSOErrorCategory.VALIDATION,
    resolution: 'Employee name is required. Ensure both first and last name are provided.',
    severity: 'error'
  },
  'BSO-105': {
    code: 'BSO-105',
    message: 'Invalid wage amount - Must be positive number',
    category: BSOErrorCategory.VALIDATION,
    resolution: 'Wage amounts must be positive numbers. Verify the wages entered are correct.',
    severity: 'error'
  },
  'BSO-106': {
    code: 'BSO-106',
    message: 'File format error - Invalid EFW2 format',
    category: BSOErrorCategory.VALIDATION,
    resolution: 'The uploaded file does not conform to SSA EFW2 specifications. Use the EFW2 file validation tool to check your file format before uploading.',
    severity: 'error'
  },
  'BSO-107': {
    code: 'BSO-107',
    message: 'Record count mismatch - RE records don\'t match total',
    category: BSOErrorCategory.VALIDATION,
    resolution: 'The number of employee wage records (RE) in your file does not match the total count in the RT record. Verify all employees are included.',
    severity: 'error'
  },
  'BSO-108': {
    code: 'BSO-108',
    message: 'Checksum validation failed - Financial totals mismatch',
    category: BSOErrorCategory.VALIDATION,
    resolution: 'The financial totals in your file do not match the sum of individual records. Review and recalculate all wage and tax amounts.',
    severity: 'error'
  },

  // System Errors (BSO-5xx)
  'BSO-500': {
    code: 'BSO-500',
    message: 'Internal server error - SSA system unavailable',
    category: BSOErrorCategory.SYSTEM,
    resolution: 'The SSA BSO system is currently experiencing technical difficulties. Please wait a few minutes and try again. If the problem persists, contact SSA BSO Support.',
    severity: 'error'
  },
  'BSO-501': {
    code: 'BSO-501',
    message: 'Service temporarily unavailable - Maintenance in progress',
    category: BSOErrorCategory.SYSTEM,
    resolution: 'BSO is currently undergoing scheduled maintenance. Please check the SSA website for maintenance schedules and try again later.',
    severity: 'warning'
  },
  'BSO-502': {
    code: 'BSO-502',
    message: 'Upload timeout - File too large or slow connection',
    category: BSOErrorCategory.SYSTEM,
    resolution: 'The file upload timed out. This may be due to a large file size or slow internet connection. Try uploading a smaller file or improve your connection speed.',
    severity: 'warning'
  },
  'BSO-503': {
    code: 'BSO-503',
    message: 'Database error - Unable to process request',
    category: BSOErrorCategory.SYSTEM,
    resolution: 'A database error occurred while processing your request. Please try again. If the error continues, contact SSA BSO Support with details of your submission.',
    severity: 'error'
  },

  // AccuWage Specific Errors (BSO-2xx)
  'BSO-200': {
    code: 'BSO-200',
    message: 'AccuWage validation in progress - Check back later',
    category: BSOErrorCategory.SYSTEM,
    resolution: 'Your W-2 submission is being validated by AccuWage. This process typically takes 1-2 business days. Check back later for results.',
    severity: 'info'
  },
  'BSO-201': {
    code: 'BSO-201',
    message: 'AccuWage validation passed - No errors found',
    category: BSOErrorCategory.SYSTEM,
    resolution: 'Your W-2 submission has passed AccuWage validation. No further action is required.',
    severity: 'success'
  },
  'BSO-202': {
    code: 'BSO-202',
    message: 'AccuWage validation failed - Errors detected',
    category: BSOErrorCategory.VALIDATION,
    resolution: 'AccuWage detected errors in your W-2 submission. Download the AccuWage report for details, correct the errors, and resubmit.',
    severity: 'error'
  },
  'BSO-203': {
    code: 'BSO-203',
    message: 'AccuWage validation rejected - Fatal errors',
    category: BSOErrorCategory.VALIDATION,
    resolution: 'Your W-2 submission was rejected due to fatal AccuWage errors. You must correct all errors and submit a new W-2 file.',
    severity: 'error'
  }
};

/**
 * Interface for BSO error mapping
 */
export interface BSOErrorMapping {
  /** The BSO error code */
  code: string;
  /** User-friendly error message */
  message: string;
  /** Error category */
  category: BSOErrorCategory;
  /** Suggested resolution steps */
  resolution: string;
  /** Error severity level */
  severity: 'error' | 'warning' | 'info' | 'success';
}

/**
 * Map a BSO error code to a detailed error object
 *
 * @param code - The BSO error code (e.g., "BSO-900", "BSO-403")
 * @returns BSOErrorDetail object with message, resolution, and category
 *
 * @example
 * ```ts
 * const error = mapBSOError('BSO-900');
 * console.log(error.message); // "Authentication failed - Invalid username or password"
 * console.log(error.resolution); // "Verify your username and password..."
 * ```
 */
export function mapBSOError(code: string): BSOErrorDetail {
  const mapping = BSO_ERROR_CODES[code];

  if (!mapping) {
    // Return unknown error if code not found
    return {
      code,
      message: `Unknown BSO error: ${code}`,
      resolution: 'An unexpected error occurred. Note the error code and contact SSA BSO Support for assistance.',
      category: BSOErrorCategory.UNKNOWN
    };
  }

  return {
    code: mapping.code,
    message: mapping.message,
    resolution: mapping.resolution,
    category: mapping.category as BSOErrorDetail['category']
  };
}

/**
 * Get all error codes for a specific category
 *
 * @param category - The error category to filter by
 * @returns Array of error codes in the specified category
 *
 * @example
 * ```ts
 * const authErrors = getErrorsByCategory(BSOErrorCategory.AUTHENTICATION);
 * console.log(authErrors); // ["BSO-900", "BSO-901", "BSO-902", "BSO-903", "BSO-403"]
 * ```
 */
export function getErrorsByCategory(category: BSOErrorCategory): string[] {
  return Object.values(BSO_ERROR_CODES)
    .filter(mapping => mapping.category === category)
    .map(mapping => mapping.code);
}

/**
 * Check if an error code is authentication-related
 *
 * @param code - The BSO error code to check
 * @returns true if the error is in the Authentication category
 */
export function isAuthenticationError(code: string): boolean {
  return getErrorsByCategory(BSOErrorCategory.AUTHENTICATION).includes(code);
}

/**
 * Check if an error code is validation-related
 *
 * @param code - The BSO error code to check
 * @returns true if the error is in the Validation category
 */
export function isValidationError(code: string): boolean {
  return getErrorsByCategory(BSOErrorCategory.VALIDATION).includes(code);
}

/**
 * Check if an error code is system-related
 *
 * @param code - The BSO error code to check
 * @returns true if the error is in the System category
 */
export function isSystemError(code: string): boolean {
  return getErrorsByCategory(BSOErrorCategory.SYSTEM).includes(code);
}

/**
 * Get human-readable category name
 *
 * @param category - The BSO error category
 * @returns Human-readable category name
 */
export function getCategoryName(category: BSOErrorCategory): string {
  const names: Record<BSOErrorCategory, string> = {
    [BSOErrorCategory.AUTHENTICATION]: 'Authentication',
    [BSOErrorCategory.VALIDATION]: 'Validation',
    [BSOErrorCategory.SYSTEM]: 'System',
    [BSOErrorCategory.UNKNOWN]: 'Unknown'
  };
  return names[category] || 'Unknown';
}
