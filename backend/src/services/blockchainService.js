const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// Use Hardhat private key (from node output)
// Make sure this is set in .env
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = process.env.CONTRACT_ADDRESS;
const abi = require("../config/contractABI.json");

const contract = new ethers.Contract(contractAddress, abi, wallet);

const registerVoterOnChain = async (walletAddress) => {
  try {
    const tx = await contract.registerVoter(walletAddress);
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash
    };
  } catch (error) {
    console.error("Blockchain Error:", error.message);
    throw new Error("Blockchain registration failed: " + error.message);
  }
};

module.exports = { registerVoterOnChain };
