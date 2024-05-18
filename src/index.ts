import {PrismaClient} from "@prisma/client";
import express from "express";
import {moveTomlTemplate, tokenTemplate} from "./templates/token_module";
import os from "os";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import {execSync} from "child_process";
import {TransactionBlock} from "@mysten/sui.js/transactions";
import {getFullnodeUrl, SuiClient, SuiHTTPTransport} from "@mysten/sui.js/client";
import {Ed25519Keypair} from "@mysten/sui.js/keypairs/ed25519";
import {toPascalCase, toSnakeCase, toSnakeCaseUpper} from "./lib";
import cors from "cors";
import { WebSocket } from 'ws';
import {createPrivateKey} from "node:crypto";

const keypair = Ed25519Keypair.deriveKeypair(
    process.env.TEST_MNEMONICS || process.env.PRIVATE_KEY_MNEMONIC || "", //different devs w/ different naming, converge on PRIVATE_KEY_MNEMONIC later
    "m/44'/784'/0'/0'/0'"
);

const network = process.env.NETWORK || "localnet";
// const network = "mainnet"
if (network !== "localnet" && network !== "testnet" && network !== "mainnet" && network !== "devnet") {
    throw new Error(`Invalid network: ${network}. Please use localnet, testnet, mainnet, or devnet`);
}
const rpcUrl = getFullnodeUrl(network);
console.log("Using network: ", network, " with RPC URL: ", rpcUrl);
const client = new SuiClient({
    transport: new SuiHTTPTransport({
        url: getFullnodeUrl('mainnet'),
        // The typescript definitions may not match perfectly, casting to never avoids these minor incompatibilities
        WebSocketConstructor: WebSocket as never,
    }),
});

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/coins", async (req, res) => {
    try {
        const coins = await prisma.coin.findMany();
        res.json(coins);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
});

app.get("/coins/:id", async (req, res) => {
    const {id} = req.params;
    try {
        const coin = await prisma.coin.findUnique({
            where: {packageId: id},
        });
        if (coin) {
            res.json(coin);
        } else {
            res.status(404).json({error: "Coin not found"});
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
});

app.post("/coins", async (req, res) => {
    const {
        creator,
        decimals,
        name,
        symbol,
        description,
        iconUrl,
        website,
        twitterUrl,
        discordUrl,
        telegramUrl,
    } = req.body;
    try {
        // @voyager, put your Sui logic to create the coin here
        // If we can't do this on chain, I think the rough steps are:
        // First version: Just create a token, don't worry about collecting a fee

        // --Basic validation--
        //Check that name and symbol only have valid characters since they'll mess with compilation if malformed
        if (!/^[A-Za-z0-9 ]+$/.test(req.body.name)) {
            return res.send({error: "name should only contain alphanumeric characters and spaces"});
        }
        if (!/^[A-Za-z0-9]+$/.test(req.body.symbol)) { //TODO What is the max length of a symbol?
            return res.send({error: "symbol should only contain alphanumeric characters"});
        }

        // -- Load the token template and populate it with the token details using handlebars --

        console.log("name", name)
        console.log("sname", toSnakeCase(name))
        console.log("snameupper", toSnakeCaseUpper(name))
        const templateData = {
            name_snake_case_caps: toSnakeCase(name).toUpperCase(),
            name_snake_case: toSnakeCase(name),
            name_capital_camel_case: toPascalCase(name),
            decimals,
            symbol,
            description,
            icon_url: iconUrl,
        };
        const tokenCode = tokenTemplate(templateData);
        console.log(tokenCode);
        const moveToml = moveTomlTemplate({});

        const id = crypto.randomBytes(16).toString("hex");

        // TODO: which directory should we use?
        const homeDir = os.homedir();
        const uniqueDir = path.join(homeDir, "coins", id);
        const coinDir = path.join(
            uniqueDir,
            "coins",
            id,
            "we-hate-the-ui-contracts"
        );
        const sourcesDir = path.join(coinDir, "sources");
        const coinFilePath = path.join(sourcesDir, `coin.move`);
        const moveTomlFilePath = path.join(coinDir, `Move.toml`);

        fs.mkdirSync(coinDir, {recursive: true});
        fs.mkdirSync(sourcesDir);

        fs.writeFileSync(coinFilePath, tokenCode);
        fs.writeFileSync(moveTomlFilePath, moveToml);

        const compiledModulesAndDependencies = JSON.parse(
            execSync(`sui move build --dump-bytecode-as-base64 --path ${coinDir}`, {
                encoding: "utf-8",
            })
        );

        // console.log(compiledModulesAndDependencies);

        const tx = new TransactionBlock();
        tx.setSenderIfNotSet(keypair.getPublicKey().toSuiAddress());
        const [upgradeCap] = tx.publish({
            modules: compiledModulesAndDependencies.modules,
            dependencies: compiledModulesAndDependencies.dependencies,
        });

        const [coinGas] = tx.splitCoins(tx.gas, [100000]);

        tx.transferObjects(
          [coinGas],
          tx.pure(keypair.getPublicKey().toSuiAddress())
        );

        tx.transferObjects(
            [upgradeCap],
            tx.pure(keypair.getPublicKey().toSuiAddress())
        );

        console.log("signerAddress: " + keypair.toSuiAddress())
        let response = await client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx,
            options: {
                showBalanceChanges: true,
                showEffects: true,
                showEvents: true,
                showInput: true,
                showObjectChanges: true,
            },
        });
        //TODO Should check the response to see if it errored, and return 500 with the error if it did. Try removing the validation on name above and pass in a symbol to the name to test error behavior.

        const storeObjectTypeRegex = /^0x[0-9a-f]{64}::[\w]+::[\w]+Store$/;
        //@ts-ignore-next-line
        const publishedPackageId = response.objectChanges?.find(change => change.type === 'published')?.packageId;
        //@ts-ignore-next-line
        const storeObjectId = response.objectChanges?.find(change => change.type === "created" && storeObjectTypeRegex.test(change.objectType))?.objectId;

        fs.rmSync(uniqueDir, {recursive: true, force: true});

        // we should extract the PACKAGE_ID and COIN_STORE_ID and store it in the database
        console.log(response);
        // 2. See if you can deploy the token code to the chain with the Sui sdk: https://docs.sui.io/guides/developer/app-examples/weather-oracle#initialize-the-project
        // 3. (Later) Register the token with the management contract, and transfer the treasury cap to the management contract
        // Second version, later: User must submit 5 SUI to the manager contract for a fee, which we check here. User submits a signature, we extract the address, check if they paid the fee on chain, and move forward with coin creation if the have.
        const coin = await prisma.coin.create({
            data: {
                packageId: publishedPackageId,
                storeId: storeObjectId,
                module: toSnakeCase(name),
                creator,
                decimals,
                name,
                symbol,
                description,
                iconUrl,
                website,
                twitterUrl,
                discordUrl,
                telegramUrl,
                coinType: `${publishedPackageId}::${toSnakeCase(name)}::${toSnakeCaseUpper(name)}`,
            },
        });
        res.json(coin);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
});

// TODO We want the backend to track the contract. You can't do an update of this data on chain currently, so you
// shouldn't be able to update through the REST API. When you enable this route again, you MUST require a signature
// and ensure that only the creator can call the REST API route.

app.put("/coins/:id", async (req, res) => {
    const {id} = req.params;
    const {
        creator,
        decimals,
        name,
        symbol,
        description,
        iconUrl,
        website,
        twitterUrl,
        discordUrl,
        telegramUrl,
    } = req.body;
    try {
        /*
      TODO the step by step for this call:
      1. Take X-Authorization-Signature from the headers
      2. (this is the Eth workflow) Extract the address from the signature
      3. Fetch the Coin w/ objectId from the database (we can fetch from the database, the contract verifies as well so if the two are desynced, the on-chain update will fail)
      4. Check that the coin from the database has the same creator as the address from the signature. If they don't match, return a 401
      5. Update the coin on-chain using a PTB
      6. Read the mutated objectId from the PTB
      7. Fetch the coin from the chain
      8. Verify the coin from the chain has the same metadata the user requested to update. If it doesn't, return a 500.
      9. Finally update the database with the updated metadata
      */
        //     const coin = await prisma.coin.update({
        //       where: { objectId: id },
        //       data: {
        //         creator,
        //         decimals,
        //         name,
        //         symbol,
        //         description,
        //         iconUrl,
        //         website,
        //         twitterUrl,
        //         discordUrl,
        //         telegramUrl,
        //       },
        //     });
        //     res.json(coin);
        return res.status(405).json({error: "Method not allowed"});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
});



// Package is on Testnet.
// const provider = new JsonRpcProvider(testnetConnection);
// const Package = '<PACKAGE_ID>';

// const MoveEventType = '<PACKAGE_ID>::<MODULE_NAME>::<METHOD_NAME>';

// console.log(
//     await provider.getObject({
//         id: Package,
//         options: { showPreviousTransaction: true },
//     }),
// );


const server = app.listen(process.env.PORT || 3005, () =>
    console.log(`
🚀 Server ready at: http://127.0.0.1:${process.env.PORT || 3005}
`)
);


// const startListener = async () => {
//     let unsubscribe = await client.subscribeEvent({
//         filter: { Package: "0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66" },
//         // filter: {  },
//         onMessage: (event) => {
//
//             console.log('subscribeEvent', JSON.stringify(event, null, 2));
//         },
//     });
//
//     process.on('SIGINT', async () => {
//         console.log('Interrupted...');
//         if (unsubscribe) {
//             await unsubscribe();
//             server.close()
//             //@ts-ignore-next-line
//             unsubscribe = undefined;
//         }
//     });
// }


// startListener()


