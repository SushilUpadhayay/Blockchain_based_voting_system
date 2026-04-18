import { ethers } from 'ethers';
import abi from './frontend/src/utils/abi.json';

const CONTRACT_ADDRESS = "0xd9145CCE52D386f254917e481eB44e9943F39138";
const CONTRACT_ABI = abi;

async function initializeVotingContract() {
  try {
    console.log("Starting initialization process...");

    // 1. Connect to MetaMask
    if (!window.ethereum) {
      throw new Error("MetaMask not found! Please install MetaMask.");
    }

    // Request account access if needed
    console.log("Connecting to MetaMask...");
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    // 2. Create provider and signer (ethers v6 syntax)
    // Note: If you have an older version of ethers (v5), use: 
    // new ethers.providers.Web3Provider(window.ethereum)
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const adminAddress = await signer.getAddress();

    console.log(`Connected wallet (Admin): ${adminAddress}`);

    // 3. Connect to the deployed contract
    const votingContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // 4. Execute Initialization Steps in Order

    // STEP 1: Add candidates
    console.log("Adding candidate: Alice...");
    let tx1 = await votingContract.addCandidate("Alice");
    await tx1.wait();
    console.log("✅ Alice added successfully.");

    console.log("Adding candidate: Bob...");
    let tx2 = await votingContract.addCandidate("Bob");
    await tx2.wait();
    console.log("✅ Bob added successfully.");

    // STEP 2: Authorize voter
    // Authorizing the current (admin) wallet for testing purposes
    console.log(`Authorizing voter: ${adminAddress}...`);
    let tx3 = await votingContract.authorizeVoter(adminAddress);
    await tx3.wait();
    console.log("✅ Voter authorized successfully.");

    // STEP 3: Start election
    console.log("Starting the election...");
    let tx4 = await votingContract.startElection();
    await tx4.wait();
    console.log("✅ Election started successfully!");

    console.log("🚀 Initialization complete! You can now vote on your frontend.");

  } catch (error) {
    console.error("❌ Error during initialization:", error);
  }
}
console.log("CONTRACT ADDRESS:", CONTRACT_ADDRESS);
// To run this in the browser console, you would uncomment the line below:
initializeVotingContract();