import { ethers } from "ethers";
import abi from "./src/utils/abi.json" with { type: "json" };

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
const CONTRACT_ADDRESS = "0xd9145CCE52D386f254917e481eB44e9943F39138";

async function main() {
    try {
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

        const status = await contract.getElectionStatus();
        console.log("Status:", status);

        const admin = await contract.admin();
        console.log("Admin:", admin);

        const data = await contract.getCandidates();
        console.log("Candidates:", data);

        const parsed = data.map((c) => ({
            id: Number(c.id),
            name: c.name,
            voteCount: Number(c.voteCount),
        }));
        console.log("Parsed:", parsed);
    } catch (e) {
        console.error("Error:", e);
    }
}
main();
