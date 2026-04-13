import React from 'react';
import { VotingProvider } from './context/VotingContext';
import Dashboard from './components/Dashboard';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <VotingProvider>
      <Toaster position="top-right" />
      <Dashboard />
    </VotingProvider>
  );
}

export default App;
