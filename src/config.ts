import {WebSocket} from "ws";
import {getFullnodeUrl, SuiClient, SuiHTTPTransport} from "@mysten/sui.js/client";
import { PrismaClient } from "./generated/prisma/client";

export const network = process.env.NETWORK || "localnet";
if (network !== "localnet" && network !== "testnet" && network !== "mainnet" && network !== "devnet") {
    throw new Error(`Invalid network: ${network}. Please use localnet, testnet, mainnet, or devnet`);
}

export const rpcUrl = getFullnodeUrl(network);
console.log("Using network: ", network, " with RPC URL: ", rpcUrl);

export const client = new SuiClient({
    transport: new SuiHTTPTransport({
        url: rpcUrl,
        // The typescript definitions may not match perfectly, casting to never avoids these minor incompatibilities
        WebSocketConstructor: WebSocket as never,
    }),
});

export const prisma = new PrismaClient();
