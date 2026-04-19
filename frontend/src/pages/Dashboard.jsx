import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoting } from '../context/VotingContext';
import DashboardComponent from '../components/Dashboard';
import API from '../api/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { isAuthenticated } = useAuth();
  const { currentAccount } = useVoting();
  const navigate = useNavigate();
  const notifiedAccount = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Only call connect-wallet if authenticated and a wallet is connected,
    // and we haven't already notified the backend about this specific account.
    if (isAuthenticated && currentAccount && notifiedAccount.current !== currentAccount) {
      const linkWalletToBackend = async () => {
        try {
          await API.post('/user/connect-wallet', { walletAddress: currentAccount });
          notifiedAccount.current = currentAccount;
        } catch (error) {
          console.error("Wallet Linking Error:", error);
          toast.error("Failed to link wallet with your account.");
        }
      };

      linkWalletToBackend();
    }
  }, [isAuthenticated, currentAccount]);

  if (!isAuthenticated) return null;

  return <DashboardComponent />;
};

export default Dashboard;
