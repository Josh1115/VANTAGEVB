const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

function makeToken(account) {
  return jwt.sign({ id: account.id, email: account.email }, JWT_SECRET, { expiresIn: '90d' });
}

function safeAccount(row) {
  const { pin_hash, ...rest } = row;
  return rest;
}

// POST /api/signup
router.post('/signup', async (req, res) => {
  const { email, pin, plan, coach_name, school_name, school_type, school_state } = req.body;

  if (!email || !pin) return res.status(400).json({ error: 'Email and PIN are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address.' });
  if (!/^\d{6}$/.test(String(pin))) return res.status(400).json({ error: 'PIN must be exactly 6 digits.' });

  const existing = db.prepare('SELECT id FROM accounts WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

  const pin_hash = await bcrypt.hash(String(pin), 10);
  const result = db.prepare(`
    INSERT INTO accounts (email, pin_hash, plan, coach_name, school_name, school_type, school_state, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    email.toLowerCase().trim(),
    pin_hash,
    plan || 'free',
    coach_name || null,
    school_name || null,
    school_type || null,
    school_state || null,
    Date.now()
  );

  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ token: makeToken(account), account: safeAccount(account) });
});

// POST /api/login
router.post('/login', async (req, res) => {
  const { email, pin } = req.body;

  if (!email || !pin) return res.status(400).json({ error: 'Email and PIN are required.' });

  const account = db.prepare('SELECT * FROM accounts WHERE email = ?').get(email.toLowerCase().trim());
  if (!account) return res.status(401).json({ error: 'Incorrect email or PIN.' });

  const match = await bcrypt.compare(String(pin), account.pin_hash);
  if (!match) return res.status(401).json({ error: 'Incorrect email or PIN.' });

  res.json({ token: makeToken(account), account: safeAccount(account) });
});

// GET /api/me
router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token.' });

  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(payload.id);
    if (!account) return res.status(401).json({ error: 'Account not found.' });
    res.json({ account: safeAccount(account) });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

module.exports = router;
