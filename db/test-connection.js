// ============================
// Quick Connection Test
// Verify CockroachDB connection works
// ============================

require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL not found in .env file');
  process.exit(1);
}

console.log('Database URL (masked):', connectionString.replace(/:[^@]+@/, ':****@'));

const pool = new Pool({ connectionString });

async function testConnection() {
  try {
    console.log('\nAttempting connection to CockroachDB...');
    const client = await pool.connect();
    console.log('✓ Connection successful!');

    // Test query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✓ Query successful! Current time:', result.rows[0].current_time);

    // Check tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n✓ Tables found:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Count records in each table
    console.log('\n--- Record Counts ---');
    const tables = ['users', 'residents', 'officials', 'events', 'complaints', 'documents'];
    
    for (const table of tables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table}: ${countResult.rows[0].count} records`);
      } catch (err) {
        console.log(`${table}: (table does not exist yet)`);
      }
    }

    client.release();
    console.log('\n✓ All tests passed! Your database is ready.');
    process.exit(0);

  } catch (err) {
    console.error('\n✗ Connection failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your .env file has DATABASE_URL set');
    console.error('2. Verify the CockroachDB cluster is running');
    console.error('3. Ensure your IP is whitelisted in CockroachDB');
    console.error('4. Check the password and username in DATABASE_URL');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
