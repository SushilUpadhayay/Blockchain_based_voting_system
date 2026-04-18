const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(50));
  console.log("  Deploying Voting Contract");
  console.log("=".repeat(50));

  const [deployer] = await hre.ethers.getSigners();
  const balance = await deployer.provider.getBalance(deployer.address);

  console.log(`\nDeployer  : ${deployer.address}`);
  console.log(`Balance   : ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`Network   : ${hre.network.name} (chainId: ${hre.network.config.chainId})\n`);

  // Deploy
  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy();
  await voting.waitForDeployment();

  const contractAddress = await voting.getAddress();
  console.log(`Voting deployed at: ${contractAddress}`);

  // ── Save address to frontend ──
  const frontendUtilsDir = path.join(__dirname, "../frontend/src/utils");

  // Ensure the utils directory exists
  if (!fs.existsSync(frontendUtilsDir)) {
    fs.mkdirSync(frontendUtilsDir, { recursive: true });
  }

  const deployedAddressPath = path.join(frontendUtilsDir, "deployed-address.json");
  const addressData = {
    address: contractAddress,
    network: hre.network.name,
    chainId: hre.network.config.chainId ?? 31337,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(deployedAddressPath, JSON.stringify(addressData, null, 2));
  console.log(`Address saved  → ${deployedAddressPath}`);

  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/Voting.sol/Voting.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abiDestPath = path.join(frontendUtilsDir, "abi.json");
  fs.writeFileSync(abiDestPath, JSON.stringify(artifact.abi, null, 2));
  console.log(`ABI copied     → ${abiDestPath}`);

  // ── Summary ───
  console.log("\n" + "=".repeat(50));
  console.log("  Deployment Complete");
  console.log("=".repeat(50));
  console.log(`\nContract Address : ${contractAddress}`);
  console.log(`Admin (deployer) : ${deployer.address}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Run initializer : npx hardhat run scripts/initialize.js --network localhost`);
  console.log(`  2. Start frontend  : cd frontend && npm run dev`);
  console.log(`  3. MetaMask RPC    : http://127.0.0.1:8545  (Chain ID: 31337)\n`);
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:", error.message);
  process.exitCode = 1;
});
