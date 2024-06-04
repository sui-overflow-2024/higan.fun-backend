import {WebSocket} from "ws";
import {getFullnodeUrl, SuiClient, SuiHTTPTransport} from "@mysten/sui.js/client";
import {PrismaClient} from "./generated/prisma/client";
import {Ed25519Keypair} from "@mysten/sui.js/keypairs/ed25519";

export const keypair = Ed25519Keypair.deriveKeypair(
    process.env.TEST_MNEMONICS || process.env.PRIVATE_KEY_MNEMONIC || "", //different devs w/ different naming, converge on PRIVATE_KEY_MNEMONIC later
    "m/44'/784'/0'/0'/0'"
);


type AppConfig = {
    network: "localnet" | "testnet" | "mainnet" | "devnet",
    rpcUrl: string,
    port: number,
    wsPort: number,
    managementPackageId: string,
    managementConfigId: string,
    managementModuleName: string,
    managementAdminCapId: string,
    keypair: Ed25519Keypair
}
// hack to serialize to json
declare global {
    interface BigInt {
        toJSON: () => string;
    }
}

BigInt.prototype.toJSON = function () {
    return this.toString()
}


export const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";
if (network !== "localnet" && network !== "testnet" && network !== "mainnet" && network !== "devnet") {
    throw new Error(`Invalid network: ${network}. Please use localnet, testnet, mainnet, or devnet`);
}


export const rpcUrl = process.env.RPC_URL || getFullnodeUrl(network);
if (!rpcUrl) {
    throw new Error("RPC_URL envvar or a valid NETWORK envvar for default RPC is required");

}

const {
    MANAGER_CONTRACT_PACKAGE_ID,
    MANAGER_CONTRACT_CONFIG_ID,
    MANAGER_CONTRACT_MODULE_NAME,
    MANAGER_CONTRACT_ADMIN_CAP_ID
} = process.env;

if (!MANAGER_CONTRACT_PACKAGE_ID) {
    throw new Error("MANAGER_CONTRACT_PACKAGE_ID envvar is required");
}

if (!MANAGER_CONTRACT_CONFIG_ID) {
    throw new Error("MANAGER_CONTRACT_CONFIG_ID envvar is required");
}

if (!MANAGER_CONTRACT_MODULE_NAME) {
    throw new Error("MANAGER_CONTRACT_ADMIN_CAP_ID envvar is required");
}

if (!MANAGER_CONTRACT_ADMIN_CAP_ID) {
    throw new Error("MANAGER_CONTRACT_ADMIN_CAP_ID envvar is required");
}


export const config: AppConfig = {
    network,
    rpcUrl,
    port: parseInt(process.env.PORT || "3000"),
    wsPort: parseInt(process.env.WS_PORT || "3001"),
    managementPackageId: MANAGER_CONTRACT_PACKAGE_ID,
    managementConfigId: MANAGER_CONTRACT_CONFIG_ID,
    managementModuleName: MANAGER_CONTRACT_MODULE_NAME,
    managementAdminCapId: MANAGER_CONTRACT_ADMIN_CAP_ID,
    keypair
}
console.log("config", config)
export const client = new SuiClient({
    transport: new SuiHTTPTransport({
        url: config.rpcUrl,
        // url: 'https://sui-testnet.nodeinfra.com/?apikey=hackathon',
        // The typescript definitions may not match perfectly, casting to never avoids these minor incompatibilities
        WebSocketConstructor: WebSocket as never,
    }),
});

export const prisma = new PrismaClient();
