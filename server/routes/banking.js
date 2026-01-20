import express from 'express';
import persistence from '../lib/gcs-persistence.js';

const router = express.Router();

// ============================================================================
// MOCK BANKING FACADE (Replace with real implementation)
// ============================================================================

class MockBankingFacade {
  async ensureState(uid) {
    let state = await persistence.loadData(uid, 'banking');
    if (!state) {
      state = this.getInitialMockData();
      await persistence.saveData(uid, 'banking', state);
    }
    return state;
  }

  getInitialMockData() {
    return {
      accounts: {
        'acct_1': {
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
        }
      },
      transactions: {
        'acct_1': [
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
          }
        ]
      }
    };
  }

  async listAccounts(uid) {
    const state = await this.ensureState(uid);
    return Object.values(state.accounts);
  }

  async getAccount(uid, accountId) {
    const state = await this.ensureState(uid);
    return state.accounts[accountId] || null;
  }

  async getBalance(uid, accountId) {
    const account = await this.getAccount(uid, accountId);
    if (!account) return null;
    return {
      currentBalance: account.currentBalance,
      availableBalance: account.availableBalance,
      currency: account.currency,
      lastUpdatedAt: account.lastSyncedAt,
    };
  }

  async listTransactions(uid, accountId) {
    const state = await this.ensureState(uid);
    return state.transactions[accountId] || [];
  }

  async getTransaction(uid, transactionId) {
    const state = await this.ensureState(uid);
    for (const txns of Object.values(state.transactions)) {
      const txn = txns.find(t => t.id === transactionId);
      if (txn) return txn;
    }
    return null;
  }

  async initiatePayment(uid, request) {
    const paymentId = `pay_${Date.now()}`;
    const state = await this.ensureState(uid);

    // Simulate balance reduction
    if (state.accounts[request.sourceAccountId]) {
      state.accounts[request.sourceAccountId].currentBalance -= request.amount;
      state.accounts[request.sourceAccountId].availableBalance -= request.amount;
      state.accounts[request.sourceAccountId].updatedAt = new Date().toISOString();

      // Add transaction
      if (!state.transactions[request.sourceAccountId]) state.transactions[request.sourceAccountId] = [];
      state.transactions[request.sourceAccountId].unshift({
        id: `txn_${Date.now()}`,
        provider: 'internal',
        accountId: request.sourceAccountId,
        amount: -request.amount,
        currency: request.currency,
        description: request.description || `Payment to ${request.beneficiaryName}`,
        category: 'Transfer',
        direction: 'debit',
        status: 'pending',
        bookedAt: new Date().toISOString(),
        valueAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      await persistence.saveData(uid, 'banking', state);
    }

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

router.get('/health', async (req, res) => {
  try {
    const health = await bankingFacade.checkHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Health check failed', message: error.message });
  }
});

router.get('/providers', (req, res) => {
  res.json({
    available: ['plaid', 'teller', 'obp', 'fineract', 'mifos', 'coinbase'],
    enabled: ['plaid', 'teller'],
  });
});

// ============================================================================
// ACCOUNT ENDPOINTS
// ============================================================================

router.get('/accounts', async (req, res) => {
  try {
    const uid = req.user.uid;
    const accounts = await bankingFacade.listAccounts(uid);
    res.json({ accounts, count: accounts.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list accounts', message: error.message });
  }
});

router.get('/accounts/:accountId', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { accountId } = req.params;
    const account = await bankingFacade.getAccount(uid, accountId);

    if (!account) {
      return res.status(404).json({ error: 'Account not found', accountId });
    }

    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get account', message: error.message });
  }
});

router.get('/accounts/:accountId/balance', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { accountId } = req.params;
    const balance = await bankingFacade.getBalance(uid, accountId);

    if (!balance) {
      return res.status(404).json({ error: 'Account not found', accountId });
    }

    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get balance', message: error.message });
  }
});

router.post('/accounts/:accountId/sync', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { accountId } = req.params;
    const account = await bankingFacade.getAccount(uid, accountId);

    if (!account) {
      return res.status(404).json({ error: 'Account not found', accountId });
    }

    account.lastSyncedAt = new Date().toISOString();
    // In a real app we'd save the sync state
    const state = await persistence.loadData(uid, 'banking');
    state.accounts[accountId] = account;
    await persistence.saveData(uid, 'banking', state);

    res.json({ success: true, account, syncedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync account', message: error.message });
  }
});

// ============================================================================
// TRANSACTION ENDPOINTS
// ============================================================================

router.get('/transactions', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { accountId, startDate, endDate, limit, offset } = req.query;

    let transactions;

    if (accountId) {
      transactions = await bankingFacade.listTransactions(uid, accountId);
    } else {
      const state = await bankingFacade.ensureState(uid);
      transactions = [];
      for (const txns of Object.values(state.transactions)) {
        transactions.push(...txns);
      }
    }

    if (startDate) transactions = transactions.filter(t => t.bookedAt >= startDate);
    if (endDate) transactions = transactions.filter(t => t.bookedAt <= endDate);
    transactions.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

    const start = offset ? parseInt(offset) : 0;
    const end = limit ? start + parseInt(limit) : transactions.length;
    const paginatedTransactions = transactions.slice(start, end);

    res.json({
      transactions: paginatedTransactions,
      count: paginatedTransactions.length,
      total: transactions.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list transactions', message: error.message });
  }
});

router.get('/transactions/:transactionId', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { transactionId } = req.params;
    const transaction = await bankingFacade.getTransaction(uid, transactionId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found', transactionId });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get transaction', message: error.message });
  }
});


router.get('/accounts/:accountId/transactions', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { accountId } = req.params;
    const { limit, offset } = req.query;

    const account = await bankingFacade.getAccount(uid, accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found', accountId });
    }

    let transactions = await bankingFacade.listTransactions(uid, accountId);

    const start = offset ? parseInt(offset) : 0;
    const end = limit ? start + parseInt(limit) : transactions.length;
    const paginatedTransactions = transactions.slice(start, end);

    res.json({
      transactions: paginatedTransactions,
      count: paginatedTransactions.length,
      total: transactions.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list transactions', message: error.message });
  }
});

// ============================================================================
// PAYMENT ENDPOINTS
// ============================================================================

router.post('/payments', async (req, res) => {
  try {
    const uid = req.user.uid;
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

    if (!sourceAccountId || !beneficiaryName || !beneficiaryAccount || !amount || !currency) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['sourceAccountId', 'beneficiaryName', 'beneficiaryAccount', 'amount', 'currency'],
      });
    }

    const account = await bankingFacade.getAccount(uid, sourceAccountId);
    if (!account) {
      return res.status(404).json({ error: 'Source account not found', accountId: sourceAccountId });
    }

    if (amount > account.availableBalance) {
      return res.status(400).json({
        error: 'Insufficient funds',
        availableBalance: account.availableBalance,
        requestedAmount: amount,
      });
    }

    const payment = await bankingFacade.initiatePayment(uid, {
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
    res.status(500).json({ error: 'Failed to initiate payment', message: error.message });
  }
});

router.get('/payments/:paymentId', (req, res) => {
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

router.get('/summary', async (req, res) => {
  try {
    const uid = req.user.uid;
    const accounts = await bankingFacade.listAccounts(uid);
    const state = await bankingFacade.ensureState(uid);

    let totalBalance = 0;
    const byCurrency = {};
    const byProvider = {};
    const byType = {};

    for (const account of accounts) {
      const amount = account.currentBalance;
      totalBalance += amount;
      byCurrency[account.currency] = (byCurrency[account.currency] || 0) + amount;
      byProvider[account.provider] = (byProvider[account.provider] || 0) + amount;
      byType[account.type] = (byType[account.type] || 0) + amount;
    }

    let totalTransactions = 0;
    for (const txns of Object.values(state.transactions)) {
      totalTransactions += txns.length;
    }

    res.json({
      accounts: { total: accounts.length, byType },
      balances: { total: totalBalance, byCurrency, byProvider },
      transactions: { total: totalTransactions },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate summary', message: error.message });
  }
});

export default router;
