/**
 * Lightweight IRS IRIS API Mock Server
 *
 * Simplified backend that approximates IRS IRIS A2A API behavior
 * for the 1099 filing wizard. No external dependencies required.
 */

import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

const PORT = process.env.PORT || 3001;

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// In-Memory Storage
// ============================================================================

const submissions = new Map();
const tinValidationCache = new Map();

// ============================================================================
// IRS API Routes - Lightweight Mock
// ============================================================================

/**
 * GET /api/irs/health
 * Health check endpoint
 */
app.get('/api/irs/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'IRS IRIS A2A API Mock',
    version: '1.3.0'
  });
});

/**
 * POST /api/irs/submissions
 * Submit information return batch
 */
app.post('/api/irs/submissions', (req, res) => {
  try {
    const authHeader = req.headers['x-irs-tcc'] || req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        code: 'AUTH_MISSING_TCC',
        message: 'Missing authentication credentials',
        timestamp: new Date().toISOString()
      });
    }

    const submission = req.body;

    // Basic validation
    const errors = [];

    if (!submission.transmitterId) {
      errors.push({
        code: 'MISSING_TRANSMITTER_ID',
        message: 'Transmitter ID is required',
        field: 'transmitterId',
        severity: 'ERROR'
      });
    }

    if (!submission.filer?.ein) {
      errors.push({
        code: 'MISSING_FILER_EIN',
        message: 'Filer EIN is required',
        field: 'filer.ein',
        severity: 'ERROR'
      });
    } else {
      const einPattern = /^\d{2}-\d{7}$/;
      if (!einPattern.test(submission.filer.ein)) {
        errors.push({
          code: 'INVALID_EIN_FORMAT',
          message: 'EIN must be in format XX-XXXXXXX',
          field: 'filer.ein',
          severity: 'ERROR'
        });
      }
    }

    if (!submission.payees || submission.payees.length === 0) {
      errors.push({
        code: 'NO_PAYEES',
        message: 'At least one payee is required',
        field: 'payees',
        severity: 'ERROR'
      });
    }

    if (submission.payees && submission.payees.length > 1000) {
      errors.push({
        code: 'BATCH_TOO_LARGE',
        message: 'Maximum 1000 payees per submission',
        field: 'payees',
        severity: 'ERROR'
      });
    }

    // Validate payee TINs
    submission.payees?.forEach((payee, index) => {
      const einPattern = /^\d{2}-\d{7}$/;
      const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;

      if (!einPattern.test(payee.tin) && !ssnPattern.test(payee.tin)) {
        errors.push({
          code: 'INVALID_PAYEE_TIN',
          message: `Payee ${index + 1}: TIN must be in format XX-XXXXXXX or XXX-XX-XXXX`,
          field: `payees[${index}].tin`,
          severity: 'ERROR'
        });
      }
    });

    // If errors, return 400
    if (errors.length > 0) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Submission validation failed',
        errors,
        timestamp: new Date().toISOString()
      });
    }

    // Generate receipt ID
    const receiptId = randomUUID();

    // Store submission
    submissions.set(receiptId, {
      ...submission,
      receiptId,
      status: 'Processing',
      submittedAt: new Date().toISOString(),
      validation: {
        valid: true,
        errors: [],
        warnings: []
      }
    });

    // Return receipt
    res.status(202).json({
      receiptId,
      status: 'Received',
      timestamp: new Date().toISOString(),
      estimatedCompletion: new Date(Date.now() + 10 * 1000).toISOString(),
      message: 'Your submission has been received and is being processed.',
      warnings: [],
      errors: []
    });

  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/irs/submissions/:receiptId/status
 * Get submission status
 */
app.get('/api/irs/submissions/:receiptId/status', (req, res) => {
  const { receiptId } = req.params;

  const submission = submissions.get(receiptId);

  if (!submission) {
    return res.status(404).json({
      code: 'RECEIPT_NOT_FOUND',
      message: `Receipt ${receiptId} not found`,
      timestamp: new Date().toISOString()
    });
  }

  // Simulate processing completion after delay
  const ageMs = Date.now() - new Date(submission.submittedAt).getTime();
  const isComplete = ageMs > 10000; // 10 seconds for demo

  let status = submission.status;
  let completedAt = null;

  if (isComplete && status === 'Processing') {
    status = 'Accepted';
    completedAt = new Date().toISOString();
    submission.status = status;
    submission.completedAt = completedAt;
    submissions.set(receiptId, submission);
  }

  res.json({
    receiptId,
    status,
    submittedAt: submission.submittedAt,
    completedAt: completedAt || submission.completedAt,
    recordCount: submission.payees?.length || 0,
    acceptedCount: status === 'Accepted' ? (submission.payees?.length || 0) : 0,
    errorCount: submission.validation?.errors?.length || 0,
    warningCount: submission.validation?.warnings?.length || 0,
    errors: submission.validation?.errors || [],
    warnings: submission.validation?.warnings || [],
    processingTime: completedAt ? Math.round(ageMs / 1000) : null
  });
});

/**
 * POST /api/irs/tin-validation
 * Interactive TIN matching
 */
app.post('/api/irs/tin-validation', (req, res) => {
  try {
    const { tin, name, requests } = req.body;

    // Single TIN validation
    if (tin && name) {
      const cacheKey = `${tin}-${name}`;

      // Check cache
      if (tinValidationCache.has(cacheKey)) {
        return res.json(tinValidationCache.get(cacheKey));
      }

      // Validate TIN format
      const einPattern = /^\d{2}-\d{7}$/;
      const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;
      const isValidFormat = einPattern.test(tin) || ssnPattern.test(tin);

      if (!isValidFormat) {
        const result = {
          code: 2,
          match: false,
          message: 'Invalid TIN format. Expected XX-XXXXXXX for EIN or XXX-XX-XXXX for SSN.',
          tin,
          name
        };
        tinValidationCache.set(cacheKey, result);
        return res.json(result);
      }

      // Simulate successful validation for demo
      const result = {
        code: 0,
        match: true,
        message: 'TIN and name combination validated successfully.',
        tin,
        name
      };

      tinValidationCache.set(cacheKey, result);
      return res.json(result);
    }

    // Batch validation
    if (requests && Array.isArray(requests)) {
      const results = requests.map(({ tin, name }) => {
        const cacheKey = `${tin}-${name}`;

        if (tinValidationCache.has(cacheKey)) {
          return tinValidationCache.get(cacheKey);
        }

        const result = {
          code: 0,
          match: true,
          message: 'Validated successfully',
          tin,
          name
        };

        tinValidationCache.set(cacheKey, result);
        return result;
      });

      return res.json({
        results,
        requestId: randomUUID()
      });
    }

    res.status(400).json({
      code: 'INVALID_REQUEST',
      message: 'Must provide either tin/name pair or requests array'
    });

  } catch (error) {
    console.error('TIN validation error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /api/irs/transmission-check
 * Pre-transmission validation
 */
app.post('/api/irs/transmission-check', (req, res) => {
  try {
    const submission = req.body;
    const errors = [];
    const warnings = [];

    // Basic validation
    if (!submission.transmitterId || !/^\d{10}$/.test(submission.transmitterId)) {
      errors.push({
        code: 'INVALID_TRANSMITTER_ID',
        message: 'Transmitter ID must be 10 digits',
        field: 'transmitterId',
        severity: 'ERROR'
      });
    }

    if (!submission.filer?.ein || !/^\d{2}-\d{7}$/.test(submission.filer.ein)) {
      errors.push({
        code: 'INVALID_EIN',
        message: 'Filer EIN must be in format XX-XXXXXXX',
        field: 'filer.ein',
        severity: 'ERROR'
      });
    }

    if (!submission.taxYear || submission.taxYear < 2020 || submission.taxYear > 2030) {
      errors.push({
        code: 'INVALID_TAX_YEAR',
        message: 'Tax year must be between 2020 and 2030',
        field: 'taxYear',
        severity: 'ERROR'
      });
    }

    // Validate payees
    if (submission.payees && submission.payees.length > 0) {
      if (submission.payees.length > 1000) {
        errors.push({
          code: 'BATCH_TOO_LARGE',
          message: 'Maximum 1000 payees per submission',
          field: 'payees',
          severity: 'ERROR'
        });
      }

      submission.payees.forEach((payee, i) => {
        const einPattern = /^\d{2}-\d{7}$/;
        const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;

        if (!einPattern.test(payee.tin) && !ssnPattern.test(payee.tin)) {
          errors.push({
            code: 'INVALID_TIN_FORMAT',
            message: `Payee ${i + 1}: TIN must be in format XX-XXXXXXX or XXX-XX-XXXX`,
            field: `payees[${i}].tin`,
            severity: 'ERROR'
          });
        }

        if (!payee.name || payee.name.trim().length === 0) {
          errors.push({
            code: 'MISSING_PAYEE_NAME',
            message: `Payee ${i + 1}: Name is required`,
            field: `payees[${i}].name`,
            severity: 'ERROR'
          });
        }
      });
    }

    res.json({
      valid: errors.length === 0,
      warnings,
      errors
    });

  } catch (error) {
    console.error('Transmission check error:', error);
    res.status(500).json({
      valid: false,
      errors: [{
        code: 'INTERNAL_ERROR',
        message: error.message,
        severity: 'ERROR'
      }]
    });
  }
});

/**
 * GET /api/irs/schemas/:formType
 * Get form schema
 */
app.get('/api/irs/schemas/:formType', (req, res) => {
  const { formType } = req.params;

  const validForms = ['1099-NEC', '1099-MISC', '1099-INT', '1099-DIV', '1099-B', '1099-R', '1099-S', 'W-2', 'W-2G', '1042-S', '3921', '3922'];

  if (!validForms.includes(formType)) {
    return res.status(404).json({
      code: 'FORM_NOT_FOUND',
      message: `Form type ${formType} not supported`
    });
  }

  const schemas = {
    '1099-NEC': {
      type: 'object',
      title: 'Form 1099-NEC',
      description: 'Nonemployee Compensation',
      required: ['nonemployeeCompensation'],
      properties: {
        nonemployeeCompensation: {
          type: 'number',
          minimum: 0,
          description: 'Box 1: Nonemployee compensation'
        }
      }
    },
    '1099-INT': {
      type: 'object',
      title: 'Form 1099-INT',
      description: 'Interest Income',
      properties: {
        interestIncome: { type: 'number', minimum: 0 },
        earlyWithdrawalPenalty: { type: 'number', minimum: 0 },
        federalIncomeTaxWithheld: { type: 'number', minimum: 0 }
      }
    },
    '1099-DIV': {
      type: 'object',
      title: 'Form 1099-DIV',
      description: 'Dividends and Distributions',
      properties: {
        ordinaryDividends: { type: 'number', minimum: 0 },
        qualifiedDividends: { type: 'number', minimum: 0 },
        capitalGainDistributions: { type: 'number', minimum: 0 }
      }
    },
    'W-2': {
      type: 'object',
      title: 'Form W-2',
      description: 'Wage and Tax Statement',
      properties: {
        wagesTipsOtherComp: { type: 'number', minimum: 0 },
        federalIncomeTaxWithheld: { type: 'number', minimum: 0 },
        socialSecurityWages: { type: 'number', minimum: 0 }
      }
    }
  };

  res.json(schemas[formType] || {
    type: 'object',
    title: `Form ${formType}`,
    description: 'Schema available for production forms'
  });
});

// ============================================================================
// Error Handler
// ============================================================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   IRS IRIS A2A API Mock Server                                ║
║   Lightweight 1099 Backend                                    ║
║                                                               ║
║   Server running on: http://localhost:${PORT}                     ║
║   API Endpoint:  /api/irs                                     ║
║   Health Check:  /api/irs/health                              ║
║                                                               ║
║   No external dependencies required                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
