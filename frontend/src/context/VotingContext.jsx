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
import API from '../api/api';

// ── Network config (from .env) ──
const REQUIRED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 31337);
const RPC_URL = import.meta.env.VITE_RPC_URL ?? 'http://127.0.0.1:8545';
const CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME ?? 'Hardhat Local';

// ── Context ──
const VotingContext = createContext();

export const useVoting = () => useContext(VotingContext);

export const VotingProvider = ({ children }) => {
  const { user, logout } = useAuth();
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
  const [pendingElectionId, setPendingElectionId] = useState(null);
  const [pendingCandidateId, setPendingCandidateId] = useState(null);
  const [winner, setWinner] = useState(null);

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
  const loadCandidates = useCallback(async (electionId, contractInstance) => {
    if (!electionId) return;
    const eId = Number(electionId);

    const normalizeCandidate = (candidate) => ({
      id: Number(candidate.id ?? candidate.candidateId),
      name: candidate.name,
      voteCount: Number(candidate.voteCount || 0),
      party: candidate.party || '',
      photoPath: candidate.photoPath || null,
    });

    try {
      const res = await API.get(`/elections/${eId}/candidates`);
      if (Array.isArray(res.data)) {
        setCandidates(res.data.map(normalizeCandidate));
        return;
      }
    } catch (metaErr) {
      console.warn(`[VotingContext] merged candidate metadata failed for election ${eId}:`, metaErr.message);
    }

    try {
      const contract = contractInstance ?? (await getContract());
      if (!contract) return;

      const data = await contract.getCandidates(eId);
      setCandidates(data.map(normalizeCandidate));
    } catch (err) {
      console.error(`[VotingContext] loadCandidates failed for election ${eId}:`, err.message);
    }
  }, [getContract]);

  const loadInitialData = useCallback(async (account, electionId = 1) => {
    const eId = Number(electionId);
    try {
      setIsLoading(true);
      const contract = await getContract();
      if (!contract) return;

      const [active, started] = await contract.getElectionStatus(eId);
      setElectionStatus({ active, started });

      try {
        const electionData = await contract.elections(eId);
        const superAdminAddr = electionData.superAdmin;
        setIsAdmin(superAdminAddr.toLowerCase() === account.toLowerCase());
      } catch {
        const adminAddr = await contract.admin();
        setIsAdmin(adminAddr.toLowerCase() === account.toLowerCase());
      }

      const voted = await contract.hasVoted(eId, account);
      setHasVoted(voted);

      await loadCandidates(eId, contract);

      // If election has ended, fetch the winner
      if (started && !active) {
        try {
          const winnerName = await contract.getWinner(eId);
          setWinner(winnerName);
        } catch (winnerErr) {
          console.warn(`[VotingContext] getWinner failed for election ${eId}:`, winnerErr.message);
          setWinner(null);
        }
      } else {
        setWinner(null);
      }
    } catch (err) {
      console.error(`[VotingContext] loadInitialData failed for election ${eId}:`, err.message);
    } finally {
      setIsLoading(false);
    }
  }, [getContract, loadCandidates]);

  // ── Wallet ──
  const connectWallet = async () => {
    try {
      if (!window.ethereum) return toast.error('Install MetaMask first.');

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      setCurrentAccount(accounts[0]);
      await loadInitialData(accounts[0], 1);
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
        await loadInitialData(accounts[0], 1);
      }
    } catch (err) {
      console.error('[VotingContext] checkIfWalletIsConnected error:', err);
    }
  }, [loadInitialData]);

  // ── Voter action ──
  const vote = async (electionId, candidateId) => {
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

      // Open OTP Modal to verify voter before casting vote
      setPendingElectionId(Number(electionId));
      setPendingCandidateId(candidateId);
      setIsOtpModalOpen(true);
    } catch (err) {
      console.error('[VotingContext] vote initialization error:', err);
      toast.error(err.reason ?? err.message ?? 'Vote initialization failed.', { id: toastId });
    }
  };

  const executeVoteOnChain = async (electionId, candidateId) => {
    const toastId = 'vote';
    try {
      if (!window.ethereum) {
        toast.error('Install MetaMask first.', { id: toastId });
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const currentWallet = accounts[0];
      const registeredWallet = user?.walletAddress;

      if (!currentWallet || !registeredWallet || currentWallet.toLowerCase() !== registeredWallet.toLowerCase()) {
        toast.error('Connected wallet does not match your registered identity.', { id: toastId });
        setPendingCandidateId(null);
        setPendingElectionId(null);
        return;
      }

      setIsLoading(true);
      const contract = await getContract();
      if (!contract) return;

      toast.loading('Submitting vote to blockchain…', { id: toastId });
      const tx = await contract.vote(Number(electionId), candidateId);
      await tx.wait();

      toast.success('Vote cast successfully!', { id: toastId });
      setHasVoted(true);
      setPendingCandidateId(null);
      setPendingElectionId(null);
      await loadCandidates(electionId, contract);
    } catch (err) {
      console.error('[VotingContext] executeVoteOnChain error:', err);
      toast.error(err.reason ?? err.message ?? 'Vote failed.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpVerified = () => {
    if (pendingElectionId !== null && pendingCandidateId !== null) {
      executeVoteOnChain(pendingElectionId, pendingCandidateId);
    }
  };

  // ── Election Admin actions ──
  const createElection = async (electionData) => {
    try {
      setIsLoading(true);
      const res = await API.post('/elections', electionData);
      toast.success('Election created successfully!');
      return res.data;
    } catch (err) {
      console.error('[VotingContext] createElection error:', err);
      toast.error(err.response?.data?.message || 'Failed to create election.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const addCandidate = async (electionId, formData) => {
    const toastId = 'addCandidate';
    try {
      setIsLoading(true);
      const name = formData.get('name');
      if (!name) throw new Error('Candidate name is required');

      const contract = await getContract();
      if (!contract) return;

      toast.loading('Please confirm candidate addition in MetaMask…', { id: toastId });
      const tx = await contract.addCandidate(Number(electionId), name);
      toast.loading('Adding candidate on blockchain…', { id: toastId });
      await tx.wait();

      toast.loading('Saving candidate metadata…', { id: toastId });
      await API.post(`/elections/${electionId}/candidates`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Candidate added to blockchain & database!', { id: toastId });
      await loadCandidates(electionId, contract);
    } catch (err) {
      console.error('[VotingContext] addCandidate error:', err);
      toast.error(err.reason ?? err.response?.data?.message ?? err.message ?? 'Failed to add candidate.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadRoster = async (electionId, formData) => {
    const toastId = 'uploadRoster';
    try {
      setIsLoading(true);
      toast.loading('Importing voter roster…', { id: toastId });
      const res = await API.post(`/elections/${electionId}/roster/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(res.data.message || 'Roster imported successfully!', { id: toastId });
      return res.data;
    } catch (err) {
      console.error('[VotingContext] uploadRoster error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload roster.', { id: toastId });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const openRegistration = async (electionId) => {
    const toastId = 'openRegistration';
    try {
      setIsLoading(true);
      toast.loading('Opening registration & sending invitation emails…', { id: toastId });
      const res = await API.post(`/elections/${electionId}/open-registration`);
      toast.success(res.data.message || 'Registration is now open!', { id: toastId });
      return res.data;
    } catch (err) {
      console.error('[VotingContext] openRegistration error:', err);
      toast.error(err.response?.data?.message || 'Failed to open registration.', { id: toastId });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const assignVerifier = async (electionId, payload) => {
    const toastId = 'assignVerifier';
    try {
      setIsLoading(true);
      const eId = Number(electionId);

      const name = String(payload?.name || '').trim();
      const email = String(payload?.email || '').trim().toLowerCase();
      if (!name || !email) throw new Error('Verifier name and email are required');

      toast.loading('Sending verifier invitation email…', { id: toastId });
      const res = await API.post(`/elections/${eId}/verifiers`, { ...payload, name, email });
      toast.success(res.data.message || 'Verifier invitation sent!', { id: toastId });
      return res.data;
    } catch (err) {
      console.error('[VotingContext] assignVerifier error:', err);
      toast.error(err.reason ?? err.response?.data?.message ?? err.message ?? 'Failed to assign verifier.', { id: toastId });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeVerifier = async (electionId, verifierAddress) => {
    const toastId = 'removeVerifier';
    try {
      setIsLoading(true);
      const eId = Number(electionId);

      const contract = await getContract();
      if (!contract) return;

      toast.loading('Please confirm verifier removal in MetaMask…', { id: toastId });
      const tx = await contract.removeRegistrationVerifier(eId, verifierAddress);
      toast.loading('Removing verifier on blockchain…', { id: toastId });
      await tx.wait();

      // Now update MongoDB
      const res = await API.delete(`/elections/${eId}/verifiers/${verifierAddress}`);
      toast.success('Registration verifier removed!', { id: toastId });
      return res.data;
    } catch (err) {
      console.error('[VotingContext] removeVerifier error:', err);
      toast.error(err.reason ?? err.response?.data?.message ?? err.message ?? 'Failed to remove verifier.', { id: toastId });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const approveVoter = async (electionId, userId, voterWallet) => {
    const toastId = 'approveVoter';
    try {
      setIsLoading(true);
      const eId = Number(electionId);

      if (!voterWallet) throw new Error('Voter does not have a linked wallet address');

      toast.loading('Authorizing voter on blockchain…', { id: toastId });
      const res = await API.post(`/admin/elections/${eId}/approve/${userId}`, {});
      toast.success(res.data.message || 'Voter authorized on-chain and approval saved!', { id: toastId });
    } catch (err) {
      console.error('[VotingContext] approveVoter error:', err);
      toast.error(err.reason ?? err.response?.data?.message ?? err.message ?? 'Failed to approve voter.', { id: toastId });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const syncBlockchain = async (electionId) => {
    const toastId = 'syncBlockchain';
    try {
      setIsLoading(true);
      toast.loading('Syncing with blockchain…', { id: toastId });
      const res = await API.post(`/elections/${electionId}/sync-blockchain`);
      toast.success(res.data.message || 'Synced successfully with blockchain!', { id: toastId });
      return res.data;
    } catch (err) {
      console.error('[VotingContext] syncBlockchain error:', err);
      toast.error(err.response?.data?.message || 'Sync failed. Check server logs.', { id: toastId });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const startElection = async (electionId) => {
    const toastId = 'startElection';
    try {
      setIsLoading(true);
      const contract = await getContract();
      if (!contract) return;

      toast.loading('Please confirm Start Election in MetaMask…', { id: toastId });
      const tx = await contract.startElection(Number(electionId));
      toast.loading('Starting election on blockchain…', { id: toastId });
      await tx.wait();

      await API.post(`/elections/${electionId}/start`);

      toast.success('Election is now ACTIVE on-chain!', { id: toastId });
      setElectionStatus({ active: true, started: true });
    } catch (err) {
      console.error('[VotingContext] startElection error:', err);
      toast.error(err.reason ?? err.response?.data?.message ?? err.message ?? 'Failed to start election.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const endElection = async (electionId) => {
    const toastId = 'endElection';
    try {
      setIsLoading(true);
      const contract = await getContract();
      if (!contract) return;

      toast.loading('Please confirm End Election in MetaMask…', { id: toastId });
      const tx = await contract.endElection(Number(electionId));
      toast.loading('Ending election on blockchain…', { id: toastId });
      await tx.wait();

      await API.post(`/elections/${electionId}/end`);

      toast.success('Election concluded on-chain.', { id: toastId });
      setElectionStatus((prev) => ({ ...prev, active: false }));
    } catch (err) {
      console.error('[VotingContext] endElection error:', err);
      toast.error(err.reason ?? err.response?.data?.message ?? err.message ?? 'Failed to end election.', { id: toastId });
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
        const newAccount = accounts[0];
        setCurrentAccount(newAccount);

        if (user && user.role !== 'admin' && user.walletAddress && user.walletAddress.toLowerCase() !== newAccount.toLowerCase()) {
          toast.error('MetaMask account changed. Session terminated for security.', { id: 'wallet-change-logout' });
          logout();
          window.location.href = '/login';
          return;
        }

        loadInitialData(newAccount, 1);
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
        pendingElectionId,
        winner,
        vote,
        loadCandidates,
        loadInitialData,
        createElection,
        addCandidate,
        uploadRoster,
        openRegistration,
        assignVerifier,
        removeVerifier,
        approveVoter,
        syncBlockchain,
        startElection,
        endElection,
      }}
    >
      <OTPModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        onVerified={onOtpVerified}
        electionId={pendingElectionId}
        purpose="voting"
      />
      {children}
    </VotingContext.Provider>
  );
};
