const mongoose = require('mongoose');
const { ethers } = require('ethers');
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
  const RPC_URL = 'http://127.0.0.1:8545';
  const contractAddress = process.env.CONTRACT_ADDRESS;

  await mongoose.connect(MONGO_URI);
  console.log(`Contract Address in env: ${contractAddress}`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const abiPath = path.join(__dirname, 'src/config/contractABI.json');
  const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  const abi = artifact.abi ? artifact.abi : artifact;
  const contract = new ethers.Contract(contractAddress, abi, provider);

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

  const email = 'aakashsharma0254@gmail.com';
  const user = await User.findOne({ email });

  if (!user) {
    console.log(`❌ User not found: ${email}`);
  } else {
    console.log(`User: ${user.get('name')} (${user.get('email')})`);
    console.log(`  Role           : ${user.get('role')}`);
    console.log(`  DB Status      : ${user.get('status')}`);
    console.log(`  Wallet Address : ${user.get('walletAddress')}`);
    
    if (user.get('walletAddress')) {
      const isRegistered = await contract.registeredVoters(user.get('walletAddress'));
      console.log(`  On-Chain Status: ${isRegistered ? '✅ Authorized' : '❌ NOT Authorized'}`);
      
      const adminAddress = await contract.admin();
      console.log(`  Contract Admin : ${adminAddress}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(err => console.error(err));
