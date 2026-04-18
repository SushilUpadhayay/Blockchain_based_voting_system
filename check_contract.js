import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
const CONTRACT_ADDRESS = "0xd9145CCE52D386f254917e481eB44e9943F39138";

async function main() {
    try {
        const network = await provider.getNetwork();
        console.log("Connected to network:", network.name, "chainId:", network.chainId);

        const code = await provider.getCode(CONTRACT_ADDRESS);
        console.log("Code at contract address:", code.length > 2 ? `Code exists. Length: ${code.length}` : "No code (0x)");
    } catch (e) {
        console.error("Error:", e);
    }
}
main();
