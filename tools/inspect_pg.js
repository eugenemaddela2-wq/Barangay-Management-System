const { Client } = require('pg');
(async ()=>{
  const cs = 'postgresql://bms_db:2j0aUmamiZXRKjOHLQenl9WRdMdlsFpI@dpg-d43ik82dbo4c73al580g-a.oregon-postgres.render.com/bms_db_odxy';
  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('connected to pg');
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('tables:', tables.rows.map(r=>r.table_name));
    const cols = await client.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
    console.log('users columns:', cols.rows);
    try {
      const sample = await client.query('SELECT * FROM users LIMIT 5');
      console.log('users sample rows:', sample.rows);
    } catch (e) {
      console.error('select users failed:', e.message);
    }
    await client.end();
  } catch (err) {
    console.error('pg err', err.message);
    try { await client.end(); } catch(e){}
  }
})();