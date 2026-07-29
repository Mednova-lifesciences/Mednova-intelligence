const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function parseEnv(pathfile) {
  const txt = fs.readFileSync(pathfile, 'utf8');
  const out = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  const env = parseEnv('.env');
  const argv = require('minimist')(process.argv.slice(2));
  const SUPABASE_URL = argv.url || process.env.SUPABASE_URL || env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = argv.key || process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment or .env');
    process.exit(1);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { fetch },
  });

  const bundlePath = path.resolve('dist/greenbook-sync.cjs');
  if (!fs.existsSync(bundlePath)) {
    console.error('Bundle not found:', bundlePath);
    process.exit(1);
  }

  const mod = require(bundlePath);
  if (!mod.runGreenBookSync) {
    console.error('runGreenBookSync not exported from bundle');
    process.exit(1);
  }

  try {
    console.log('Starting live sync...');
    const res = await mod.runGreenBookSync(supabaseAdmin);
    console.log('Sync result:', res);
  } catch (e) {
    console.error('Sync error:', e && e.message ? e.message : e);
    process.exitCode = 1;
  }
}

main();
