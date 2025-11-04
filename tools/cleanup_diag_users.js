const { Client } = require('pg');
(async ()=>{
  const cs = 'postgresql://bms_db:2j0aUmamiZXRKjOHLQenl9WRdMdlsFpI@dpg-d43ik82dbo4c73al580g-a.oregon-postgres.render.com/bms_db_odxy';
  const c = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try{
    await c.connect();
    const res = await c.query("DELETE FROM users WHERE username LIKE 'diag_render_user_%' RETURNING users_id, username");
    console.log('deleted rows:', res.rows);
    await c.end();
  }catch(e){console.error('err', e.message); try{await c.end();}catch(_){} }
})();