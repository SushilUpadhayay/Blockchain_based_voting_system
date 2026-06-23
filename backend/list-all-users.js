const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
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

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/voting-backend';
  await mongoose.connect(MONGO_URI);

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

  const users = await User.find({});
  console.log('='.repeat(70));
  console.log(`TOTAL USERS IN DB: ${users.length}`);
  console.log('='.repeat(70));

  for (const u of users) {
    console.log(`ID       : ${u._id}`);
    console.log(`Name     : ${u.get('name')}`);
    console.log(`Email    : ${u.get('email')}`);
    console.log(`Role     : ${u.get('role')}`);
    console.log(`Status   : ${u.get('status')}`);
    console.log(`Wallet   : ${u.get('walletAddress')}`);
    console.log('-'.repeat(50));
  }

  await mongoose.disconnect();
}

main().catch(err => console.error(err));
