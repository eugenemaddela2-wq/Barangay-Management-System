const { Client } = require('pg');
(async ()=>{
  const cs = 'postgresql://bms_db:2j0aUmamiZXRKjOHLQenl9WRdMdlsFpI@dpg-d43ik82dbo4c73al580g-a.oregon-postgres.render.com/bms_db_odxy';
  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try{
    await client.connect();
    const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    const tables = tablesRes.rows.map(r=>r.table_name);
    for(const t of tables){
      const cols = await client.query('SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position',[t]);
      console.log(t+':', cols.rows.map(r=>r.column_name));
    }
    await client.end();
  }catch(e){console.error('err',e.message); try{await client.end();}catch(_){} }
})();