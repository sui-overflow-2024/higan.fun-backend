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

export const rpcUrl = getFullnodeUrl(network);
console.log("Using network: ", network, " with RPC URL: ", rpcUrl);

export const client = new SuiClient({
    transport: new SuiHTTPTransport({
        url: 'https://sui-testnet.nodeinfra.com/?apikey=hackathon',
        // The typescript definitions may not match perfectly, casting to never avoids these minor incompatibilities
        WebSocketConstructor: WebSocket as never,
    }),
});

export const prisma = new PrismaClient();
