const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// Use Hardhat private key (from node output)
// Make sure this is set in .env
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = process.env.CONTRACT_ADDRESS;
const artifact = require("../config/contractABI.json");
const abi = artifact.abi ? artifact.abi : artifact;

const contract = new ethers.Contract(contractAddress, abi, wallet);

// Log available functions to validate integration (Safeguard)
const availableFunctions = [];
if (contract.interface?.forEachFunction) {
  contract.interface.forEachFunction((fn) => availableFunctions.push(fn.name));
} else if (contract.interface?.fragments) {
  contract.interface.fragments.forEach(f => {
    if (f.type === 'function') availableFunctions.push(f.name);
  });
}
console.log("Deployed Contract Functions:", availableFunctions.join(', '));


const registerVoterOnChain = async (walletAddress) => {
  try {
    if (!contract.interface.getFunction("authorizeVoter")) {
      throw new Error("Function not found in ABI");
    }

    const tx = await contract.authorizeVoter(walletAddress);
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
