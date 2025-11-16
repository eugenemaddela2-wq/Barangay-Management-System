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
const JWT_SECRET = process.env.JWT_SECRET || 'ahfW8NZg544KKubCXtheCPsIxjE97s06UjlAtIYlyiPT31b0m2';

// PostgreSQL/CockroachDB connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL not found in .env file');
  process.exit(1);
}

console.log('Connecting to CockroachDB...');
const pool = new Pool({ 
  connectionString,
  ssl: true // CockroachDB requires SSL
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('✓ Connected to CockroachDB');
    
    // Ensure `users` table has the columns expected by the app
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT true`);
    } catch (e) {
      // ignore if users table does not yet exist; other initialization will create it
    }
    
    // Create officials table
    await client.query(`
      CREATE TABLE IF NOT EXISTS officials (
        official_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        position VARCHAR(255),
        contact VARCHAR(100),
        email VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Officials table ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        event_id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        time TIME,
        location VARCHAR(255),
        created_by INTEGER REFERENCES users(user_id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Events table ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        complaint_id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        details TEXT,
        resident_id INTEGER REFERENCES residents(resident_id),
        status VARCHAR(50) DEFAULT 'Pending',
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Complaints table ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        document_id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255),
        resident_id INTEGER REFERENCES residents(resident_id),
        user_id INTEGER REFERENCES users(user_id),
        date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'Processing',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Documents table ready');
    // ensure user_id column exists for older DBs
    try {
      await client.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id)`);
    } catch (e) {
      // ignore
    }

    // Profiles table to store extended user profile fields
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
        first_name VARCHAR(100),
        middle_name VARCHAR(100),
        last_name VARCHAR(100),
        age INTEGER,
        birth_date DATE,
        gender VARCHAR(20),
        civil_status VARCHAR(50),
        address VARCHAR(255),
        contact_number VARCHAR(100),
        email VARCHAR(255),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Profiles table ready');

    // Revoked tokens table for logout/token revocation
    await client.query(`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        token TEXT PRIMARY KEY,
        expires_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log('✓ Revoked tokens table ready');

    // Insert default admin
    const adminHash = bcrypt.hashSync('admin123', 10);
    try {
      await client.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
        ['admin', adminHash, 'admin']
      );
      console.log('✓ Admin user ready (username: admin, password: admin123)');
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.log('✓ Admin user already exists');
      }
    }

    // Insert sample resident
    try {
      await client.query(
        'INSERT INTO residents (name, age, address, contact, email) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        ['Juan Dela Cruz', 35, '123 Main St, Barangay 1', '09123456789', 'juan@example.com']
      );
      console.log('✓ Sample resident ready');
    } catch (err) {
      console.log('✓ Sample resident already exists');
    }

    // Insert sample official
    try {
      await client.query(
        'INSERT INTO officials (name, position, contact, email) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        ['Maria Santos', 'Barangay Captain', '09112233445', 'maria@example.com']
      );
      console.log('✓ Sample official ready');
    } catch (err) {
      console.log('✓ Sample official already exists');
    }

    // Clean up duplicate residents (keep only the first occurrence)
    try {
      const dupCheck = await client.query(`
        SELECT resident_id, name, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY resident_id) as rn 
        FROM residents
      `);
      const toDelete = dupCheck.rows.filter(row => row.rn > 1).map(row => row.resident_id);
      
      if (toDelete.length > 0) {
        for (const id of toDelete) {
          await client.query('DELETE FROM residents WHERE resident_id = $1', [id]);
        }
        console.log(`✓ Cleaned up ${toDelete.length} duplicate resident(s)`);
      }
    } catch (err) {
      console.log('Note: Duplicate cleanup skipped (may not be needed)');
    }

    // Clean up duplicate officials (keep only the first occurrence)
    try {
      const dupCheckOff = await client.query(`
        SELECT official_id, name, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY official_id) as rn 
        FROM officials
      `);
      const toDeleteOff = dupCheckOff.rows.filter(row => row.rn > 1).map(row => row.official_id);
      
      if (toDeleteOff.length > 0) {
        for (const id of toDeleteOff) {
          await client.query('DELETE FROM officials WHERE official_id = $1', [id]);
        }
        console.log(`✓ Cleaned up ${toDeleteOff.length} duplicate official(s)`);
      }
    } catch (err) {
      console.log('Note: Official duplicate cleanup skipped (may not be needed)');
    }

  } catch (err) {
    console.error('ERROR during database initialization:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

// Server-Sent Events clients
const sseClients = new Set();

function broadcastChange(eventType, payload) {
  const msg = JSON.stringify({ type: eventType, payload });
  for (const res of sseClients) {
    try {
      res.write(`data: ${msg}\n\n`);
    } catch (e) {
      // ignore write errors
    }
  }
}

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  res.write('\n');
  sseClients.add(res);
  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Helper: generate token
function generateToken(user) {
  return jwt.sign({ user_id: user.user_id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
}

// Middleware: authenticate token (checks revoked tokens)
async function authenticateToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return next();
  const parts = auth.split(' ');
  if (parts.length !== 2) return next();
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // check revoked tokens table
    try {
      const r = await query('SELECT token FROM revoked_tokens WHERE token = $1', [token]);
      if (r.rowCount > 0) {
        // token was revoked
        return next();
      }
    } catch (dbErr) {
      console.error('Error checking revoked tokens', dbErr);
      // fall through and allow token if DB check failed
    }

    req.user = payload;
  } catch (err) {
    // invalid or expired token - ignore
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
  const { username, password, role, full_name, firstName, middleName, lastName, age, address, contactNumber, email } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    // create user as unapproved by default
    const q = 'INSERT INTO users (username, password, full_name, role, approved) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, username, full_name, role, approved';
    const r = await query(q, [username, hashed, full_name || null, role || 'resident', false]);
    const user = r.rows[0];

    // create profile row (optional fields)
    try {
      await query('INSERT INTO profiles (user_id, first_name, middle_name, last_name, age, address, contact_number, email) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (user_id) DO UPDATE SET first_name=EXCLUDED.first_name, middle_name=EXCLUDED.middle_name, last_name=EXCLUDED.last_name, age=EXCLUDED.age, address=EXCLUDED.address, contact_number=EXCLUDED.contact_number, email=EXCLUDED.email, updated_at = CURRENT_TIMESTAMP', [user.user_id, firstName||null, middleName||null, lastName||null, age ? parseInt(age,10) : null, address||null, contactNumber||null, email||null]);
    } catch (profErr) {
      console.error('Profile insert failed during register', profErr);
    }

    // broadcast user created so admin can see pending
    try { broadcastChange('user_created', user); } catch(e){}

    // do not auto-login - return pending response
    res.status(201).json({ message: 'Registration submitted and pending approval', user });
  } catch (err) {
    if (err.code === '23505') {
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
    const q = 'SELECT user_id, username, password, role, approved FROM users WHERE username=$1';
    const r = await query(q, [username]);
    if (r.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = r.rows[0];
    if (!user.approved) return res.status(403).json({ error: 'Account pending approval' });
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

app.post('/api/auth/refresh', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Invalid or missing token' });
  try {
    const payload = { user_id: req.user.user_id, username: req.user.username, role: req.user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not refresh token' });
  }
});

// Logout (revoke token)
app.post('/api/auth/logout', async (req, res) => {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(400).json({ error: 'Missing Authorization header' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(400).json({ error: 'Invalid Authorization header' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const expiresAt = new Date(payload.exp * 1000).toISOString();
    try {
      await query('INSERT INTO revoked_tokens (token, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING', [token, expiresAt]);
    } catch (dbErr) {
      console.error('Failed to insert revoked token', dbErr);
      return res.status(500).json({ error: 'Could not revoke token' });
    }
    return res.json({ ok: true });
  } catch (err) {
    // token invalid/expired - still respond ok to remove client state
    return res.json({ ok: true });
  }
});

// Get current user + profile
app.get('/api/me', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const userQ = await query('SELECT user_id, username, full_name, role, approved, created_at FROM users WHERE user_id = $1', [req.user.user_id]);
    if (userQ.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    const user = userQ.rows[0];
    const profQ = await query('SELECT first_name, middle_name, last_name, age, birth_date, gender, civil_status, address, contact_number, email FROM profiles WHERE user_id = $1', [req.user.user_id]);
    const profile = profQ.rowCount ? profQ.rows[0] : {};
    res.json({ user, profile });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});

// Update current user's account and profile
app.put('/api/me', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = req.user.user_id;
  const { username, password, full_name, firstName, middleName, lastName, age, birthDate, gender, civilStatus, address, contactNumber, email } = req.body;
  try {
    // validations
    if (username !== undefined && String(username).length < 3) return res.status(400).json({ error: 'Username too short' });
    if (password !== undefined && String(password).length < 6) return res.status(400).json({ error: 'Password too short' });

    const updates = [];
    const values = [];
    let idx = 1;

    if (username !== undefined) {
      // ensure username not used by other user
      const check = await query('SELECT user_id FROM users WHERE username=$1 AND user_id<>$2', [username, userId]);
      if (check.rowCount > 0) return res.status(409).json({ error: 'Username already exists' });
      updates.push(`username = $${idx++}`);
      values.push(username);
    }
    if (full_name !== undefined) {
      updates.push(`full_name = $${idx++}`);
      values.push(full_name);
    }
    if (password !== undefined) {
      const hashed = await bcrypt.hash(password, 10);
      updates.push(`password = $${idx++}`);
      values.push(hashed);
    }

    if (updates.length > 0) {
      values.push(userId);
      const q = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = $${idx} RETURNING user_id, username, full_name, role, approved`;
      const r = await query(q, values);
      if (r.rowCount === 0) return res.status(404).json({ error: 'User not found' });
      // update user object
    }

    // profile upsert
    const profileFields = { first_name: firstName, middle_name: middleName, last_name: lastName, age: age ? parseInt(age,10) : null, birth_date: birthDate || null, gender: gender || null, civil_status: civilStatus || null, address: address || null, contact_number: contactNumber || null, email: email || null };
    const profCols = Object.keys(profileFields);
    const profValues = Object.values(profileFields);
    // build insert with ON CONFLICT DO UPDATE
    const profParams = profValues.map((_, i) => `$${i+1}`).join(', ');
    const updateAssignments = profCols.map((c, i) => `${c} = EXCLUDED.${c}`).join(', ');
    // include user_id as first param
    try {
      await query(`INSERT INTO profiles (user_id, ${profCols.join(', ')}) VALUES ($${profCols.length+1}, ${profParams}) ON CONFLICT (user_id) DO UPDATE SET ${updateAssignments}, updated_at = CURRENT_TIMESTAMP`, [...profValues, userId]);
    } catch (profErr) {
      console.error('Profile upsert failed', profErr);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    // return fresh data
    const userQ2 = await query('SELECT user_id, username, full_name, role, approved, created_at FROM users WHERE user_id = $1', [userId]);
    const profQ2 = await query('SELECT first_name, middle_name, last_name, age, birth_date, gender, civil_status, address, contact_number, email FROM profiles WHERE user_id = $1', [userId]);
    const resp = { user: userQ2.rows[0], profile: profQ2.rowCount ? profQ2.rows[0] : {} };
    // broadcast profile update
    try { broadcastChange('profile_updated', { user: resp.user, profile: resp.profile }); } catch (e) {}
    res.json(resp);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});

// User management (admin only)
app.get('/api/users', requireRole('admin'), async (req, res) => {
  try {
    const r = await query('SELECT user_id, username, full_name, role, approved, created_at FROM users ORDER BY user_id');
    res.json(r.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});

app.post('/api/users', requireRole('admin'), async (req, res) => {
  await body('username').isLength({ min: 3 }).run(req);
  await body('password').isLength({ min: 6 }).run(req);
  await body('role').isIn(['resident','official','admin']).optional().run(req);
  await body('full_name').optional().isLength({ max: 255 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { username, password, role, full_name } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const r = await query('INSERT INTO users (username,password,full_name,role) VALUES ($1,$2,$3,$4) RETURNING user_id, username, full_name, role, approved', [username, hashed, full_name || null, role||'resident']);
    res.json(r.rows[0]);
    try { broadcastChange('user_created', r.rows[0]); } catch(e){}
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username exists' });
    console.error(err); res.status(500).json({ error: 'Internal error' });
  }
});

app.put('/api/users/:id', requireRole('admin'), async (req, res) => {
  const { role, approved, username, full_name, password } = req.body;
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username !== undefined) {
      await body('username').isLength({ min: 3 }).run(req);
    }
    if (full_name !== undefined) {
      await body('full_name').isLength({ max: 255 }).run(req);
    }
    if (password !== undefined) {
      await body('password').isLength({ min: 6 }).run(req);
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    if (username !== undefined) {
      // ensure username not used by other user
      const check = await query('SELECT user_id FROM users WHERE username=$1 AND user_id<>$2', [username, req.params.id]);
      if (check.rowCount > 0) return res.status(409).json({ error: 'Username already exists' });
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(full_name);
    }
    if (password !== undefined) {
      const hashed = await bcrypt.hash(password, 10);
      updates.push(`password = $${paramCount++}`);
      values.push(hashed);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (approved !== undefined) {
      updates.push(`approved = $${paramCount++}`);
      values.push(approved);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });

    values.push(req.params.id);
    const q = `UPDATE users SET ${updates.join(', ')} , updated_at = CURRENT_TIMESTAMP WHERE user_id = $${paramCount} RETURNING user_id, username, full_name, role, approved`;
    const r = await query(q, values);

    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
    try { broadcastChange('user_updated', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});

// Get single user (admin)
app.get('/api/users/:id', requireRole('admin'), async (req, res) => {
  try {
    const r = await query('SELECT user_id, username, full_name, role, approved, created_at FROM users WHERE user_id=$1', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});

app.delete('/api/users/:id', requireRole('admin'), async (req, res) => {
  try {
    const r = await query('DELETE FROM users WHERE user_id=$1 RETURNING user_id, username', [req.params.id]);
    if (r.rowCount===0) return res.status(404).json({ error:'Not found' });
    res.json({ deleted: true });
    try { broadcastChange('user_deleted', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error:'Internal error' }); }
});

// Residents CRUD
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
    try { broadcastChange('resident_created', r.rows[0]); } catch(e){}
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
    try { broadcastChange('resident_updated', r.rows[0]); } catch(e){}
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
    try { broadcastChange('resident_deleted', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});

// Officials CRUD
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
  try {
    const r = await query('INSERT INTO officials (name, position, contact) VALUES ($1,$2,$3) RETURNING *', [name, position, contact]);
    res.json(r.rows[0]);
    try { broadcastChange('official_created', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});
app.put('/api/officials/:id', requireRole('admin'), async (req, res) => {
  await param('id').isInt().run(req);
  await body('name').isLength({ min: 1 }).run(req);
  await body('position').optional().isLength({ max: 255 }).run(req);
  await body('contact').optional().isLength({ max: 20 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { name, position, contact } = req.body;
  try {
    const r = await query('UPDATE officials SET name=$1, position=$2, contact=$3 WHERE official_id=$4 RETURNING *', [name, position, contact, req.params.id]);
    if (r.rowCount===0) return res.status(404).json({ error:'Not found' });
    res.json(r.rows[0]);
    try { broadcastChange('official_updated', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal error' }); }
});
app.delete('/api/officials/:id', requireRole('admin'), async (req, res) => {
  try {
    const r = await query('DELETE FROM officials WHERE official_id=$1 RETURNING *', [req.params.id]);
    if (r.rowCount===0) return res.status(404).json({ error:'Not found' });
    res.json({ deleted:true });
    try { broadcastChange('official_deleted', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error:'Internal error' }); }
});

// Events CRUD
app.get('/api/events', async (req, res) => { try { const r = await query('SELECT * FROM events ORDER BY date DESC'); res.json(r.rows); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); } });
app.post('/api/events', requireRole(['admin','official']), async (req, res) => {
  await body('title').isLength({ min: 1 }).run(req);
  await body('date').optional().isISO8601().toDate().run(req);
  await body('time').optional().isString().run(req);
  await body('location').optional().isLength({ max: 255 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { title, date, time, location } = req.body;
  try {
    const r = await query('INSERT INTO events (title,date,time,location) VALUES ($1,$2,$3,$4) RETURNING *', [title,date,time,location]);
    res.json(r.rows[0]);
    try { broadcastChange('event_created', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
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
  try {
    const r = await query('UPDATE events SET title=$1,date=$2,time=$3,location=$4 WHERE event_id=$5 RETURNING *', [title,date,time,location,req.params.id]);
    if (r.rowCount===0) return res.status(404).json({ error:'Not found' });
    res.json(r.rows[0]);
    try { broadcastChange('event_updated', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});
app.delete('/api/events/:id', requireRole(['admin','official']), async (req, res) => {
  await param('id').isInt().run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id', details: errors.array() });
  try {
    const r = await query('DELETE FROM events WHERE event_id=$1 RETURNING *', [req.params.id]);
    if (r.rowCount===0) return res.status(404).json({ error:'Not found' });
    res.json({ deleted:true });
    try { broadcastChange('event_deleted', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});

// Complaints CRUD
app.get('/api/complaints', async (req, res) => { try { const r = await query('SELECT * FROM complaints ORDER BY created_at DESC'); res.json(r.rows); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); } });
app.post('/api/complaints', async (req, res) => {
  await body('title').isLength({ min: 1 }).run(req);
  await body('details').isLength({ min: 1 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { title, details } = req.body;
  try {
    const r = await query('INSERT INTO complaints (title, details) VALUES ($1,$2) RETURNING *', [title, details]);
    res.json(r.rows[0]);
    try { broadcastChange('complaint_created', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});
app.put('/api/complaints/:id', requireRole(['admin','official']), async (req, res) => {
  await param('id').isInt().run(req);
  await body('title').isLength({ min: 1 }).run(req);
  await body('details').isLength({ min: 1 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { title, details } = req.body;
  try {
    const r = await query('UPDATE complaints SET title=$1, details=$2 WHERE complaint_id=$3 RETURNING *', [title, details, req.params.id]);
    if (r.rowCount===0) return res.status(404).json({ error:'Not found' });
    res.json(r.rows[0]);
    try { broadcastChange('complaint_updated', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});
app.delete('/api/complaints/:id', requireRole(['admin','official']), async (req, res) => {
  await param('id').isInt().run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id', details: errors.array() });
  try {
    const r = await query('DELETE FROM complaints WHERE complaint_id=$1 RETURNING *', [req.params.id]);
    if (r.rowCount===0) return res.status(404).json({ error:'Not found' });
    res.json({ deleted:true });
    try { broadcastChange('complaint_deleted', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});

// Documents CRUD
app.get('/api/documents', async (req, res) => { try { const r = await query('SELECT * FROM documents ORDER BY created_at DESC'); res.json(r.rows); } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); } });
app.post('/api/documents', requireRole(['admin','official']), async (req, res) => {
  await body('type').isLength({ min: 1 }).run(req);
  await body('resident').optional().isInt().run(req);
  await body('date').optional().isISO8601().run(req);
  await body('status').optional().isLength({ max: 50 }).run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  const { type, resident, date, status } = req.body;
  try {
    const r = await query('INSERT INTO documents (type,resident,date,status) VALUES ($1,$2,$3,$4) RETURNING *', [type,resident,date,status||'Processing']);
    res.json(r.rows[0]);
    try { broadcastChange('document_created', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
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
  try {
    const r = await query('UPDATE documents SET type=$1,resident=$2,date=$3,status=$4 WHERE document_id=$5 RETURNING *', [type,resident,date,status,req.params.id]);
    if (r.rowCount===0) return res.status(404).json({ error:'Not found' });
    res.json(r.rows[0]);
    try { broadcastChange('document_updated', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});
app.delete('/api/documents/:id', requireRole('admin'), async (req, res) => {
  await param('id').isInt().run(req);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id', details: errors.array() });
  try {
    const r = await query('DELETE FROM documents WHERE document_id=$1 RETURNING *', [req.params.id]);
    if (r.rowCount===0) return res.status(404).json({ error:'Not found' });
    res.json({ deleted:true });
    try { broadcastChange('document_deleted', r.rows[0]); } catch(e){}
  } catch (err) { console.error(err); res.status(500).json({ error:'Internal' }); }
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, database: 'cockroachdb' }));

// Serve static files
app.use(express.static('public'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start
(async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`\n🚀 Server started on port ${PORT}`);
      console.log(`📋 Frontend:    http://localhost:${PORT}`);
      console.log(`🔐 Login:       http://localhost:${PORT}/login.html`);
      console.log(`👨‍💼 Admin Panel:  http://localhost:${PORT}/admin/admin.html`);
      console.log(`\n🔑 Test Credentials:`);
      console.log(`   Admin:     username=admin, password=admin123`);
      console.log(`   Resident:  Create from register form`);
      console.log(`\n✓ Database: CockroachDB\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
