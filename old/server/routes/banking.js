/**
 * Banking API Routes
 *
 * Express routes for the unified banking API.
 * Provides REST endpoints for multi-bank connectivity.
 */

import express from 'express';
const router = express.Router();

// Import banking types (Note: In a real implementation, you'd use a JS-compatible version)
// For now, we'll create a mock banking facade

// ============================================================================
// MOCK BANKING FACADE (Replace with real implementation)
// ============================================================================

class MockBankingFacade {
  constructor() {
    this.accounts = new Map();
    this.transactions = new Map();
    this.initializeMockData();
  }

  initializeMockData() {
    // Mock accounts
    this.accounts.set('acct_1', {
      id: 'acct_1',
      provider: 'plaid',
      type: 'checking',
      name: 'Primary Checking',
      displayName: 'Chase Checking - ****1234',
      currency: 'USD',
      status: 'active',
      currentBalance: 15234.56,
      availableBalance: 14834.56,
      institutionName: 'Chase Bank',
      accountNumberMask: '1234',
      lastSyncedAt: new Date().toISOString(),
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: new Date().toISOString(),
    });

    // Mock transactions
    const transactions = [
      {
        id: 'txn_1',
        provider: 'plaid',
        accountId: 'acct_1',
        amount: -45.67,
        currency: 'USD',
        description: 'Starbucks',
        category: 'Food & Drink',
        direction: 'debit',
        status: 'booked',
        bookedAt: new Date().toISOString(),
        valueAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'txn_2',
        provider: 'plaid',
        accountId: 'acct_1',
        amount: -123.45,
        currency: 'USD',
        description: 'Amazon.com',
        category: 'Shopping',
        direction: 'debit',
        status: 'booked',
        bookedAt: new Date(Date.now() - 86400000).toISOString(),
        valueAt: new Date(Date.now() - 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];
    this.transactions.set('acct_1', transactions);
  }

  async listAccounts() {
    return Array.from(this.accounts.values());
  }

  async getAccount(accountId) {
    return this.accounts.get(accountId) || null;
  }

  async getBalance(accountId) {
    const account = this.accounts.get(accountId);
    if (!account) return null;
    return {
      currentBalance: account.currentBalance,
      availableBalance: account.availableBalance,
      currency: account.currency,
      lastUpdatedAt: account.lastSyncedAt,
    };
  }

  async listTransactions(accountId) {
    return this.transactions.get(accountId) || [];
  }

  async getTransaction(transactionId) {
    for (const txns of this.transactions.values()) {
      const txn = txns.find(t => t.id === transactionId);
      if (txn) return txn;
    }
    return null;
  }

  async initiatePayment(request) {
    const paymentId = `pay_${Date.now()}`;
    return {
      paymentId,
      providerPaymentId: paymentId,
      status: 'processing',
      submittedAt: new Date().toISOString(),
      expectedSettlementAt: new Date(Date.now() + 86400000).toISOString(),
    };
  }

  async checkHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      providers: [
        { provider: 'plaid', status: 'healthy', latencyMs: 45 },
        { provider: 'teller', status: 'healthy', latencyMs: 120 },
      ],
    };
  }
}

// Initialize mock facade
const bankingFacade = new MockBankingFacade();

// ============================================================================
// HEALTH ENDPOINTS
// ============================================================================

/**
 * GET /api/banking/health
 *
 * Check health of all banking providers
 */
router.get('/health', async (req, res) => {
  try {
    const health = await bankingFacade.checkHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      error: 'Health check failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/banking/providers
 *
 * List available and enabled banking providers
 */
router.get('/providers', (req, res) => {
  res.json({
    available: ['plaid', 'teller', 'obp', 'fineract', 'mifos', 'coinbase'],
    enabled: ['plaid', 'teller'],
  });
});

// ============================================================================
// ACCOUNT ENDPOINTS
// ============================================================================

/**
 * GET /api/banking/accounts
 *
 * List all accounts from all enabled providers
 */
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await bankingFacade.listAccounts();
    res.json({
      accounts,
      count: accounts.length,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list accounts',
      message: error.message,
    });
  }
});

/**
 * GET /api/banking/accounts/:accountId
 *
 * Get details of a specific account
 */
router.get('/accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await bankingFacade.getAccount(accountId);

    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        accountId,
      });
    }

    res.json(account);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get account',
      message: error.message,
    });
  }
});

/**
 * GET /api/banking/accounts/:accountId/balance
 *
 * Get balance for a specific account
 */
router.get('/accounts/:accountId/balance', async (req, res) => {
  try {
    const { accountId } = req.params;
    const balance = await bankingFacade.getBalance(accountId);

    if (!balance) {
      return res.status(404).json({
        error: 'Account not found',
        accountId,
      });
    }

    res.json(balance);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get balance',
      message: error.message,
    });
  }
});

/**
 * POST /api/banking/accounts/:accountId/sync
 *
 * Force sync account data from provider
 */
router.post('/accounts/:accountId/sync', async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await bankingFacade.getAccount(accountId);

    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        accountId,
      });
    }

    // Update lastSyncedAt
    account.lastSyncedAt = new Date().toISOString();

    res.json({
      success: true,
      account,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to sync account',
      message: error.message,
    });
  }
});

// ============================================================================
// TRANSACTION ENDPOINTS
// ============================================================================

/**
 * GET /api/banking/transactions
 *
 * List transactions with optional filters
 *
 * Query params:
 * - accountId: string - Filter by account ID
 * - startDate: string - ISO date string
 * - endDate: string - ISO date string
 * - limit: number - Max results
 * - offset: number - Results offset
 */
router.get('/transactions', async (req, res) => {
  try {
    const { accountId, startDate, endDate, limit, offset } = req.query;

    let transactions;

    if (accountId) {
      transactions = await bankingFacade.listTransactions(accountId);
    } else {
      // Aggregate from all accounts
      transactions = [];
      for (const [acctId, txns] of bankingFacade.transactions) {
        transactions.push(...txns);
      }
    }

    // Apply date filters
    if (startDate) {
      transactions = transactions.filter(t => t.bookedAt >= startDate);
    }
    if (endDate) {
      transactions = transactions.filter(t => t.bookedAt <= endDate);
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

    // Apply pagination
    const start = offset ? parseInt(offset) : 0;
    const end = limit ? start + parseInt(limit) : transactions.length;
    const paginatedTransactions = transactions.slice(start, end);

    res.json({
      transactions: paginatedTransactions,
      count: paginatedTransactions.length,
      total: transactions.length,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list transactions',
      message: error.message,
    });
  }
});

/**
 * GET /api/banking/transactions/:transactionId
 *
 * Get details of a specific transaction
 */
router.get('/transactions/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const transaction = await bankingFacade.getTransaction(transactionId);

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
        transactionId,
      });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get transaction',
      message: error.message,
    });
  }
});

/**
 * GET /api/banking/accounts/:accountId/transactions
 *
 * List transactions for a specific account
 */
router.get('/accounts/:accountId/transactions', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit, offset } = req.query;

    const account = await bankingFacade.getAccount(accountId);
    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        accountId,
      });
    }

    let transactions = await bankingFacade.listTransactions(accountId);

    // Apply pagination
    const start = offset ? parseInt(offset) : 0;
    const end = limit ? start + parseInt(limit) : transactions.length;
    const paginatedTransactions = transactions.slice(start, end);

    res.json({
      transactions: paginatedTransactions,
      count: paginatedTransactions.length,
      total: transactions.length,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list transactions',
      message: error.message,
    });
  }
});

// ============================================================================
// PAYMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/banking/payments
 *
 * Initiate a payment
 *
 * Body:
 * {
 *   "sourceAccountId": string,
 *   "beneficiaryName": string,
 *   "beneficiaryAccount": string,
 *   "amount": number,
 *   "currency": string,
 *   "reference": string,
 *   "description": string,
 *   "method": "ach" | "wire" | "sepa" | "fps"
 * }
 */
router.post('/payments', async (req, res) => {
  try {
    const {
      sourceAccountId,
      beneficiaryName,
      beneficiaryAccount,
      amount,
      currency,
      reference,
      description,
      method,
    } = req.body;

    // Validate request
    if (!sourceAccountId || !beneficiaryName || !beneficiaryAccount || !amount || !currency) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['sourceAccountId', 'beneficiaryName', 'beneficiaryAccount', 'amount', 'currency'],
      });
    }

    const account = await bankingFacade.getAccount(sourceAccountId);
    if (!account) {
      return res.status(404).json({
        error: 'Source account not found',
        accountId: sourceAccountId,
      });
    }

    // Check sufficient funds
    if (amount > account.availableBalance) {
      return res.status(400).json({
        error: 'Insufficient funds',
        availableBalance: account.availableBalance,
        requestedAmount: amount,
      });
    }

    const payment = await bankingFacade.initiatePayment({
      sourceAccountId,
      beneficiaryName,
      beneficiaryAccount,
      amount,
      currency,
      reference,
      description,
      method,
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to initiate payment',
      message: error.message,
    });
  }
});

/**
 * GET /api/banking/payments/:paymentId
 *
 * Get payment status
 */
router.get('/payments/:paymentId', (req, res) => {
  // Mock implementation
  const { paymentId } = req.params;

  res.json({
    paymentId,
    status: 'completed',
    submittedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });
});

// ============================================================================
// AGGREGATION ENDPOINTS
// ============================================================================

/**
 * GET /api/banking/summary
 *
 * Get aggregated summary across all accounts
 */
router.get('/summary', async (req, res) => {
  try {
    const accounts = await bankingFacade.listAccounts();

    let totalBalance = 0;
    const byCurrency = {};
    const byProvider = {};
    const byType = {};

    for (const account of accounts) {
      const amount = account.currentBalance;
      totalBalance += amount;

      // Group by currency
      byCurrency[account.currency] = (byCurrency[account.currency] || 0) + amount;

      // Group by provider
      byProvider[account.provider] = (byProvider[account.provider] || 0) + amount;

      // Group by type
      byType[account.type] = (byType[account.type] || 0) + amount;
    }

    // Get transaction stats
    let totalTransactions = 0;
    for (const txns of bankingFacade.transactions.values()) {
      totalTransactions += txns.length;
    }

    res.json({
      accounts: {
        total: accounts.length,
        byType,
      },
      balances: {
        total: totalBalance,
        byCurrency,
        byProvider,
      },
      transactions: {
        total: totalTransactions,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate summary',
      message: error.message,
    });
  }
});

export default router;
