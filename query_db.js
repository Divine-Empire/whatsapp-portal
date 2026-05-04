const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split(/\r?\n/);
let SUPA_URL = '';
let SUPA_KEY = '';

for (const line of lines) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPA_URL = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=')) SUPA_KEY = line.split('=')[1].trim();
}

const supabase = createClient(SUPA_URL, SUPA_KEY);

async function check() {
  const { data: configs, error } = await supabase.from('whatsapp_configs').select('*');
  if (error) {
    console.error("Error fetching configs:", error);
  } else {
    console.log("whatsapp_configs contents:", configs);
  }
}

check();
