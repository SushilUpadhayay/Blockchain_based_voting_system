const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = process.env.CONTRACT_ADDRESS;
const artifact = require("../config/contractABI.json");
const abi = artifact.abi ? artifact.abi : artifact;

const contract = new ethers.Contract(contractAddress, abi, wallet);

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

const addCandidateOnChain = async (name) => {
  try {
    if (!contract.interface.getFunction("addCandidate")) throw new Error("Function not found in ABI");
    const tx = await contract.addCandidate(name);
    return await tx.wait();
  } catch (error) {
    console.error("Blockchain Error:", error.message);
    throw new Error("Blockchain addCandidate failed");
  }
};

const startElectionOnChain = async () => {
  try {
    if (!contract.interface.getFunction("startElection")) throw new Error("Function not found in ABI");
    const tx = await contract.startElection();
    return await tx.wait();
  } catch (error) {
    console.error("Blockchain Error:", error.message);
    throw new Error("Blockchain startElection failed");
  }
};

const endElectionOnChain = async () => {
  try {
    if (!contract.interface.getFunction("endElection")) throw new Error("Function not found in ABI");
    const tx = await contract.endElection();
    return await tx.wait();
  } catch (error) {
    console.error("Blockchain Error:", error.message);
    throw new Error("Blockchain endElection failed");
  }
};

module.exports = { registerVoterOnChain, addCandidateOnChain, startElectionOnChain, endElectionOnChain };
