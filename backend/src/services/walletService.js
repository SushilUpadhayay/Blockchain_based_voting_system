const crypto = require('crypto');
const { ethers } = require('ethers');
const Nonce = require('../models/Nonce');

/**
 * Generate a random cryptographic nonce and store it in MongoDB.
 * @param {string} walletAddress - The target wallet address requesting the nonce.
 * @returns {Promise<Object>} - Contains the signed message challenge and wallet address.
 */
const generateNonce = async (walletAddress) => {
  if (!walletAddress) {
    throw new Error('Wallet address is required to generate a challenge');
  }

  // Cryptographically secure random hex string
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = new Date().toISOString();

  // A clear, user-friendly signing message shown inside MetaMask
  const message = `Sign this message to prove you own this wallet for VoteChain.\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes validity

  // Store the challenge in MongoDB
  await Nonce.create({
    walletAddress: walletAddress.toLowerCase(),
    message,
    expiresAt,
  });

  return { message, walletAddress };
};

/**
 * Verify a cryptographic MetaMask signature using ethers.js.
 * @param {string} walletAddress - The claimed owner address.
 * @param {string} signature - The signature hex string returned by MetaMask.
 * @param {string} message - The original challenge message signed by MetaMask.
 * @returns {Promise<boolean>} - True if verification succeeds.
 */
const verifySignature = async (walletAddress, signature, message) => {
  if (!walletAddress || !signature || !message) {
    throw new Error('Missing parameters. Wallet address, signature, and message are required.');
  }

  // 1. Fetch challenge from MongoDB
  const record = await Nonce.findOne({
    walletAddress: walletAddress.toLowerCase(),
    message,
  });

  if (!record) {
    throw new Error('Verification session expired or signature challenge not found. Please request a new code.');
  }

  // 2. Extra safety check for expiration
  if (record.expiresAt < new Date()) {
    await Nonce.deleteOne({ _id: record._id });
    throw new Error('Verification message expired. Please request a new one.');
  }

  try {
    // 3. Cryptographically recover the signer address using ethers.js
    const recoveredAddress = ethers.verifyMessage(message, signature);

    // 4. Validate that recovered signer address matches the claimed wallet address
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('Signature verification failed. Signer address does not match your registered wallet.');
    }

    // 5. Prevent Nonce Reuse: Delete the record immediately upon success
    await Nonce.deleteOne({ _id: record._id });
    return true;
  } catch (error) {
    console.error('[WalletService] Cryptographic signature check error:', error.message);
    throw new Error('Invalid signature format: ' + error.message);
  }
};

module.exports = {
  generateNonce,
  verifySignature,
};
