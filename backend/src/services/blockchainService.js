const { ethers } = require('ethers');

// Configuration
const RPC_URL = 'http://127.0.0.1:8545';
const contractAddress = process.env.CONTRACT_ADDRESS;

// Lazy Contract Instance
// We initialize the contract on first use rather than at module load.
// This prevents server startup crashes if the Hardhat node is not running.
let _contract = null;
let _provider = null;
let _lastKnownBlockHash = null; // used to detect Hardhat node resets

/**
 * Detects if the Hardhat node has been restarted by checking whether the
 * genesis block hash has changed since last use. If it has, the in-memory
 * contract instance is stale and must be rebuilt.
 */
const hasNodeRestarted = async (provider) => {
  try {
    const genesisBlock = await provider.getBlock(0);
    if (!genesisBlock) return true;
    if (_lastKnownBlockHash && _lastKnownBlockHash !== genesisBlock.hash) {
      console.warn('[BlockchainService] Hardhat node restart detected — rebuilding contract instance.');
      return true;
    }
    _lastKnownBlockHash = genesisBlock.hash;
    return false;
  } catch {
    return true;
  }
};

const getContract = async () => {
  try {
    const artifact = require('../config/contractABI.json');
    const abi = artifact.abi ? artifact.abi : artifact;

    if (!_provider) {
      _provider = new ethers.JsonRpcProvider(RPC_URL);
    }

    // If node was restarted, discard cached contract so it's rebuilt
    if (_contract && await hasNodeRestarted(_provider)) {
      _contract = null;
    }

    if (!_contract) {
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, _provider);
      _contract = new ethers.Contract(contractAddress, abi, wallet);
      // Capture current genesis hash on first build
      const genesisBlock = await _provider.getBlock(0);
      if (genesisBlock) _lastKnownBlockHash = genesisBlock.hash;
    }

    return _contract;
  } catch (error) {
    _contract = null;
    _provider = null;
    throw new Error(
      `Blockchain service unavailable. Ensure the Hardhat node is running and CONTRACT_ADDRESS / PRIVATE_KEY are set. (${error.message})`
    );
  }
};

// Service Functions

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

const isVoterAuthorizedOnChain = async (walletAddress) => {
  try {
    const contract = await getContract();

    if (!contract.interface.getFunction('registeredVoters')) {
      throw new Error('registeredVoters function not found in ABI');
    }

    const isRegistered = await contract.registeredVoters(walletAddress);
    return isRegistered;
  } catch (error) {
    console.error('[BlockchainService] isVoterAuthorizedOnChain error:', error.message);
    throw new Error('Blockchain verification failed: ' + error.message);
  }
};

module.exports = {
  registerVoterOnChain,
  addCandidateOnChain,
  startElectionOnChain,
  endElectionOnChain,
  isVoterAuthorizedOnChain,
};
