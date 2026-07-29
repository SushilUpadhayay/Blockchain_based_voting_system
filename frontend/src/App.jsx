import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ThemeToggle from './components/ThemeToggle';

// Pages
import Register from './pages/Register';
import UploadDocument from './pages/UploadDocument';
import Login from './pages/Login';
import VerifyOtp from './pages/VerifyOtp';
import StatusDashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ElectionSetup from './pages/ElectionSetup';
import Home from './pages/Home';
import ElectionPortal from './pages/ElectionPortal';
import CreateElection from './pages/CreateElection';
import VerifierDashboard from './pages/VerifierDashboard';
import VerifierRegister from './pages/VerifierRegister';
import ElectionResults from './pages/ElectionResults';
import VotingPage from './pages/Voting';

// Route Guards
import ProtectedRoute from './components/ProtectedRoute';
import { ROUTES } from './constants';

function AppContent() {
  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="flex-1 relative">
        {/* Persistent Floating Theme Toggle */}
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white/10 dark:bg-black/10 backdrop-blur-lg p-2 rounded-2xl border border-white/20 dark:border-white/10 shadow-2xl">
          <ThemeToggle />
        </div>

        <Routes>
          {/* ── Public Routes ── */}
          <Route path={ROUTES.HOME} element={<Home />} />
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />
          <Route path={ROUTES.VERIFY_OTP} element={<VerifyOtp />} />

          {/* Election Portal: Public (listing), but actions inside are wallet-gated */}
          <Route path="/elections" element={<ElectionPortal />} />
          <Route path="/elections/create" element={<CreateElection />} />
          <Route path="/elections/results/:electionId" element={<ElectionResults />} />

          {/* Tokenized Registration: /register?token=... is already handled inside Register.jsx */}

          {/* ── Protected Routes (JWT required) ── */}
          <Route
            path={ROUTES.UPLOAD}
            element={
              <ProtectedRoute uploadOnly>
                <UploadDocument />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <StatusDashboard />
              </ProtectedRoute>
            }
          />

          {/* Election-scoped Voting Ballot (registered voters for that election) */}
          <Route
            path="/elections/:electionId/voting"
            element={
              <ProtectedRoute registeredOnly>
                <VotingPage />
              </ProtectedRoute>
            }
          />

          {/* Election Administrator Setup Checklist (per election) */}
          <Route
            path="/elections/:electionId/setup"
            element={
              <ProtectedRoute>
                <ElectionSetup />
              </ProtectedRoute>
            }
          />

          {/* Election Administrator Dashboard (per election) */}
          <Route
            path="/elections/:electionId/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Registration Verifier Dashboard (per election) */}
          <Route
            path="/elections/:electionId/verifier"
            element={
              <ProtectedRoute>
                <VerifierDashboard />
              </ProtectedRoute>
            }
          />

          {/* Election Results (public) */}
          <Route
            path="/elections/:electionId/results"
            element={<ElectionResults />}
          />

          {/* Verifier self-registration (public invite link) */}
          <Route path="/verifier/register" element={<VerifierRegister />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
