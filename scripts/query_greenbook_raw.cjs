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
  const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !KEY) {
    console.error('Missing SUPABASE_URL or publishable key in .env');
    process.exit(1);
  }

  const url = new URL('/rest/v1/greenbook_raw?select=nafdac_product_id,nafdac_number,checksum,created_at&limit=5&order=created_at.desc', SUPABASE_URL).toString();

  const options = {
    headers: {
      apikey: KEY,
      Accept: 'application/json',
    },
  };

  https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));
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
