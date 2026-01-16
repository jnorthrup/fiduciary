import express from 'express';
import { publish } from '../lib/event-bus.js';
import { randomUUID } from 'crypto';

const router = express.Router();

router.post('/journal', async (req, res) => {
  try {
    const entry = req.body;
    
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

    // Publish event
    await publish('journal.entry_created', event);

    res.status(201).json({
      id: journalId,
      message: 'Journal entry created',
      event: event
    });
  } catch (error) {
    console.error('Ledger error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
