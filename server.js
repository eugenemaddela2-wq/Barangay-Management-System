const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, param, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'replace-with-a-strong-secret';

const connectionString = process.env.DATABASE_URL || '';
if (!connectionString) {
  console.error('WARNING: No DATABASE_URL found in environment. Set DATABASE_URL to your Render/Postgres connection string.');
}

const pool = new Pool({ connectionString });

async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

// Helper: generate token
function generateToken(user) {
  return jwt.sign({ user_id: user.user_id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
}

// Middleware: authenticate token if provided
function authenticateToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return next();
  const parts = auth.split(' ');
  if (parts.length !== 2) return next();
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
  } catch (err) {
    // ignore invalid token
  }
  return next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (Array.isArray(role)) {
      if (!role.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    } else {
      if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

app.use(authenticateToken);

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  await body('username').isLength({ min: 3 }).run(req);
  await body('password').isLength({ min: 6 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { username, password, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const q = 'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING user_id, username, role';
    const r = await query(q, [username, hashed, role || 'resident']);
    const user = r.rows[0];
    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  await body('username').exists().run(req);
  await body('password').exists().run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { username, password } = req.body;
  try {
    const q = 'SELECT user_id, username, password, role FROM users WHERE username=$1';
    const r = await query(q, [username]);
    if (r.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = r.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    delete user.password;
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: manage users (list/create/delete) — safer than using register for admin actions
app.get('/api/users', requireRole('admin'), async (req, res) => {
  try {
    const r = await query('SELECT user_id, username, role, created_at FROM users ORDER BY user_id');
    res.json(r.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/users', requireRole('admin'), async (req, res) => {
  await body('username').isLength({ min: 3 }).run(req);
  await body('password').isLength({ min: 6 }).run(req);
  await body('role').isIn(['resident','official','admin']).optional().run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { username, password, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const r = await query('INSERT INTO users (username,password,role) VALUES ($1,$2,$3) RETURNING user_id, username, role', [username, hashed, role||'resident']);
    res.json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username exists' });
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:id', requireRole('admin'), async (req, res) => {
  try { const r = await query('DELETE FROM users WHERE user_id=$1 RETURNING user_id, username', [req.params.id]); if (r.rowCount===0) return res.status(404).json({ error:'Not found' }); res.json({ deleted: true }); } catch (err) { console.error(err); res.status(500).json({ error:'Internal server error' }); }
});

// Token refresh endpoint: requires a valid token and issues a fresh one
app.post('/api/auth/refresh', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Invalid or missing token' });
  try {
    // issue a new token based on the current user payload
    const payload = { user_id: req.user.user_id, username: req.user.username, role: req.user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not refresh token' });
  }
});

// CRUD helpers for generic tables
// Residents
app.get('/api/residents', async (req, res) => {
  try {
    const r = await query('SELECT * FROM residents ORDER BY resident_id');
    res.json(r.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});

app.get('/api/residents/:id', async (req, res) => {
  await param('id').isInt().run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id', details: errors.array() });
  try {
    const r = await query('SELECT * FROM residents WHERE resident_id=$1', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});

app.post('/api/residents', requireRole(['admin','official']), async (req, res) => {
  await body('name').isLength({ min: 1 }).run(req);
  await body('age').optional().isInt({ min: 0 }).run(req);
  await body('address').optional().isLength({ max: 255 }).run(req);
  await body('contact').optional().isLength({ max: 100 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { name, age, address, contact } = req.body;
  try {
    const q = 'INSERT INTO residents (name, age, address, contact) VALUES ($1,$2,$3,$4) RETURNING *';
    const r = await query(q, [name, age || null, address || null, contact || null]);
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});

app.put('/api/residents/:id', requireRole(['admin','official']), async (req, res) => {
  await param('id').isInt().run(req);
  await body('name').isLength({ min: 1 }).run(req);
  await body('age').optional().isInt({ min: 0 }).run(req);
  await body('address').optional().isLength({ max: 255 }).run(req);
  await body('contact').optional().isLength({ max: 100 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { name, age, address, contact } = req.body;
  try {
    const q = 'UPDATE residents SET name=$1, age=$2, address=$3, contact=$4 WHERE resident_id=$5 RETURNING *';
    const r = await query(q, [name, age || null, address || null, contact || null, req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});

app.delete('/api/residents/:id', requireRole('admin'), async (req, res) => {
  await param('id').isInt().run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id', details: errors.array() });
  try {
    const r = await query('DELETE FROM residents WHERE resident_id=$1 RETURNING *', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true, row: r.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});

// Officials
app.get('/api/officials', async (req, res) => {
  try { const r = await query('SELECT * FROM officials ORDER BY official_id'); res.json(r.rows); } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});
app.post('/api/officials', requireRole('admin'), async (req, res) => {
  await body('name').isLength({ min: 1 }).run(req);
  await body('position').optional().isLength({ max: 255 }).run(req);
  await body('contact').optional().isLength({ max: 20 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { name, position, contact } = req.body;
  try { const r = await query('INSERT INTO officials (name, position, contact) VALUES ($1,$2,$3) RETURNING *', [name, position, contact]); res.json(r.rows[0]); } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});
app.put('/api/officials/:id', requireRole('admin'), async (req, res) => {
  await param('id').isInt().run(req);
  await body('name').isLength({ min: 1 }).run(req);
  await body('position').optional().isLength({ max: 255 }).run(req);
  await body('contact').optional().isLength({ max: 20 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { name, position, contact } = req.body;
  try { const r = await query('UPDATE officials SET name=$1, position=$2, contact=$3 WHERE official_id=$4 RETURNING *', [name, position, contact, req.params.id]); if (r.rowCount===0) return res.status(404).json({ error:'Not found' }); res.json(r.rows[0]); } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});
app.delete('/api/officials/:id', requireRole('admin'), async (req, res) => { try { const r = await query('DELETE FROM officials WHERE official_id=$1 RETURNING *', [req.params.id]); if (r.rowCount===0) return res.status(404).json({ error:'Not found' }); res.json({ deleted:true }); } catch (err) { console.error(err); res.status(500).json({ error:'Internal server error' }); } });

// Events
app.get('/api/events', async (req, res) => { try { const r = await query('SELECT * FROM events ORDER BY date DESC'); res.json(r.rows); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); } });
app.post('/api/events', requireRole(['admin','official']), async (req, res) => {
  await body('title').isLength({ min: 1 }).run(req);
  await body('date').optional().isISO8601().toDate().run(req);
  await body('time').optional().isString().run(req);
  await body('location').optional().isLength({ max: 255 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { title, date, time, location } = req.body;
  try { const r = await query('INSERT INTO events (title,date,time,location) VALUES ($1,$2,$3,$4) RETURNING *', [title,date,time,location]); res.json(r.rows[0]); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});
app.put('/api/events/:id', requireRole(['admin','official']), async (req, res) => {
  await param('id').isInt().run(req);
  await body('title').isLength({ min: 1 }).run(req);
  await body('date').optional().isISO8601().toDate().run(req);
  await body('time').optional().isString().run(req);
  await body('location').optional().isLength({ max: 255 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { title, date, time, location } = req.body;
  try { const r = await query('UPDATE events SET title=$1,date=$2,time=$3,location=$4 WHERE event_id=$5 RETURNING *', [title,date,time,location,req.params.id]); if (r.rowCount===0) return res.status(404).json({ error:'Not found' }); res.json(r.rows[0]); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});
app.delete('/api/events/:id', requireRole(['admin','official']), async (req, res) => {
  await param('id').isInt().run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id', details: errors.array() });
  try { const r = await query('DELETE FROM events WHERE event_id=$1 RETURNING *', [req.params.id]); if (r.rowCount===0) return res.status(404).json({ error:'Not found' }); res.json({ deleted:true }); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});

// Complaints
app.get('/api/complaints', async (req, res) => { try { const r = await query('SELECT * FROM complaints ORDER BY created_at DESC'); res.json(r.rows); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); } });
app.post('/api/complaints', async (req, res) => {
  await body('title').isLength({ min: 1 }).run(req);
  await body('details').isLength({ min: 1 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { title, details } = req.body;
  try { const r = await query('INSERT INTO complaints (title, details) VALUES ($1,$2) RETURNING *', [title, details]); res.json(r.rows[0]); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});
app.put('/api/complaints/:id', requireRole(['admin','official']), async (req, res) => {
  await param('id').isInt().run(req);
  await body('title').isLength({ min: 1 }).run(req);
  await body('details').isLength({ min: 1 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { title, details } = req.body;
  try { const r = await query('UPDATE complaints SET title=$1, details=$2 WHERE complaint_id=$3 RETURNING *', [title, details, req.params.id]); if (r.rowCount===0) return res.status(404).json({ error:'Not found' }); res.json(r.rows[0]); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});
app.delete('/api/complaints/:id', requireRole(['admin','official']), async (req, res) => {
  await param('id').isInt().run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id', details: errors.array() });
  try { const r = await query('DELETE FROM complaints WHERE complaint_id=$1 RETURNING *', [req.params.id]); if (r.rowCount===0) return res.status(404).json({ error:'Not found' }); res.json({ deleted:true }); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});

// Documents
app.get('/api/documents', async (req, res) => { try { const r = await query('SELECT * FROM documents ORDER BY created_at DESC'); res.json(r.rows); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); } });
app.post('/api/documents', requireRole(['admin','official']), async (req, res) => {
  await body('type').isLength({ min: 1 }).run(req);
  await body('resident').optional().isInt().run(req);
  await body('date').optional().isISO8601().run(req);
  await body('status').optional().isLength({ max: 50 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { type, resident, date, status } = req.body;
  try { const r = await query('INSERT INTO documents (type,resident,date,status) VALUES ($1,$2,$3,$4) RETURNING *', [type,resident,date,status||'Processing']); res.json(r.rows[0]); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});
app.put('/api/documents/:id', requireRole(['admin','official']), async (req, res) => {
  await param('id').isInt().run(req);
  await body('type').isLength({ min: 1 }).run(req);
  await body('resident').optional().isInt().run(req);
  await body('date').optional().isISO8601().run(req);
  await body('status').optional().isLength({ max: 50 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { type, resident, date, status } = req.body;
  try { const r = await query('UPDATE documents SET type=$1,resident=$2,date=$3,status=$4 WHERE document_id=$5 RETURNING *', [type,resident,date,status,req.params.id]); if (r.rowCount===0) return res.status(404).json({ error:'Not found' }); res.json(r.rows[0]); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});
app.delete('/api/documents/:id', requireRole('admin'), async (req, res) => {
  await param('id').isInt().run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id', details: errors.array() });
  try { const r = await query('DELETE FROM documents WHERE document_id=$1 RETURNING *', [req.params.id]); if (r.rowCount===0) return res.status(404).json({ error:'Not found' }); res.json({ deleted:true }); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});

// Simple health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve static files (the existing public/ folder)
app.use(express.static('public'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
