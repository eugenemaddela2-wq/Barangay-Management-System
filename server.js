require('dotenv').config();
const express = require('express');
const path = require('path');

// Try to load optional dependencies and provide safe fallbacks so the server can start
let cors;
try { cors = require('cors'); } catch (e) { cors = null; console.warn('Optional dependency "cors" not installed — using basic CORS headers fallback'); }

// bcrypt may require native build tools on some platforms; prefer bcrypt but fall back to bcryptjs if unavailable
let bcrypt;
try { bcrypt = require('bcrypt'); } catch (e) {
  try { bcrypt = require('bcryptjs'); console.warn('Using "bcryptjs" as a fallback for password hashing'); } catch (e2) { bcrypt = null; console.warn('No bcrypt available — password hashing features may be limited'); }
}
const db = require('./db'); // use centralized DB helper

const app = express();
// Use a web-friendly default port. 5432 is commonly used by Postgres and may conflict.
const PORT = process.env.PORT || 5000;

// Middleware
// Apply CORS: prefer the cors package when available, otherwise set basic headers
if (cors) {
  app.use(cors());
} else {
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });
}

// Use built-in Express body parsers (no body-parser dependency required)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Determine whether a DATABASE_URL is present
let useDatabase = false;
if (!process.env.DATABASE_URL) {
  console.log('⚠️  No DATABASE_URL found. Running in in-memory storage mode.');
} else {
  useDatabase = true;
  // Test DB connectivity
  db.query('SELECT NOW()')
    .then(res => console.log('✅ Database connected successfully at:', res.rows[0].now))
    .catch(err => {
      console.error('❌ Database connection error:', err);
      useDatabase = false;
    });
}

// In-memory storage (fallback when no database)
let storage = {
  residents: [
    { id: 1, name: 'Juan Dela Cruz', age: 35, address: 'Block 1 Lot 1', contact: '09123456789' },
    { id: 2, name: 'Maria Santos', age: 28, address: 'Block 2 Lot 5', contact: '09987654321' },
    { id: 3, name: 'Pedro Garcia', age: 42, address: 'Block 3 Lot 8', contact: '09456789123' }
  ],
  documents: [
    { id: 1, type: 'Barangay Clearance', resident: 'Juan Dela Cruz', date: '2024-01-15', status: 'Issued' },
    { id: 2, type: 'Certificate of Residency', resident: 'Maria Santos', date: '2024-01-20', status: 'Processing' },
    { id: 3, type: 'Business Permit', resident: 'Pedro Garcia', date: '2024-01-25', status: 'Issued' }
  ],
  officials: [
    { id: 1, name: 'Captain Roberto Cruz', position: 'Barangay Captain', contact: '09111222333' },
    { id: 2, name: 'Councilor Ana Reyes', position: 'Barangay Councilor', contact: '09444555666' },
    { id: 3, name: 'Secretary Linda Torres', position: 'Barangay Secretary', contact: '09777888999' }
  ],
  events: [
    { id: 1, title: 'Community Clean-up Drive', date: '2024-02-15', time: '08:00 AM', location: 'Barangay Hall' },
    { id: 2, title: 'Health and Wellness Seminar', date: '2024-02-20', time: '02:00 PM', location: 'Community Center' },
    { id: 3, title: 'Barangay Assembly Meeting', date: '2024-02-25', time: '07:00 PM', location: 'Barangay Hall' }
  ],
  complaints: [],
  users: [
    { username: 'admin1', password: 'adminpass1', role: 'admin' },
    { username: 'admin2', password: 'adminpass2', role: 'admin' },
    { username: 'demo', password: 'demopass', role: 'user' }
  ]
};

// API Routes

// Get all items from a collection
app.get('/api/:collection', async (req, res) => {
  const { collection } = req.params;
  
  if (useDatabase) {
    try {
      // NOTE: collection should be validated in production to avoid SQL injection.
      const result = await db.query(`SELECT * FROM ${collection} ORDER BY id`);
      res.json(result.rows);
    } catch (error) {
      console.error(`Error fetching ${collection}:`, error);
      res.status(500).json({ error: error.message });
    }
  } else {
    if (storage[collection]) {
      res.json(storage[collection]);
    } else {
      res.status(404).json({ error: 'Collection not found' });
    }
  }
});

// Get a single item by ID
app.get('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  
  if (useDatabase) {
    try {
      const result = await db.query(`SELECT * FROM ${collection} WHERE id = $1`, [id]);
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Item not found' });
      }
    } catch (error) {
      console.error(`Error fetching ${collection} item:`, error);
      res.status(500).json({ error: error.message });
    }
  } else {
    if (storage[collection]) {
      const item = storage[collection].find(i => String(i.id) === id);
      if (item) {
        res.json(item);
      } else {
        res.status(404).json({ error: 'Item not found' });
      }
    } else {
      res.status(404).json({ error: 'Collection not found' });
    }
  }
});

// Create a new item
app.post('/api/:collection', async (req, res) => {
  const { collection } = req.params;
  const data = req.body;
  
  if (useDatabase) {
    try {
      let query, values;
      
      switch(collection) {
        case 'residents':
          query = 'INSERT INTO residents (name, age, address, contact) VALUES ($1, $2, $3, $4) RETURNING *';
          values = [data.name, data.age, data.address, data.contact];
          break;
        case 'documents':
          query = 'INSERT INTO documents (type, resident, date, status) VALUES ($1, $2, $3, $4) RETURNING *';
          values = [data.type, data.resident, data.date, data.status];
          break;
        case 'officials':
          query = 'INSERT INTO officials (name, position, contact) VALUES ($1, $2, $3) RETURNING *';
          values = [data.name, data.position, data.contact];
          break;
        case 'events':
          query = 'INSERT INTO events (title, date, time, location) VALUES ($1, $2, $3, $4) RETURNING *';
          values = [data.title, data.date, data.time, data.location];
          break;
        case 'complaints':
          query = 'INSERT INTO complaints (title, details, date) VALUES ($1, $2, $3) RETURNING *';
          values = [data.title, data.details, data.date || new Date().toISOString().split('T')[0]];
          break;
        case 'users':
          query = 'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *';
          values = [data.username, data.password, data.role || 'user'];
          break;
        default:
          return res.status(400).json({ error: 'Invalid collection' });
      }
      
      const result = await db.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error(`Error creating ${collection} item:`, error);
      res.status(500).json({ error: error.message });
    }
  } else {
    if (storage[collection]) {
      const newItem = {
        id: Date.now(),
        ...data
      };
      storage[collection].push(newItem);
      res.status(201).json(newItem);
    } else {
      res.status(404).json({ error: 'Collection not found' });
    }
  }
});

// Update an item
app.put('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const data = req.body;
  
  if (useDatabase) {
    try {
      let query, values;
      
      switch(collection) {
        case 'residents':
          query = 'UPDATE residents SET name = $1, age = $2, address = $3, contact = $4 WHERE id = $5 RETURNING *';
          values = [data.name, data.age, data.address, data.contact, id];
          break;
        case 'documents':
          query = 'UPDATE documents SET type = $1, resident = $2, date = $3, status = $4 WHERE id = $5 RETURNING *';
          values = [data.type, data.resident, data.date, data.status, id];
          break;
        case 'officials':
          query = 'UPDATE officials SET name = $1, position = $2, contact = $3 WHERE id = $4 RETURNING *';
          values = [data.name, data.position, data.contact, id];
          break;
        case 'events':
          query = 'UPDATE events SET title = $1, date = $2, time = $3, location = $4 WHERE id = $5 RETURNING *';
          values = [data.title, data.date, data.time, data.location, id];
          break;
        case 'complaints':
          query = 'UPDATE complaints SET title = $1, details = $2, date = $3 WHERE id = $4 RETURNING *';
          values = [data.title, data.details, data.date, id];
          break;
        case 'users':
          query = 'UPDATE users SET username = $1, password = $2, role = $3 WHERE id = $4 RETURNING *';
          values = [data.username, data.password, data.role, id];
          break;
        default:
          return res.status(400).json({ error: 'Invalid collection' });
      }
      
      const result = await db.query(query, values);
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Item not found' });
      }
    } catch (error) {
      console.error(`Error updating ${collection} item:`, error);
      res.status(500).json({ error: error.message });
    }
  } else {
    if (storage[collection]) {
      const index = storage[collection].findIndex(i => String(i.id) === id);
      if (index !== -1) {
        storage[collection][index] = { ...storage[collection][index], ...data };
        res.json(storage[collection][index]);
      } else {
        res.status(404).json({ error: 'Item not found' });
      }
    } else {
      res.status(404).json({ error: 'Collection not found' });
    }
  }
});

// Delete an item
app.delete('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  
  if (useDatabase) {
    try {
      const result = await db.query(`DELETE FROM ${collection} WHERE id = $1 RETURNING *`, [id]);
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Item not found' });
      }
    } catch (error) {
      console.error(`Error deleting ${collection} item:`, error);
      res.status(500).json({ error: error.message });
    }
  } else {
    if (storage[collection]) {
      const index = storage[collection].findIndex(i => String(i.id) === id);
      if (index !== -1) {
        const deleted = storage[collection].splice(index, 1);
        res.json(deleted[0]);
      } else {
        res.status(404).json({ error: 'Item not found' });
      }
    } else {
      res.status(404).json({ error: 'Collection not found' });
    }
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (useDatabase) {
    try {
      const result = await db.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        res.json({ 
          success: true, 
          user: { username: user.username, role: user.role } 
        });
      } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    const user = storage.users.find(u => u.username === username && u.password === password);
    if (user) {
      res.json({ 
        success: true, 
        user: { username: user.username, role: user.role } 
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (useDatabase) {
    try {
      // Check if user exists
      const existing = await db.query('SELECT * FROM users WHERE username = $1', [username]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'User already exists' });
      }
      
      // Create user
      const userResult = await db.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
        [username, password, 'user']
      );
      
      // Create resident record
      await db.query(
        'INSERT INTO residents (name, age, address, contact) VALUES ($1, $2, $3, $4)',
        [username, 25, 'Barangay Resident', '09000000000']
      );
      
      const user = userResult.rows[0];
      res.status(201).json({ 
        success: true, 
        user: { username: user.username, role: user.role } 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    const existingUser = storage.users.find(u => u.username === username);
    if (existingUser) {
      res.status(400).json({ success: false, error: 'User already exists' });
    } else {
      const newUser = { username, password, role: 'user' };
      storage.users.push(newUser);
      
      // Create resident record
      const newResident = { 
        id: Date.now(), 
        name: username, 
        age: 25, 
        address: 'Barangay Resident', 
        contact: '09000000000' 
      };
      storage.residents.push(newResident);
      
      res.status(201).json({ 
        success: true, 
        user: { username: newUser.username, role: newUser.role } 
      });
    }
  }
});

// Initialize database with sample data
app.post('/api/init-database', async (req, res) => {
  if (!useDatabase) {
    return res.status(400).json({ error: 'Database not available' });
  }
  
  try {
    // Insert sample residents
    await db.query(
      'INSERT INTO residents (name, age, address, contact) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12) ON CONFLICT DO NOTHING',
      ['Juan Dela Cruz', 35, 'Block 1 Lot 1', '09123456789',
       'Maria Santos', 28, 'Block 2 Lot 5', '09987654321',
       'Pedro Garcia', 42, 'Block 3 Lot 8', '09456789123']
    );
    
    // Insert sample documents
    await db.query(
      'INSERT INTO documents (type, resident, date, status) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12) ON CONFLICT DO NOTHING',
      ['Barangay Clearance', 'Juan Dela Cruz', '2024-01-15', 'Issued',
       'Certificate of Residency', 'Maria Santos', '2024-01-20', 'Processing',
       'Business Permit', 'Pedro Garcia', '2024-01-25', 'Issued']
    );
    
    // Insert sample officials
    await db.query(
      'INSERT INTO officials (name, position, contact) VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9) ON CONFLICT DO NOTHING',
      ['Captain Roberto Cruz', 'Barangay Captain', '09111222333',
       'Councilor Ana Reyes', 'Barangay Councilor', '09444555666',
       'Secretary Linda Torres', 'Barangay Secretary', '09777888999']
    );
    
    // Insert sample events
    await db.query(
      'INSERT INTO events (title, date, time, location) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12) ON CONFLICT DO NOTHING',
      ['Community Clean-up Drive', '2024-02-15', '08:00 AM', 'Barangay Hall',
       'Health and Wellness Seminar', '2024-02-20', '02:00 PM', 'Community Center',
       'Barangay Assembly Meeting', '2024-02-25', '07:00 PM', 'Barangay Hall']
    );
    
    // Insert sample users
    await db.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9) ON CONFLICT (username) DO NOTHING',
      ['admin1', 'adminpass1', 'admin',
       'admin2', 'adminpass2', 'admin',
       'demo', 'demopass', 'user']
    );
    
    res.json({ success: true, message: 'Database initialized with sample data' });
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export all data
app.get('/api/export', async (req, res) => {
  if (useDatabase) {
    try {
      const residents = await db.query('SELECT * FROM residents');
      const documents = await db.query('SELECT * FROM documents');
      const events = await db.query('SELECT * FROM events');
      const officials = await db.query('SELECT * FROM officials');
      const complaints = await db.query('SELECT * FROM complaints');
      const users = await db.query('SELECT * FROM users');
      
      res.json({
        residents: residents.rows,
        documents: documents.rows,
        events: events.rows,
        officials: officials.rows,
        complaints: complaints.rows,
        users: users.rows
      });
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.json(storage);
  }
});

// Import all data
app.post('/api/import', async (req, res) => {
  const importedData = req.body;
  
  if (useDatabase) {
    try {
      // Clear existing data
      await db.query('TRUNCATE residents, documents, events, officials, complaints, users RESTART IDENTITY CASCADE');
      
      // Import residents
      if (importedData.residents && importedData.residents.length > 0) {
        for (const r of importedData.residents) {
          await db.query(
            'INSERT INTO residents (name, age, address, contact) VALUES ($1, $2, $3, $4)',
            [r.name, r.age, r.address, r.contact]
          );
        }
      }
      
      // Import documents
      if (importedData.documents && importedData.documents.length > 0) {
        for (const d of importedData.documents) {
          await db.query(
            'INSERT INTO documents (type, resident, date, status) VALUES ($1, $2, $3, $4)',
            [d.type, d.resident, d.date, d.status]
          );
        }
      }
      
      // Import events
      if (importedData.events && importedData.events.length > 0) {
        for (const e of importedData.events) {
          await db.query(
            'INSERT INTO events (title, date, time, location) VALUES ($1, $2, $3, $4)',
            [e.title, e.date, e.time, e.location]
          );
        }
      }
      
      // Import officials
      if (importedData.officials && importedData.officials.length > 0) {
        for (const o of importedData.officials) {
          await db.query(
            'INSERT INTO officials (name, position, contact) VALUES ($1, $2, $3)',
            [o.name, o.position, o.contact]
          );
        }
      }
      
      // Import complaints
      if (importedData.complaints && importedData.complaints.length > 0) {
        for (const c of importedData.complaints) {
          await db.query(
            'INSERT INTO complaints (title, details, date) VALUES ($1, $2, $3)',
            [c.title, c.details, c.date]
          );
        }
      }
      
      // Import users
      if (importedData.users && importedData.users.length > 0) {
        for (const u of importedData.users) {
          await db.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
            [u.username, u.password, u.role]
          );
        }
      }
      
      res.json({ success: true, message: 'Data imported successfully' });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    if (importedData.residents) storage.residents = importedData.residents;
    if (importedData.documents) storage.documents = importedData.documents;
    if (importedData.events) storage.events = importedData.events;
    if (importedData.officials) storage.officials = importedData.officials;
    if (importedData.complaints) storage.complaints = importedData.complaints;
    if (importedData.users) storage.users = importedData.users;
    res.json({ success: true, message: 'Data imported successfully' });
  }
});

// Serve static files from project root and set no-cache headers to prevent pages being shown after logout
app.use(express.static(path.join(__dirname), {
  setHeaders: function (res, filePath) {
    // Prevent browser caching of HTML pages to avoid back-button showing protected content after logout
    if (filePath.endsWith('.html') || filePath.endsWith('.htm')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
  }
}));

// Logout endpoint (client may call this to let server respond and ensure any server-side session cleared)
app.post('/logout', (req, res) => {
  // If using server-side sessions, clear them here. For now just send headers to prevent caching.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.json({ success: true });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    if (useDatabase) {
      await db.query('SELECT 1');
    }
    // Send a more detailed health status
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: useDatabase ? 'connected' : 'not-used',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Barangay Management System running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at /api/*\n`);
  
  if (useDatabase) {
    console.log('💾 Using PostgreSQL database for data storage');
  } else {
    console.log('💾 Using in-memory storage (data will be lost on restart)');
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Performing graceful shutdown...');
  server.close(() => {
    console.log('Server closed. Database connections are being terminated.');
    // Close database connection pool
    if (db.pool) {
      db.pool.end(() => {
        console.log('Database connections closed.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Keep the process running but log the error
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep the process running but log the error
});