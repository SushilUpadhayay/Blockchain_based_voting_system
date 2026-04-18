import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../utils/constants';
import toast from 'react-hot-toast';

console.log("Using contract:", CONTRACT_ADDRESS);

const VotingContext = createContext();

export const useVoting = () => useContext(VotingContext);

export const VotingProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [electionStatus, setElectionStatus] = useState({ active: false, started: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const getContract = async () => {
    if (!window.ethereum) {
      toast.error("Please install MetaMask");
      return null;
    }

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();

    // Check if contract is deployed
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === "0x") {
      toast.error(`Contract not found at ${CONTRACT_ADDRESS.slice(0, 6)}... on chain ${network.chainId}. Please check MetaMask network!`);
      console.error(`No contract deployed! Connected to chain: ${network.chainId}, expected Ganache.`);
      return null;
    }

    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  };

  // Load all blockchain data
  const loadInitialData = async (account) => {
    try {
      setIsLoading(true);

      const contract = await getContract();
      if (!contract) return;

      try {
        const status = await contract.getElectionStatus();
        setElectionStatus({
          active: status[0],
          started: status[1],
        });
      } catch (e) {
        console.error("Error loading election status:", e);
      }

      try {
        const adminAddress = await contract.admin();
        setIsAdmin(adminAddress.toLowerCase() === account.toLowerCase());
      } catch (e) {
        console.error("Error loading admin:", e);
      }

      try {
        const voted = await contract.hasVoted(account);
        setHasVoted(voted);
      } catch (e) {
        console.error("Error checking vote status:", e);
      }

      await loadCandidates(contract);

    } catch (error) {
      console.error("Failed to load initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load candidates
  const loadCandidates = async (contractInstance) => {
    try {
      const contract = contractInstance || await getContract();
      if (!contract) return;

      const data = await contract.getCandidates();

      const parsed = data.map((c) => ({
        id: Number(c.id),
        name: c.name,
        voteCount: Number(c.voteCount),
      }));

      setCandidates(parsed);

    } catch (error) {
      console.error("Failed to load candidates:", error);
    }
  };

  // Connect wallet manually
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        return toast.error("Install MetaMask");
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      setCurrentAccount(accounts[0]);
      await loadInitialData(accounts[0]);

    } catch (error) {
      console.error(error);
      toast.error("Wallet connection failed");
    }
  };

  // Auto check connection
  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) return;

      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });

      if (accounts.length > 0) {
        setCurrentAccount(accounts[0]);
        await loadInitialData(accounts[0]);
      }

    } catch (error) {
      console.error(error);
    }
  };

  // Vote function
  const vote = async (candidateId) => {
    try {
      setIsLoading(true);

      const contract = await getContract();
      if (!contract) return;

      const tx = await contract.vote(candidateId);

      toast.loading("Voting...", { id: "vote" });

      await tx.wait();

      toast.success("Vote successful!", { id: "vote" });

      setHasVoted(true);
      await loadCandidates();

    } catch (error) {
      console.error(error);
      toast.error(error.reason || "Vote failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Lifecycle
  useEffect(() => {
    checkIfWalletIsConnected();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
          loadInitialData(accounts[0]);
        } else {
          setCurrentAccount("");
        }
      });
    }
  }, []);

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
        vote,
        loadCandidates,
      }}
    >
      {children}
    </VotingContext.Provider>
  );
};