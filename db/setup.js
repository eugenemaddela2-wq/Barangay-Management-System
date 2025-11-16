// ============================
// CockroachDB Setup Script
// Run this ONCE to initialize your database schema
// ============================

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL not found in .env file');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function setupDatabase() {
  let client;
  try {
    client = await pool.connect();
    console.log('✓ Connected to CockroachDB');

    // Read and execute init.sql
    const initSqlPath = path.join(__dirname, 'init.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    
    // Split by semicolon and execute statements
    const statements = initSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        console.log(`Executing: ${statement.substring(0, 60)}...`);
        await client.query(statement);
        console.log('✓ OK');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('✓ Already exists (skipped)');
        } else {
          console.error('✗ Error:', err.message);
        }
      }
    }

    // Generate a bcrypt hash for admin password 'admin123'
    console.log('\n--- Creating Admin User ---');
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    try {
      await client.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
        ['admin', hashedPassword, 'admin']
      );
      console.log('✓ Admin user created/verified (username: admin, password: admin123)');
    } catch (err) {
      console.log('✓ Admin user already exists');
    }

    // Verify data
    console.log('\n--- Verification ---');
    
    const usersResult = await client.query('SELECT user_id, username, role FROM users LIMIT 5');
    console.log('Users in database:', usersResult.rows);

    const residentsResult = await client.query('SELECT resident_id, name, contact FROM residents LIMIT 5');
    console.log('Residents in database:', residentsResult.rows);

    console.log('\n✓ Database setup complete!');
    console.log('You can now login with:');
    console.log('  Username: admin');
    console.log('  Password: admin123');

  } catch (err) {
    console.error('✗ Setup failed:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

setupDatabase();
