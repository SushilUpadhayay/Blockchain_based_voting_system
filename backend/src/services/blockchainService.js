const { ethers } = require('ethers');

// Configuration
const RPC_URL = 'http://127.0.0.1:8545';

// Lazy Contract Instance
let _contract = null;
let _provider = null;
let _lastKnownBlockHash = null; // used to detect Hardhat node resets
let _lastKnownContractAddress = null; // used to detect redeployments

const getContractAddress = () => {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });
  return process.env.CONTRACT_ADDRESS;
};

/**
 * Detects if the Hardhat node has been restarted by checking whether the
 * genesis block hash has changed since last use.
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

    const currentContractAddress = getContractAddress();

    const nodeRestarted = _contract && await hasNodeRestarted(_provider);
    const addressChanged = _contract && _lastKnownContractAddress !== currentContractAddress;

    if (nodeRestarted || addressChanged) {
      console.log(`[BlockchainService] Rebuilding contract instance. Reason: ${nodeRestarted ? 'Node restarted' : 'Contract address changed'}`);
      _contract = null;
    }

    if (!_contract) {
      if (!currentContractAddress) {
        throw new Error('CONTRACT_ADDRESS is not set in backend/.env');
      }
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, _provider);
      _contract = new ethers.Contract(currentContractAddress, abi, wallet);
      _lastKnownContractAddress = currentContractAddress;
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

// ── Service Functions (Multi-Election Aware) ──

const createElectionOnChain = async (title) => {
  try {
    const contract = await getContract();
    const tx = await contract.createElection(title);
    const receipt = await tx.wait();

    // Parse logs for ElectionCreated event to extract assigned electionId
    let electionId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed && parsed.name === 'ElectionCreated') {
          electionId = Number(parsed.args.electionId);
          break;
        }
      } catch {
        // Not a matching event log
      }
    }

    // Fallback if log parsing didn't capture electionId: query total election count
    if (electionId === null) {
      const count = await contract.getElectionCount();
      electionId = Number(count);
    }

    return {
      success: true,
      txHash: receipt.hash,
      electionId,
    };
  } catch (error) {
    console.error('[BlockchainService] createElectionOnChain error:', error.message);
    throw new Error('Blockchain createElection failed: ' + error.message);
  }
};

const registerVoterOnChain = async (electionId, walletAddress) => {
  try {
    const contract = await getContract();
    const tx = await contract.authorizeVoter(Number(electionId), walletAddress);
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

const addCandidateOnChain = async (electionId, name) => {
  try {
    const contract = await getContract();
    const tx = await contract.addCandidate(Number(electionId), name);
    return await tx.wait();
  } catch (error) {
    console.error('[BlockchainService] addCandidateOnChain error:', error.message);
    throw new Error('Blockchain addCandidate failed: ' + error.message);
  }
};

const assignRegistrationVerifierOnChain = async (electionId, verifierAddress) => {
  try {
    const contract = await getContract();
    const tx = await contract.assignRegistrationVerifier(Number(electionId), verifierAddress);
    return await tx.wait();
  } catch (error) {
    console.error('[BlockchainService] assignRegistrationVerifierOnChain error:', error.message);
    throw new Error('Blockchain assignRegistrationVerifier failed: ' + error.message);
  }
};

const removeRegistrationVerifierOnChain = async (electionId, verifierAddress) => {
  try {
    const contract = await getContract();
    const tx = await contract.removeRegistrationVerifier(Number(electionId), verifierAddress);
    return await tx.wait();
  } catch (error) {
    console.error('[BlockchainService] removeRegistrationVerifierOnChain error:', error.message);
    throw new Error('Blockchain removeRegistrationVerifier failed: ' + error.message);
  }
};

const startElectionOnChain = async (electionId) => {
  try {
    const contract = await getContract();
    const tx = await contract.startElection(Number(electionId));
    return await tx.wait();
  } catch (error) {
    console.error('[BlockchainService] startElectionOnChain error:', error.message);
    throw new Error('Blockchain startElection failed: ' + error.message);
  }
};

const endElectionOnChain = async (electionId) => {
  try {
    const contract = await getContract();
    const tx = await contract.endElection(Number(electionId));
    return await tx.wait();
  } catch (error) {
    console.error('[BlockchainService] endElectionOnChain error:', error.message);
    throw new Error('Blockchain endElection failed: ' + error.message);
  }
};

const isVoterAuthorizedOnChain = async (electionId, walletAddress) => {
  try {
    const contract = await getContract();
    const isRegistered = await contract.registeredVoters(Number(electionId), walletAddress);
    return isRegistered;
  } catch (error) {
    console.error('[BlockchainService] isVoterAuthorizedOnChain error:', error.message);
    throw new Error('Blockchain verification failed: ' + error.message);
  }
};

const getElectionStatusOnChain = async (electionId) => {
  try {
    const contract = await getContract();
    const [active, started] = await contract.getElectionStatus(Number(electionId));
    return { active, started };
  } catch (error) {
    console.error('[BlockchainService] getElectionStatusOnChain error:', error.message);
    throw new Error('Blockchain status retrieval failed: ' + error.message);
  }
};

const getCandidatesFromChain = async (electionId) => {
  try {
    const contract = await getContract();
    const data = await contract.getCandidates(Number(electionId));
    return data.map((c) => ({
      id: Number(c.id),
      name: c.name,
      voteCount: Number(c.voteCount),
    }));
  } catch (error) {
    console.error('[BlockchainService] getCandidatesFromChain error:', error.message);
    throw new Error('Failed to read candidates from blockchain: ' + error.message);
  }
};

const getWinnerFromChain = async (electionId) => {
  try {
    const contract = await getContract();
    const winnerName = await contract.getWinner(Number(electionId));
    return winnerName;
  } catch (error) {
    console.error('[BlockchainService] getWinnerFromChain error:', error.message);
    throw new Error('Blockchain getWinner failed: ' + error.message);
  }
};

module.exports = {
  createElectionOnChain,
  registerVoterOnChain,
  addCandidateOnChain,
  assignRegistrationVerifierOnChain,
  removeRegistrationVerifierOnChain,
  startElectionOnChain,
  endElectionOnChain,
  isVoterAuthorizedOnChain,
  getElectionStatusOnChain,
  getCandidatesFromChain,
  getWinnerFromChain,
};
