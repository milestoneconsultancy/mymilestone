const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
let env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  const k = parts[0];
  const v = parts.slice(1).join('=');
  if (k && v) env[k.trim()] = v.trim().replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const client = createClient(url, key);
async function check() {
  const { data, error } = await client.from('app_releases').select('*');
  console.log('app_releases exists:', !error, error?.message || 'OK');
}
check();
