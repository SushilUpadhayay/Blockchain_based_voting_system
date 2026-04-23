const { ethers } = require('ethers');

// ── Configuration ─────────────────────────────────────────────────────────────
const RPC_URL = 'http://127.0.0.1:8545';
const contractAddress = process.env.CONTRACT_ADDRESS;

// ── Lazy Contract Instance ────────────────────────────────────────────────────
// We initialize the contract on first use rather than at module load.
// This prevents server startup crashes if the Hardhat node is not running.
let _contract = null;

const getContract = async () => {
  if (_contract) return _contract;

  try {
    const artifact = require('../config/contractABI.json');
    const abi = artifact.abi ? artifact.abi : artifact;

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    _contract = new ethers.Contract(contractAddress, abi, wallet);
    return _contract;
  } catch (error) {
    throw new Error(
      `Blockchain service unavailable. Ensure the Hardhat node is running and CONTRACT_ADDRESS / PRIVATE_KEY are set. (${error.message})`
    );
  }
};

// ── Service Functions ─────────────────────────────────────────────────────────

const registerVoterOnChain = async (walletAddress) => {
  try {
    const contract = await getContract();

    if (!contract.interface.getFunction('authorizeVoter')) {
      throw new Error('authorizeVoter function not found in ABI');
    }

    const tx = await contract.authorizeVoter(walletAddress);
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
    };
  } catch (error) {
    console.error('[BlockchainService] registerVoterOnChain error:', error.message);
    throw new Error('Blockchain registration failed: ' + error.message);
  }
};

const addCandidateOnChain = async (name) => {
  try {
    const contract = await getContract();

    if (!contract.interface.getFunction('addCandidate')) {
      throw new Error('addCandidate function not found in ABI');
    }

    const tx = await contract.addCandidate(name);
    return await tx.wait();
  } catch (error) {
    console.error('[BlockchainService] addCandidateOnChain error:', error.message);
    throw new Error('Blockchain addCandidate failed: ' + error.message);
  }
};

const startElectionOnChain = async () => {
  try {
    const contract = await getContract();

    if (!contract.interface.getFunction('startElection')) {
      throw new Error('startElection function not found in ABI');
    }

    const tx = await contract.startElection();
    return await tx.wait();
  } catch (error) {
    console.error('[BlockchainService] startElectionOnChain error:', error.message);
    throw new Error('Blockchain startElection failed: ' + error.message);
  }
};

const endElectionOnChain = async () => {
  try {
    const contract = await getContract();

    if (!contract.interface.getFunction('endElection')) {
      throw new Error('endElection function not found in ABI');
    }

    const tx = await contract.endElection();
    return await tx.wait();
  } catch (error) {
    console.error('[BlockchainService] endElectionOnChain error:', error.message);
    throw new Error('Blockchain endElection failed: ' + error.message);
  }
};

module.exports = {
  registerVoterOnChain,
  addCandidateOnChain,
  startElectionOnChain,
  endElectionOnChain,
};
