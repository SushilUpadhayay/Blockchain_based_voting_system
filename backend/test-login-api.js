const fs = require('fs');
const path = require('path');

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    console.error('❌ backend/.env not found!');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnv(path.join(__dirname, '.env'));
  const PORT = process.env.PORT || 5000;

  const url = `http://localhost:${PORT}/api/auth/login`;
  const email = 'supadhayay712@gmail.com';

  console.log('='.repeat(70));
  console.log('                 VOTER LOGIN API TEST');
  console.log('='.repeat(70));
  console.log(`Calling: POST ${url}`);
  console.log(`Payload: { email: "${email}" }`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const status = response.status;
    const body = await response.json();

    console.log(`\nResponse Status: ${status}`);
    console.log('Response Body  :', JSON.stringify(body, null, 2));
  } catch (err) {
    console.error('❌ Request failed:', err.message);
  }
}

main().catch(err => console.error(err));
