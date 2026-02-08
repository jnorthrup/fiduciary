import express from 'express';
import { publish } from '../lib/event-bus.js';
import { randomUUID } from 'crypto';
import persistence from '../lib/gcs-persistence.js';

const router = express.Router();

router.get('/accounts', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { trustId } = req.query;

    if (!trustId) {
      return res.status(400).json({ error: 'Validation Error', message: 'trustId query parameter is required' });
    }

    const ledger = await persistence.loadData(uid, 'ledger') || { accounts: {}, journalEntries: {} };
    const accounts = ledger.accounts[trustId] || [];

    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { trustId } = req.query;
    const { code, name, type } = req.body;

    if (!trustId) {
      return res.status(400).json({ error: 'Validation Error', message: 'trustId query parameter is required' });
    }
    if (!code || !name || !type) {
      return res.status(400).json({ error: 'Validation Error', message: 'code, name, and type are required' });
    }

    const ledger = await persistence.loadData(uid, 'ledger') || { accounts: {}, journalEntries: {} };

    if (!ledger.accounts[trustId]) {
      ledger.accounts[trustId] = [];
    }

    // Check for duplicate code
    if (ledger.accounts[trustId].some(a => a.code === code)) {
      return res.status(409).json({ error: 'Conflict', message: `Account code ${code} already exists` });
    }

    const newAccount = {
      accountId: randomUUID(),
      code,
      name,
      type,
      balance: 0.00
    };

    ledger.accounts[trustId].push(newAccount);
    await persistence.saveData(uid, 'ledger', ledger);

    res.status(201).json(newAccount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/journal-entries', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { trustId } = req.query;
    const { date, memo, lines } = req.body;

    if (!trustId) {
      return res.status(400).json({ error: 'Validation Error', message: 'trustId query parameter is required' });
    }
    if (!date || !lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'date and non-empty lines array are required' });
    }

    const ledger = await persistence.loadData(uid, 'ledger') || { accounts: {}, journalEntries: {} };

    // Validate accounts exist
    const trustAccounts = ledger.accounts[trustId] || [];
    for (const line of lines) {
      if (!trustAccounts.find(a => a.accountId === line.accountId)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `Account ID ${line.accountId} not found in trust ${trustId}`
        });
      }
    }

    const jeId = randomUUID();
    const newEntry = {
      jeId,
      status: 'draft',
      date,
      memo,
      lines,
      createdAt: new Date().toISOString()
    };

    if (!ledger.journalEntries[trustId]) {
      ledger.journalEntries[trustId] = [];
    }
    ledger.journalEntries[trustId].push(newEntry);
    await persistence.saveData(uid, 'ledger', ledger);

    res.status(201).json(newEntry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/journal-entries/:jeId/post', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { jeId } = req.params;

    const ledger = await persistence.loadData(uid, 'ledger') || { accounts: {}, journalEntries: {} };

    // Find entry
    let foundEntry = null;
    let foundTrustId = null;

    // Scan all trusts (since we don't have trustId in path, though we could require it)
    // Spec says JeId in path, TrustId NOT in query for this endpoint?
    // Spec: /ledger/journal-entries/{jeId}/post parameters: JournalEntryId. No TrustIdQuery.

    for (const [tid, entries] of Object.entries(ledger.journalEntries)) {
      const entry = entries.find(e => e.jeId === jeId);
      if (entry) {
        foundEntry = entry;
        foundTrustId = tid;
        break;
      }
    }

    if (!foundEntry) {
      return res.status(404).json({ error: 'Not Found', message: 'Journal entry not found' });
    }

    if (foundEntry.status === 'posted') {
      return res.status(400).json({ error: 'Validation Error', message: 'Journal entry already posted' });
    }

    // Validate Balance (Debits = Credits)
    const totalDebit = foundEntry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = foundEntry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Journal entry is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`
      });
    }

    // Update Account Balances
    const trustAccounts = ledger.accounts[foundTrustId] || [];
    const accountMap = new Map(trustAccounts.map(a => [a.accountId, a]));

    for (const line of foundEntry.lines) {
      const account = accountMap.get(line.accountId);
      if (account) {
        // Simplified balance logic: failing to distinguish normal balance (DEBIT vs CREDIT)
        // Assuming all accounts store signed balance or we just add/sub?
        // Standard: Asset/Expense increase with Debit. Liab/Equity/Income increase with Credit.

        let change = 0;
        // Debit
        if (line.debit) {
          if (['asset', 'expense'].includes(account.type)) change += line.debit;
          else change -= line.debit;
        }
        // Credit
        if (line.credit) {
          if (['asset', 'expense'].includes(account.type)) change -= line.credit;
          else change += line.credit;
        }

        account.balance = (account.balance || 0) + change;
      }
    }

    // Update Entry Status
    foundEntry.status = 'posted';
    foundEntry.postedAt = new Date().toISOString();

    // Save
    await persistence.saveData(uid, 'ledger', ledger);

    // Publish event
    await publish('journal.entry_posted', { ...foundEntry, trustId: foundTrustId });

    res.json(foundEntry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate balances from persistent journal
router.get('/balance/cash', async (req, res) => {
  try {
    const uid = req.user.uid;
    const journal = await persistence.loadData(uid, 'ledger') || { entries: [] };
    const balance = journal.entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/balance/transit', async (req, res) => {
  try {
    const uid = req.user.uid;
    // Mock transit calculation: simulate some entries as pending
    const journal = await persistence.loadData(uid, 'ledger') || { entries: [] };
    const transit = journal.entries
      .filter(e => e.status === 'pending')
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    res.json(transit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/balance/ap', async (req, res) => {
  try {
    const uid = req.user.uid;
    // Mock AP calculation: verify AP account balance
    const journal = await persistence.loadData(uid, 'ledger') || { entries: [] };
    const ap = journal.entries
      .filter(e => e.account === 'payable' || e.type === 'expense')
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    res.json(ap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/series/cash', async (req, res) => {
  try {
    const uid = req.user.uid;
    const journal = await persistence.loadData(uid, 'ledger') || { entries: [] };
    // Group by day for simple series
    // Implement actual grouping if needed, for now just return raw entries mapped
    const series = journal.entries.map(e => ({
      x: e.timestamp,
      y: e.amount || 0
    }));
    res.json(series);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/series/transit', async (req, res) => {
  try {
    const uid = req.user.uid;
    const journal = await persistence.loadData(uid, 'ledger') || { entries: [] };
    const series = journal.entries
      .filter(e => e.status === 'pending')
      .map(e => ({
        x: e.timestamp,
        y: e.amount || 0
      }));
    res.json(series);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
