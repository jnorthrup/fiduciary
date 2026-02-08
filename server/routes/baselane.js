/**
 * Baselane API Routes
 * Track: baselane_api_20260124
 *
 * Exposes Baselane service functionality to frontend via REST API.
 * All routes require Firebase authentication.
 */

import express from 'express';
import { BaselaneService } from '../services/baselaneService.js';
import { syncPropertiesToEntities } from '../services/baselaneMapping.js';
import { getBaselaneCredentials as getBaselaneConfig } from '../services/baselaneSecrets.js';

const router = express.Router();

/**
 * Create BaselaneService instance
 * Gets configuration from Secret Manager
 */
async function createBaselaneService() {
  const config = await getBaselaneConfig();
  return new BaselaneService(config);
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/baselane/properties
 * List all properties from Baselane
 */
router.get('/properties', async (req, res) => {
  try {
    const service = await createBaselaneService();
    const result = await service.getProperties();

    if (!result.success) {
      return res.status(500).json({
        error: result.error?.message || 'Failed to fetch properties',
        code: result.error?.code,
        requestId: result.error?.requestId
      });
    }

    res.json(result.data);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch properties'
    });
  }
});

/**
 * POST /api/baselane/properties/sync
 * Sync properties to fiduciary entities
 */
router.post('/properties/sync', async (req, res) => {
  try {
    const uid = req.user.uid;
    const result = await syncPropertiesToEntities(uid);

    res.json(result);
  } catch (error) {
    console.error('Error syncing properties:', error);
    res.status(500).json({
      error: 'Property Sync Failed',
      message: error.message || 'Failed to sync properties to entities'
    });
  }
});

/**
 * GET /api/baselane/tenants
 * List all tenants from Baselane
 */
router.get('/tenants', async (req, res) => {
  try {
    const service = await createBaselaneService();
    const result = await service.getTenants();

    if (!result.success) {
      return res.status(500).json({
        error: result.error?.message || 'Failed to fetch tenants',
        code: result.error?.code,
        requestId: result.error?.requestId
      });
    }

    res.json(result.data);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch tenants'
    });
  }
});

/**
 * POST /api/baselane/rent/charges
 * Create a rent charge
 */
router.post('/rent/charges', async (req, res) => {
  try {
    const { tenantId, propertyId, unitId, amount, dueDate, type, description } = req.body;

    // Validation
    if (!tenantId || !propertyId || !unitId || !amount || !dueDate || !type) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'tenantId, propertyId, unitId, amount, dueDate, and type are required'
      });
    }

    const service = await createBaselaneService();
    const result = await service.createRentCharge({
      tenantId,
      propertyId,
      unitId,
      amount,
      dueDate,
      type,
      description
    });

    if (!result.success) {
      return res.status(500).json({
        error: result.error?.message || 'Failed to create rent charge',
        code: result.error?.code,
        requestId: result.error?.requestId
      });
    }

    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error creating rent charge:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to create rent charge'
    });
  }
});

/**
 * GET /api/baselane/balance
 * Get account balance
 */
router.get('/balance', async (req, res) => {
  try {
    const { accountId } = req.query;

    if (!accountId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'accountId query parameter is required'
      });
    }

    const service = await createBaselaneService();
    const result = await service.getBalance(accountId);

    if (!result.success) {
      return res.status(500).json({
        error: result.error?.message || 'Failed to fetch balance',
        code: result.error?.code,
        requestId: result.error?.requestId
      });
    }

    res.json(result.data);
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch balance'
    });
  }
});

/**
 * GET /api/baselane/transactions
 * List transactions with optional date range filters
 */
router.get('/transactions', async (req, res) => {
  try {
    const { accountId, startDate, endDate, limit, offset } = req.query;

    if (!accountId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'accountId query parameter is required'
      });
    }

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (limit) options.limit = parseInt(limit, 10);
    if (offset) options.offset = parseInt(offset, 10);

    const service = await createBaselaneService();
    const result = await service.getTransactions(accountId, options);

    if (!result.success) {
      return res.status(500).json({
        error: result.error?.message || 'Failed to fetch transactions',
        code: result.error?.code,
        requestId: result.error?.requestId
      });
    }

    res.json(result.data);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to fetch transactions'
    });
  }
});

export default router;
