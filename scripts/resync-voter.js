/**
 * Emergency script: Re-register a voter directly on the current Hardhat node.
 * Run this after a Hardhat node restart wipes blockchain state.
 * Usage: node scripts/resync-voter.js <walletAddress>
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Manually parse backend/.env without dotenv dependency
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
loadEnv(path.join(__dirname, '../backend/.env'));

async function main() {
  const walletAddress = process.argv[2];
  if (!walletAddress) {
    console.error('Usage: node scripts/resync-voter.js <walletAddress>');
    process.exit(1);
  }

  const RPC_URL = 'http://127.0.0.1:8545';
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;

  if (!contractAddress || !privateKey) {
    console.error('CONTRACT_ADDRESS and PRIVATE_KEY must be set in backend/.env');
    process.exit(1);
  }

  console.log('Connecting to Hardhat node at', RPC_URL);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);

  const artifactPath = path.join(__dirname, '../artifacts/contracts/Voting.sol/Voting.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

  console.log(`Contract address : ${contractAddress}`);
  console.log(`Admin (deployer) : ${wallet.address}`);
  console.log(`Voter to sync    : ${walletAddress}`);

  // Check current status
  const isAlreadyRegistered = await contract.registeredVoters(walletAddress);
  if (isAlreadyRegistered) {
    console.log('\n✅ Voter is already registered on-chain. No action needed.');
    return;
  }

  console.log('\n⏳ Registering voter on-chain...');
  const tx = await contract.authorizeVoter(walletAddress);
  const receipt = await tx.wait();
  console.log(`✅ Voter registered! TxHash: ${receipt.hash}`);

  // Verify
  const confirmed = await contract.registeredVoters(walletAddress);
  console.log(`\nVerification - isVoterAuthorized: ${confirmed}`);
  console.log('\nThe voter can now log in.');
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
