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
console.log('Using URL:', url, 'Key prefix:', key ? key.substring(0, 15) : 'none');
const client = createClient(url, key);
async function check() {
  const { data: companies, error: ce } = await client.from('companies').select('*');
  console.log('Companies:', companies ? companies.length : 0, ce?.message || 'OK');
  if (companies && companies.length) console.log('Company:', companies[0]);
  const { data: profiles, error: pe } = await client.from('profiles').select('*');
  console.log('Profiles:', profiles ? profiles.length : 0, pe?.message || 'OK');
  if (profiles && profiles.length) console.log('Profile:', profiles[0]);
  const { data: masters, error: me } = await client.from('masters').select('*');
  console.log('Masters:', masters ? masters.length : 0, me?.message || 'OK');
}
check();
