import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Users,
  BarChart3,
  Globe,
  PlusCircle,
  LogIn,
} from 'lucide-react';
import heroBg from '../assets/hero-bg.png';
import Navbar from '../components/Navbar';

const Home = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden bg-slate-900 flex-1 flex items-center justify-center">
        <div className="absolute inset-0 z-0 opacity-40">
          <img
            src={heroBg}
            alt="Blockchain Network"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Decentralized Multi-Election Platform
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight">
              Secure <span className="text-blue-500">Blockchain</span> Voting System
            </h1>

            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Deploy your own immutable election on the blockchain with cryptographic verification, OTP security, and transparent results.
            </p>

            {/* Prominent Calls To Action */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
              <Link
                to="/elections/create"
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-extrabold rounded-2xl transition-all hover:scale-105 shadow-2xl flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" /> Create Election
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white text-base font-extrabold rounded-2xl border border-slate-700 transition-all hover:scale-105 shadow-xl flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" /> Login to System
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Immutable Smart Contracts",
                desc: "Elections are created independently on-chain, ensuring vote counts cannot be altered.",
                icon: <Lock className="w-8 h-8 text-blue-600" />,
                bg: "bg-blue-50 dark:bg-blue-900/20"
              },
              {
                title: "Identity Verification",
                desc: "Dual-layer security with OTP and OCR citizenship verification protects ballot integrity.",
                icon: <ShieldCheck className="w-8 h-8 text-purple-600" />,
                bg: "bg-purple-50 dark:bg-purple-900/20"
              },
              {
                title: "Verifier Delegation",
                desc: "Election Administrators can invite Registration Verifiers to verify voter document applications.",
                icon: <Users className="w-8 h-8 text-green-600" />,
                bg: "bg-green-50 dark:bg-green-900/20"
              },
              {
                title: "Public Results",
                desc: "Automated winner calculation and live blockchain tallies accessible to everyone.",
                icon: <BarChart3 className="w-8 h-8 text-amber-600" />,
                bg: "bg-amber-50 dark:bg-amber-900/20"
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-14 h-14 ${feature.bg} rounded-xl flex items-center justify-center mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 border-t border-slate-800 text-center text-slate-400 text-xs">
        <p>&copy; 2026 VoteChain Systems. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
