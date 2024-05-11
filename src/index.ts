import { PrismaClient } from "@prisma/client";
import express from "express";
import {tokenTemplate, moveTomlTemplate} from "./templates/token_module";
import os from 'os';
import fs from 'fs'
import crypto from 'crypto'
import path from 'path';
import { execSync } from "child_process";
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";

const keypair = Ed25519Keypair.deriveKeypair(process.env.TEST_MNEMONICS || '', "m/44'/784'/0'/0'/0'");
const rpcUrl = getFullnodeUrl('localnet');
const client = new SuiClient({ url: rpcUrl });

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

app.get("/coins", async (req, res) => {
  try {
    const coins = await prisma.coin.findMany();
    res.json(coins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/coins/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const coin = await prisma.coin.findUnique({
      where: { objectId: id },
    });
    if (coin) {
      res.json(coin);
    } else {
      res.status(404).json({ error: "Coin not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
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
    // 1. Load the token template and populate it with the token details using handlebars
    const templateData = {
        name_snake_case_caps: name.replace(" ", "_").toUpperCase(),
        name_snake_case: name.toLowerCase().replace(" ", "_"),
        decimals,
        symbol,
        description,
        icon_url: iconUrl,
        };
    const tokenCode = tokenTemplate(templateData);
    const moveToml = moveTomlTemplate({});

    const id = crypto.randomBytes(16).toString("hex");

    // TODO: which directory should we use?
    const homeDir = os.homedir();
    const uniqueDir = path.join(homeDir, 'coins', id);
    const coinDir = path.join(uniqueDir, 'coins', id, 'we-hate-the-ui-contracts');
    const sourcesDir = path.join(coinDir, 'sources');
    const coinFilePath = path.join(sourcesDir, `coin.move`);
    const moveTomlFilePath = path.join(coinDir, `Move.toml`);

    fs.mkdirSync(coinDir, { recursive: true });
    fs.mkdirSync(sourcesDir);

    fs.writeFileSync(coinFilePath, tokenCode);
    fs.writeFileSync(moveTomlFilePath, moveToml);

    const compiledModulesAndDependencies = JSON.parse(
      execSync(
        `sui move build --dump-bytecode-as-base64 --path ${coinDir}`,
        {
          encoding: "utf-8",
        }
      )
    );

    console.log(compiledModulesAndDependencies);

    const tx = new TransactionBlock();
    const [upgradeCap] = tx.publish({
      modules: compiledModulesAndDependencies.modules,
      dependencies: compiledModulesAndDependencies.dependencies,
    });

    const [coinGas] = tx.splitCoins(tx.gas, [100]);

    tx.transferObjects([coinGas], tx.pure(keypair.getPublicKey().toSuiAddress()));
    tx.transferObjects([upgradeCap], tx.pure(keypair.getPublicKey().toSuiAddress()));

    let response = await client.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
    });

    fs.rmSync(uniqueDir, { recursive: true, force: true });

    // we should extract the PACKAGE_ID, TREASURY_CAP, OBJECT_ID and store it in the database
    console.log(response)
    // 2. See if you can deploy the token code to the chain with the Sui sdk: https://docs.sui.io/guides/developer/app-examples/weather-oracle#initialize-the-project
    // 3. (Later) Register the token with the management contract, and transfer the treasury cap to the management contract
    // Second version, later: User must submit 5 SUI to the manager contract for a fee, which we check here. User submits a signature, we extract the address, check if they paid the fee on chain, and move forward with coin creation if the have.

    const coin = await prisma.coin.create({
      data: {
        // TODO below should come from Sui deploy
        objectId: Math.random().toString(36).substring(7),
        treasuryCapId: Math.random().toString(36).substring(7),
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
      },
    });
    res.json(coin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/coins/:id", async (req, res) => {
  const { id } = req.params;
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
    const coin = await prisma.coin.update({
      where: { objectId: id },
      data: {
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
      },
    });
    res.json(coin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/coins/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const coin = await prisma.coin.delete({
      where: { objectId: id },
    });
    res.json(coin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const server = app.listen(process.env.PORT || 3004, () =>
  console.log(`
🚀 Server ready at: http://127.0.0.1:${process.env.PORT || 3004}
`)
);
