const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(50));
  console.log("  Initializing Voting Contract");
  console.log("=".repeat(50));

  // ── Read deployed address ──
  const addressFile = path.join(
    __dirname,
    "../frontend/src/utils/deployed-address.json"
  );

  if (!fs.existsSync(addressFile)) {
    throw new Error(
      "deployed-address.json not found!\n" +
      "Please run deploy.js first:\n" +
      "  npx hardhat run scripts/deploy.js --network localhost"
    );
  }

  const { address, chainId } = JSON.parse(fs.readFileSync(addressFile, "utf8"));
  console.log(`\nContract  : ${address}`);
  console.log(`Chain ID  : ${chainId}`);

  // ── Connect to contract ──
  const [admin, voter1, voter2] = await hre.ethers.getSigners();
  console.log(`Admin     : ${admin.address} (Account #0)`);
  console.log(`Voter 1   : ${voter1.address} (Account #1)`);
  console.log(`Voter 2   : ${voter2.address} (Account #2)`);

  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = Voting.attach(address);

  // ── Guard: skip if election already started ──
  const [, started] = await voting.getElectionStatus();
  if (started) {
    console.log("\n⚠️  Election already started — skipping initialization.");
    console.log("   Deploy a fresh contract if you need to re-initialize.\n");
    return;
  }

  // ── No auto-initialization ──
  console.log("\n" + "=".repeat(50));
  console.log("  Initialization Complete");
  console.log("=".repeat(50));
  console.log("\nStatus: Contract connected and waiting for Admin configuration.");
  console.log("Please use the Admin Dashboard to add candidates and start the election.");
  console.log("\nAdmin account is ready for use:");
  console.log(`  Account #0: ${admin.address}`);
  console.log(
    "\nPrivate keys are printed by `npx hardhat node` — copy from that terminal.\n"
  );
}

main().catch((error) => {
  console.error("\n❌ Initialization failed:", error.message);
  process.exitCode = 1;
});
