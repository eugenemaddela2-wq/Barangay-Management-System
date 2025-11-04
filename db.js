const { Pool } = require('pg');

// Create a new pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    return { success: true, timestamp: result.rows[0].now };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Simple helper to run queries with retries
async function query(text, params, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      if (attempt === retries) throw err;
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.min(100 * Math.pow(2, attempt), 2000)));
    }
  }
}

module.exports = {
  query,
  testConnection,
  pool
};