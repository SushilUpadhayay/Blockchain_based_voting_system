import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Users,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Globe,
  Database
} from 'lucide-react';
import heroBg from '../assets/hero-bg.png';

const Home = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
      { }
      <section className="relative py-20 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0 opacity-40">
          <img
            src={heroBg}
            alt="Blockchain Network"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom duration-1000">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Next-Generation Voting Technology
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight">
                Secure <span className="text-blue-500">Blockchain</span> Voting System
              </h1>

              <p className="text-xl text-slate-300 max-w-2xl mx-auto lg:mx-0">
                Experience a new era of democracy. Our platform ensures absolute transparency,
                uncompromising security, and guaranteed one-person-one-vote integrity through
                decentralized blockchain technology.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="px-10 py-4 bg-white text-blue-600 font-bold rounded-xl transition-all hover:scale-105 shadow-xl"
                >
                  Register as Voter
                </Link>
                <Link
                  to="/login"
                  className="px-10 py-4 bg-blue-700 text-white font-bold rounded-xl transition-all hover:bg-blue-800 border border-blue-500"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white">Built on Trust and Innovation</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Our system leverages the most advanced cryptographic methods to ensure your vote remains private and your election remains fair.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Secure Voting",
                desc: "Every vote is a signed transaction on the blockchain, making it immutable and impossible to tamper with.",
                icon: <Lock className="w-8 h-8 text-blue-600" />,
                bg: "bg-blue-50 dark:bg-blue-900/20"
              },
              {
                title: "OTP Authentication",
                desc: "Dual-layer security using email OTP ensures that only authorized voters can access the ballot.",
                icon: <ShieldCheck className="w-8 h-8 text-purple-600" />,
                bg: "bg-purple-50 dark:bg-purple-900/20"
              },
              {
                title: "Admin Controls",
                desc: "Sophisticated dashboard for administrators to manage candidates and election timelines securely.",
                icon: <Users className="w-8 h-8 text-green-600" />,
                bg: "bg-green-50 dark:bg-green-900/20"
              },
              {
                title: "Real-time Results",
                desc: "Watch the election progress in real-time with automatically verified blockchain tallies.",
                icon: <BarChart3 className="w-8 h-8 text-amber-600" />,
                bg: "bg-amber-50 dark:bg-amber-900/20"
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-8 rounded-3xl border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all duration-300 group"
              >
                <div className={`w-16 h-16 ${feature.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-slate-50 dark:bg-slate-800/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">How It Works</h2>
          </div>

          <div className="relative">
            {/* Connection Line (Desktop) */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
              {[
                { step: "01", title: "Register", desc: "Create an account and connect your Web3 wallet for identity binding.", icon: <Globe /> },
                { step: "02", title: "Verify", desc: "Upload your ID and verify your email via OTP for secure authentication.", icon: <CheckCircle2 /> },
                { step: "03", title: "Wait", desc: "Admin reviews your credentials to ensure eligibility in the voter registry.", icon: <Users /> },
                { step: "04", title: "Vote", desc: "Access the ballot during the live election and cast your secure vote.", icon: <Lock /> }
              ].map((step, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 font-bold">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Ready to Shape the Future?</h2>
          <p className="text-xl text-blue-100">
            Join thousands of citizens already using the most secure voting platform on Earth.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-10 py-4 bg-white text-blue-600 font-bold rounded-xl transition-all hover:scale-105 shadow-xl"
            >
              Register as Voter
            </Link>
            <Link
              to="/login"
              className="px-10 py-4 bg-blue-700 text-white font-bold rounded-xl transition-all hover:bg-blue-800 border border-blue-500"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">VoteChain</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              &copy; 2026 VoteChain Systems. All rights reserved. Built with Blockchain Integrity.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors">Privacy</a>
              <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors">Terms</a>
              <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
