import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../utils/constants';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import OTPModal from '../components/OTPModal';

// ── Network config (from .env) ──
const REQUIRED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 31337);
const RPC_URL = import.meta.env.VITE_RPC_URL ?? 'http://127.0.0.1:8545';
const CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME ?? 'Hardhat Local';

// ── Context ──
const VotingContext = createContext();

export const useVoting = () => useContext(VotingContext);

export const VotingProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentAccount, setCurrentAccount] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [electionStatus, setElectionStatus] = useState({ active: false, started: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [networkOk, setNetworkOk] = useState(true);
  const [networkError, setNetworkError] = useState('');
  const [contractFound, setContractFound] = useState(true);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [pendingCandidateId, setPendingCandidateId] = useState(null);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  // ── Helpers ──
  const checkNetwork = useCallback(async (provider) => {
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);

    if (currentChainId !== REQUIRED_CHAIN_ID) {
      const msg =
        `Wrong network detected (chainId: ${currentChainId}). ` +
        `Please switch MetaMask to "${CHAIN_NAME}" ` +
        `(RPC: ${RPC_URL}, Chain ID: ${REQUIRED_CHAIN_ID}).`;
      setNetworkOk(false);
      setNetworkError(msg);
      toast.error(`Switch MetaMask to ${CHAIN_NAME} (chainId ${REQUIRED_CHAIN_ID})`, {
        id: 'network',
        duration: 6000,
      });
      return false;
    }

    setNetworkOk(true);
    setNetworkError('');
    return true;
  }, []);

  const getContract = useCallback(async () => {
    if (!window.ethereum) {
      toast.error('MetaMask not found. Please install MetaMask.');
      return null;
    }

    const provider = new BrowserProvider(window.ethereum);

    if (!(await checkNetwork(provider))) return null;

    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      const msg = `No contract at ${CONTRACT_ADDRESS.slice(0, 6)}…${CONTRACT_ADDRESS.slice(-4)}. Run deploy script first.`;
      setContractFound(false);
      toast.error(msg, { id: 'contract', duration: 8000 });
      console.error('[VotingContext] Contract not found:', CONTRACT_ADDRESS);
      return null;
    }

    setContractFound(true);
    const signer = await provider.getSigner();
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }, [checkNetwork]);

  // ── Data loaders ──
  const loadCandidates = useCallback(async (contractInstance) => {
    try {
      const contract = contractInstance ?? (await getContract());
      if (!contract) return;

      const data = await contract.getCandidates();
      setCandidates(
        data.map((c) => ({
          id: Number(c.id),
          name: c.name,
          voteCount: Number(c.voteCount),
        }))
      );
    } catch (err) {
      console.error('[VotingContext] loadCandidates failed:', err.message);
    }
  }, [getContract]);

  const loadInitialData = useCallback(async (account) => {
    // Skip blockchain queries for users who are not yet registered/approved.
    // Pending, rejected, and blocked users have no need to query the chain.
    if (user && user.role !== 'admin' && user.status !== 'registered') {
      return;
    }

    try {
      setIsLoading(true);
      const contract = await getContract();
      if (!contract) return;

      const [active, started] = await contract.getElectionStatus();
      setElectionStatus({ active, started });

      const adminAddr = await contract.admin();
      setIsAdmin(adminAddr.toLowerCase() === account.toLowerCase());

      const voted = await contract.hasVoted(account);
      setHasVoted(voted);

      await loadCandidates(contract);
    } catch (err) {
      console.error('[VotingContext] loadInitialData failed:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [getContract, loadCandidates, user]);

  // ── Wallet ──
  const connectWallet = async () => {
    try {
      if (!window.ethereum) return toast.error('Install MetaMask first.');

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      setCurrentAccount(accounts[0]);
      await loadInitialData(accounts[0]);
    } catch (err) {
      console.error('[VotingContext] connectWallet error:', err);
      toast.error('Wallet connection failed.');
    }
  };

  const checkIfWalletIsConnected = useCallback(async () => {
    try {
      if (!window.ethereum) return;
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setCurrentAccount(accounts[0]);
        await loadInitialData(accounts[0]);
      }
    } catch (err) {
      console.error('[VotingContext] checkIfWalletIsConnected error:', err);
    }
  }, [loadInitialData]);

  // ── Voter action ──
  const vote = async (candidateId) => {
    const toastId = 'vote';
    try {
      if (!window.ethereum) {
        toast.error('Install MetaMask first.', { id: toastId });
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const currentWallet = accounts[0];
      const registeredWallet = user?.walletAddress;

      if (!registeredWallet) {
        toast.error('No registered wallet found for your account.', { id: toastId });
        return;
      }

      if (currentWallet.toLowerCase() !== registeredWallet.toLowerCase()) {
        toast.error('Connected wallet does not match your registered identity.', { id: toastId });
        return;
      }

      // Step 1: Require OTP verification before submitting
      if (!isOtpVerified) {
        setPendingCandidateId(candidateId);
        setIsOtpModalOpen(true);
        return;
      }

      // Step 2: Cast the vote on blockchain
      setIsLoading(true);
      const contract = await getContract();
      if (!contract) return;

      toast.loading('Submitting vote to blockchain…', { id: toastId });
      const tx = await contract.vote(candidateId);
      await tx.wait();

      toast.success('Vote cast successfully!', { id: toastId });
      setHasVoted(true);
      setIsOtpVerified(false);
      setPendingCandidateId(null);
      await loadCandidates();
    } catch (err) {
      console.error('[VotingContext] vote error:', err);
      toast.error(err.reason ?? err.message ?? 'Vote failed.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpVerified = () => {
    setIsOtpVerified(true);
    if (pendingCandidateId !== null) {
      setTimeout(() => {
        vote(pendingCandidateId);
      }, 500);
    }
  };

  // ── Admin actions ──
  const addCandidate = async (name) => {
    const toastId = 'addCandidate';
    try {
      setIsLoading(true);
      const contract = await getContract();
      if (!contract) return;

      toast.loading(`Adding ${name}…`, { id: toastId });
      const tx = await contract.addCandidate(name);
      await tx.wait();

      toast.success(`"${name}" added!`, { id: toastId });
      await loadCandidates();
    } catch (err) {
      console.error('[VotingContext] addCandidate error:', err);
      toast.error(err.reason ?? err.message ?? 'Failed to add candidate.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };



  const startElection = async () => {
    const toastId = 'startElection';
    try {
      setIsLoading(true);
      const contract = await getContract();
      if (!contract) return;

      toast.loading('Starting election…', { id: toastId });
      const tx = await contract.startElection();
      await tx.wait();

      toast.success('Election is now ACTIVE!', { id: toastId });
      setElectionStatus({ active: true, started: true });
    } catch (err) {
      console.error('[VotingContext] startElection error:', err);
      toast.error(err.reason ?? err.message ?? 'Failed to start election.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const endElection = async () => {
    const toastId = 'endElection';
    try {
      setIsLoading(true);
      const contract = await getContract();
      if (!contract) return;

      toast.loading('Ending election…', { id: toastId });
      const tx = await contract.endElection();
      await tx.wait();

      toast.success('Election ended.', { id: toastId });
      setElectionStatus((prev) => ({ ...prev, active: false }));
    } catch (err) {
      console.error('[VotingContext] endElection error:', err);
      toast.error(err.reason ?? err.message ?? 'Failed to end election.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Lifecycle ──
  useEffect(() => {
    checkIfWalletIsConnected();

    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setCurrentAccount(accounts[0]);
        loadInitialData(accounts[0]);
      } else {
        setCurrentAccount('');
        setIsAdmin(false);
        setHasVoted(false);
        setCandidates([]);
        setElectionStatus({ active: false, started: false });
      }
    };

    const handleChainChanged = () => window.location.reload();

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [checkIfWalletIsConnected, loadInitialData]);

  return (
    <VotingContext.Provider
      value={{
        currentAccount,
        connectWallet,
        candidates,
        electionStatus,
        isLoading,
        isAdmin,
        hasVoted,
        networkOk,
        networkError,
        contractFound,
        REQUIRED_CHAIN_ID,
        RPC_URL,
        CHAIN_NAME,
        pendingCandidateId,
        vote,
        loadCandidates,
        loadInitialData,
        addCandidate,

        startElection,
        endElection,
      }}
    >
      <OTPModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        onVerified={onOtpVerified}
        purpose="voting"
      />
      {children}
    </VotingContext.Provider>
  );
};