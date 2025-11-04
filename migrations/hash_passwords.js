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