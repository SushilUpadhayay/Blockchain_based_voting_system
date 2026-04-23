import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dob: '',
    address: '',
    idNumber: '',
    walletAddress: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConnectWallet = async () => {
    try {
      if (!window.ethereum) {
        toast.error("Please install MetaMask!");
        return null;
      }
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const address = accounts[0];
      setFormData(prev => ({ ...prev, walletAddress: address }));
      toast.success("Wallet connected!");
      return address;
    } catch (error) {
      console.error("Wallet connection failed:", error);
      toast.error("Failed to connect wallet.");
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let address = formData.walletAddress;
    if (!address) {
      address = await handleConnectWallet();
      if (!address) {
        setLoading(false);
        return; // Stop if wallet connection fails
      }
    }

    try {
      const response = await API.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        idNumber: formData.idNumber,
        walletAddress: address
      });
      const userId = response.data._id;

      if (!userId) {
        throw new Error("No userId returned from backend");
      }

      localStorage.setItem("userId", userId);
      console.log("Saved userId:", userId);

      toast.success("Registration successful! Please upload your document.");
      navigate('/upload');
    } catch (error) {
      console.error("Register Error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="max-w-md w-full p-8 rounded-xl shadow-md border transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--text-color)' }}>Register to VoteChain</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Full Name</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
              style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
              placeholder="Sushil Upadhayaya"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Email</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
              style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
              placeholder="test@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Date of Birth</label>
            <input
              type="date"
              name="dob"
              required
              value={formData.dob}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
              style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Address</label>
            <input
              type="text"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
              style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
              placeholder="Kathmandu, Nepal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>ID Number</label>
            <input
              type="text"
              name="idNumber"
              required
              value={formData.idNumber}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
              style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
              placeholder="Enter ID Number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Wallet Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={formData.walletAddress || 'Not connected'}
                className="flex-1 px-4 py-2 rounded-lg outline-none border"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)', opacity: 0.7 }}
              />
              {!formData.walletAddress && (
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  Connect
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center mt-6"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Register'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm opacity-70" style={{ color: 'var(--text-color)' }}>
          Already have an account? <Link to="/login" className="text-blue-600 font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
