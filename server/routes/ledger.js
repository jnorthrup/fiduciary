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

export default router;
