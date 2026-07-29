const fs = require('fs');
const https = require('https');

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
  const SUPABASE_URL = env.SUPABASE_URL;
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const url = new URL('/rest/v1/sync_history?select=*&order=created_at.desc&limit=5', SUPABASE_URL).toString();

  const options = {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      Accept: 'application/json',
    },
  };

  https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const safe = json.map((r) => ({ id: r.id, status: r.status, records_added: r.records_added, records_updated: r.records_updated, message: r.message, created_at: r.created_at }));
        console.log(JSON.stringify(safe, null, 2));
      } catch (e) {
        console.error('Failed to parse response', e.message);
        console.log(data);
      }
    });
  }).on('error', (e) => {
    console.error('Request error', e.message);
  });
}

main();
