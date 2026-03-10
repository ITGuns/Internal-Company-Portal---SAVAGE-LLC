require('dotenv/config');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Check UserRole columns
  const res = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'UserRole'"
  );
  console.log('UserRole columns:', res.rows.map(r => r.column_name));

  // Check User columns
  const res2 = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'User'"
  );
  console.log('User columns:', res2.rows.map(r => r.column_name));

  // Try a direct query to check if the issue is with User or UserRole
  try {
    const res3 = await pool.query("SELECT id, role, \"userId\", \"departmentId\" FROM \"UserRole\" WHERE \"userId\" = (SELECT id FROM \"User\" WHERE email = 'admin@savage.com') LIMIT 5");
    console.log('UserRole rows:', res3.rows);
  } catch (e) {
    console.error('Direct query error:', e.message);
  }

  pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
