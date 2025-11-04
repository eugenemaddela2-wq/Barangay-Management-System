-- Migration to add password hash support and track sync
-- Run this on your database to upgrade schema

-- Backup users table
CREATE TABLE users_backup AS SELECT * FROM users;

-- Add modified timestamp to all tables for sync
ALTER TABLE residents ADD COLUMN IF NOT EXISTS modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE events ADD COLUMN IF NOT EXISTS modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE officials ADD COLUMN IF NOT EXISTS modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Modify users table for password hashing
BEGIN;

-- Temp column for hash
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);

-- Update trigger to maintain modified timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to all tables
CREATE TRIGGER update_residents_modified
    BEFORE UPDATE ON residents
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_documents_modified
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_events_modified
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_officials_modified
    BEFORE UPDATE ON officials
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_complaints_modified
    BEFORE UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_users_modified
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

COMMIT;

-- NOTE: After running this, use the following Node.js script to hash existing passwords:
/*
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function hashExistingPasswords() {
  const client = await pool.connect();
  try {
    // Get all users
    const { rows } = await client.query('SELECT id, password FROM users');
    
    // Hash each password
    for (const user of rows) {
      const hash = await bcrypt.hash(user.password, 10);
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [hash, user.id]
      );
    }

    // Switch to using password_hash
    await client.query(`
      ALTER TABLE users RENAME COLUMN password TO password_old;
      ALTER TABLE users RENAME COLUMN password_hash TO password;
    `);
    
    console.log('Password migration complete');
  } finally {
    client.release();
  }
}

hashExistingPasswords().catch(console.error);
*/