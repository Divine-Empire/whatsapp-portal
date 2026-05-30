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
  console.log("Checking tables...");
  
  const { data: contacts, error: err1 } = await supabase.from('whatsapp_portal_contacts').select('*').limit(1);
  if (err1) console.error("Contacts error:", err1.message);
  else console.log("Contacts sample row:", contacts);

  const { data: convs, error: err2 } = await supabase.from('whatsapp_portal_conversations').select('*').limit(1);
  if (err2) console.error("Conversations error:", err2.message);
  else console.log("Conversations sample row:", convs);

  const { data: messages, error: err3 } = await supabase.from('whatsapp_portal_messages').select('*').limit(1);
  if (err3) console.error("Messages error:", err3.message);
  else console.log("Messages sample row:", messages);
}

check();
