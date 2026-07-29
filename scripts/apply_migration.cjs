const fs = require('fs');
const { Client } = require('pg');

function parseEnv(path) {
  const txt = fs.readFileSync(path, 'utf8');
  const out = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  const env = parseEnv('.env');
  const conn = env.DATABASE_CONNECTION_STRING;
  if (!conn) {
    console.error('Missing DATABASE_CONNECTION_STRING in .env');
    process.exit(1);
  }

  const sql = fs.readFileSync('supabase/migrations/20260729123000_add_greenbook_raw.sql', 'utf8');

  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    console.log('Connected, applying migration...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration applied successfully');
  } catch (e) {
    console.error('Migration failed:', e.message);
    try { await client.query('ROLLBACK'); } catch (er) {}
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
