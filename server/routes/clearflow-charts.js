import express from 'express';
import { loadUserState } from '../lib/clearflow-store.js';

const router = express.Router();

function computeBalance(state, code) {
  let debit = 0;
  let credit = 0;
  (state.journal_entries || []).forEach(entry => {
    entry.lines.forEach(line => {
      const account = line.account_code || line.accountCode || line.account;
      if (account === code) {
        debit += Number(line.debit) || 0;
        credit += Number(line.credit) || 0;
      }
    });
  });
  return debit - credit;
}

router.get('/cash-balance', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const balance = computeBalance(state, '1000');
  res.json({ latest: { y: balance }, series: [{ y: balance }] });
});

router.get('/transit-balance', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const balance = computeBalance(state, '1100');
  res.json({ latest: { y: balance }, series: [{ y: balance }] });
});

router.get('/ap-balance', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const balance = computeBalance(state, '2000');
  res.json({ latest: { y: balance }, series: [{ y: balance }] });
});

export default router;
