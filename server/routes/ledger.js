import express from 'express';
import { publish } from '../lib/event-bus.js';
import { randomUUID } from 'crypto';
import persistence from '../lib/gcs-persistence.js';

const router = express.Router();

router.post('/journal', async (req, res) => {
  try {
    const entry = req.body;
    const uid = req.user.uid;

    // Basic validation
    if (!entry.description || !entry.amount) {
      return res.status(400).json({ error: 'Missing description or amount' });
    }

    const journalId = randomUUID();
    const event = {
      id: journalId,
      timestamp: new Date().toISOString(),
      ...entry,
      status: 'posted'
    };

    // 1. Load existing journal
    const journal = await persistence.loadData(uid, 'ledger') || { entries: [] };

    // 2. Add new entry
    journal.entries.push(event);

    // 3. Save to GCS
    await persistence.saveData(uid, 'ledger', journal);

    // Publish event for downstream consumers
    await publish('journal.entry_created', event);

    res.status(201).json({
      id: journalId,
      message: 'Journal entry created and persisted to GCS',
      event: event
    });
  } catch (error) {
    console.error('Ledger error:', error);
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
