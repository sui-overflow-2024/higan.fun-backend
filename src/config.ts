import {WebSocket} from "ws";
import {getFullnodeUrl, SuiClient, SuiHTTPTransport} from "@mysten/sui.js/client";
import { PrismaClient } from "./generated/prisma/client";


// hack to serialize to json
declare global {
    interface BigInt {
      toJSON: () => string;
    }
  }

BigInt.prototype.toJSON = function() { return this.toString() }

export const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";
if (network !== "localnet" && network !== "testnet" && network !== "mainnet" && network !== "devnet") {
    throw new Error(`Invalid network: ${network}. Please use localnet, testnet, mainnet, or devnet`);
}

const {MANAGER_CONTRACT_PACKAGE_ID,MANAGER_CONTRACT_MODULE_NAME,MANAGER_CONTRACT_ADMIN_CAP_ID} = process.env;

if (!MANAGER_CONTRACT_PACKAGE_ID || !MANAGER_CONTRACT_MODULE_NAME || !MANAGER_CONTRACT_ADMIN_CAP_ID) {
  throw new Error("Manager contract package id, module name, and admin cap object id must be set")
}

export const managerContract = {
  packageId: MANAGER_CONTRACT_PACKAGE_ID,
  moduleName: MANAGER_CONTRACT_MODULE_NAME,
  adminCap: MANAGER_CONTRACT_ADMIN_CAP_ID,
}

export const rpcUrl = getFullnodeUrl(network);
console.log("Using network: ", network, " with RPC URL: ", process.env.RPC_URL || rpcUrl);

export const client = new SuiClient({
    transport: new SuiHTTPTransport({
        url: process.env.RPC_URL || rpcUrl,
        // url: 'https://sui-testnet.nodeinfra.com/?apikey=hackathon',
        // The typescript definitions may not match perfectly, casting to never avoids these minor incompatibilities
        WebSocketConstructor: WebSocket as never,
    }),
});

export const prisma = new PrismaClient();
