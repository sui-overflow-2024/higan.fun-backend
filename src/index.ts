import express from "express";
import cors from "cors";
import coinRouter from "./routes/coins"
import postRouter from "./routes/thread"
import tradesRouter from "./routes/trades"
import morgan from "morgan";
import {client, config, prisma} from "./config";
import type {SuiEvent} from "@mysten/sui.js/client";
import {toPascalCase, toSnakeCase} from "./lib";
import {moveTomlTemplate, tokenTemplate} from "./templates/token_module";
import os from "os";
import path from "path";
import fs from "fs";
import {exec} from "node:child_process";
import {TransactionBlock} from "@mysten/sui.js/transactions";
import {CoinStatus, EventType} from "./types";
import crypto from "crypto";
import * as http from "http";
import {Coin, Post, Trade} from "./generated/prisma/client";
import {Server, Socket} from "socket.io";


type ReceiptFields = {
    creator: string,
    name: string,
    symbol: string,
    decimals: string,
    description: string,
    icon_url: string,
    website_url: string,
    twitter_url: string,
    discord_url: string,
    telegram_url: string,
    target: string
}
type EventMessage = Coin | Post | { trade: Trade, coin: Coin }


const app = express();
export const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins
    }
});

io.on('connection', (ws: Socket) => {
    console.log('Client connected');

    ws.on('message', (message: string) => {
        console.log(`Received message => ${message}`);
    });
    ws.on('pong', () => {
        console.log('Received pong from client');
    });
    ws.on('close', () => {
        console.log('Client disconnected');
    });

});

// Function to broadcast messages to all connected clients
export const broadcastToWs = (event: string, data: EventMessage) => {
    io.emit(event, data);
};
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(coinRouter)
app.use(postRouter)
app.use(tradesRouter)


server.listen(config.port, () =>
    console.log(`
🚀 Server ready at: http://127.0.0.1:${config.port}
`)
);

const {keypair} = config;
let unsubscribe: any
const extractEventMetadata = (event: any): { eventType: EventType, packageId: string, txDigest: string } => {
    let eventType = event.type.split('::').at(-1);
    let packageId = event.packageId;
    let txDigest = event.id.txDigest;
    return {eventType, packageId, txDigest};

}

const processPrepayForListingEvent = async (event: SuiEvent & {
    parsedJson: {
        receipt: string,
    }
}) => {
    let {
        receipt,
    } = event.parsedJson;
    const {data, error} = await client.getObject({
        id: receipt,
        options: {
            showBcs: false,
            showContent: true,
            showDisplay: true,
            showOwner: true,
            showPreviousTransaction: false,
            showStorageRebate: false,
            showType: true,
        }
    })
    if (error) {
        console.error("Error fetching receipt, need a backup plan here", error)
        return
    }
    // @ts-ignore
    if (!data?.content?.fields) {
        console.error("No fields in receipt", data)
        return
    }
    try {

        const {
            creator,
            name,
            symbol,
            decimals,
            description,
            icon_url,
            website_url,
            twitter_url,
            discord_url,
            telegram_url,
            target
            // @ts-ignore
        }: ReceiptFields = data.content.fields;
        console.log("RECEIPT", data)

        const templateData = {
            name_snake_case_caps: toSnakeCase(name).toUpperCase(),
            name_snake_case: toSnakeCase(name),
            name_capital_camel_case: toPascalCase(name),
            coin_metadata_decimals: decimals,
            coin_metadata_icon_url: icon_url,
            coin_metadata_symbol: symbol,
            coin_metadata_description: description,
            optional_metadata_website_url: website_url,
            optional_metadata_twitter_url: twitter_url,
            optional_metadata_discord_url: discord_url,
            optional_metadata_telegram_url: telegram_url,
        };

        const tokenCode = tokenTemplate(templateData);
        const moveToml = moveTomlTemplate({});

        console.log("tokenCode: ", tokenCode)

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

        exec(`sui move build --dump-bytecode-as-base64 --path ${coinDir}`, async (error: any, stdout: any, stderr: any) => {
            console.log('stdout: ' + stdout);
            console.log("error" + error);
            console.log("stderr" + stderr);

            if (error !== null) {
                console.log('exec error building the coin: ' + error);
                return
            }

            const compiledModulesAndDependencies = JSON.parse(stdout);
            const tx = new TransactionBlock();
            tx.setSenderIfNotSet(keypair.getPublicKey().toSuiAddress());
            const [upgradeCap] = tx.publish({
                modules: compiledModulesAndDependencies.modules,
                dependencies: compiledModulesAndDependencies.dependencies,
            });

            tx.transferObjects(
                [upgradeCap],
                tx.pure(keypair.getPublicKey().toSuiAddress())
            );

            console.log("signerAddress: " + keypair.toSuiAddress())
            const response = await client.signAndExecuteTransactionBlock({
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
            console.log("Finished publishing coin, now listing on the manager contract...", response.objectChanges)
            //@ts-ignore-next-line
            const publishedPackageId = response.objectChanges?.find(change => change.type === 'published')?.packageId;
            //@ts-ignore-next-line
            const coinType = `${publishedPackageId}::${templateData.name_snake_case}::${templateData.name_snake_case_caps}`;
            const treasuryCapType = `0x2::coin::TreasuryCap<${coinType}>`
            //@ts-ignore-next-line
            const treasuryCapObjectId = response.objectChanges?.find(change => change.type === "created" && change.objectType == treasuryCapType)?.objectId;

            const coinMetadataType = `0x2::coin::CoinMetadata<${coinType}>`;
            //@ts-ignore-next-line
            const coinMetadata = response.objectChanges?.find(change => change.type === "created" && change.objectType == coinMetadataType)?.objectId;

            console.log("coin metadata", coinMetadata)

            fs.rmSync(uniqueDir, {recursive: true, force: true});

            console.log("debug listing")
            console.log(config.managementAdminCapId)
            console.log(`${config.managementPackageId}::${config.managementModuleName}::list`)
            console.log(treasuryCapObjectId)
            console.log(receipt)
            console.log(`${publishedPackageId}::${templateData.name_snake_case}::${templateData.name_snake_case_caps}`)
            console.log("end...")
            const listCoinTx = new TransactionBlock();
            listCoinTx.setSenderIfNotSet(keypair.getPublicKey().toSuiAddress());
            console.log("target", `${config.managementPackageId}::${config.managementModuleName}::list`)
            console.log("args", config.managementAdminCapId, treasuryCapObjectId, receipt)
            console.log("types", `${publishedPackageId}::${templateData.name_snake_case}::${templateData.name_snake_case_caps}`)
            listCoinTx.moveCall({
                target: `${config.managementPackageId}::${config.managementModuleName}::list`,
                arguments: [
                    listCoinTx.object(config.managementAdminCapId),
                    listCoinTx.object(treasuryCapObjectId),
                    listCoinTx.object(coinMetadata),
                    listCoinTx.object(receipt),
                ],
                typeArguments: [`${publishedPackageId}::${templateData.name_snake_case}::${templateData.name_snake_case_caps}`]
            });
            const listCoinResponse = await client.signAndExecuteTransactionBlock({
                signer: keypair,
                transactionBlock: listCoinTx,
                options: {
                    showBalanceChanges: true,
                    showEffects: true,
                    showEvents: true,
                    showInput: true,
                    showObjectChanges: true,
                },
            });

            const bondingCurveType = `${config.managementPackageId}::${config.managementModuleName}::BondingCurve<${coinType}>`;
            //@ts-ignore-next-line
            const bondingCurveId = listCoinResponse.objectChanges?.find(change => change.type === "created" && change.objectType == bondingCurveType)?.objectId;

            console.log("coin metadata", listCoinResponse.objectChanges)
            if (bondingCurveId === undefined) {
                throw new Error("BondingCurve not found in response after listing coin");
            }

            console.log(listCoinResponse)

            const coin = await prisma.coin.create({
                data: {
                    packageId: publishedPackageId,
                    bondingCurveId: bondingCurveId,
                    module: toSnakeCase(name),
                    creator,
                    decimals: parseInt(decimals),
                    name,
                    symbol,
                    description,
                    iconUrl: icon_url,
                    websiteUrl: website_url,
                    twitterUrl: twitter_url,
                    discordUrl: discord_url,
                    telegramUrl: telegram_url,
                    target: BigInt(target),
                    status: CoinStatus.ACTIVE,
                    coinMetadataId: coinMetadata
                },
            });
            broadcastToWs("coinCreated", coin)

            console.log("Coin created", coin)

        })

    } catch (error) {
        console.error("uncaught error creating coin: ", error);
    }

}
const processSocialsUpdatedEvent = async (event: SuiEvent & {
    parsedJson: {
        bonding_curve_id: string,
        discord_url: string;
        twitter_url: string;
        website_url: string;
        telegram_url: string;
    }
}) => {
    console.log("COIN_SOCIALS_UPDATED_EVENT", event.parsedJson);
    let {bonding_curve_id, discord_url, twitter_url, website_url, telegram_url} = event.parsedJson;
    console.log()

    await prisma.coin.update({
        where: {bondingCurveId: bonding_curve_id},
        data: {
            discordUrl: discord_url,
            twitterUrl: twitter_url,
            websiteUrl: website_url,
            telegramUrl: telegram_url,
        },
    });
}

const processSwapEvent = async (event: SuiEvent & {
    parsedJson: {
        bonding_curve_id: string,
        is_buy: boolean,
        sui_amount: string,
        coin_amount: string,
        account: string,
        coin_price: bigint,
        total_sui_reserve: bigint,
        total_supply: bigint,
    }
}) => {
    let {
        bonding_curve_id,
        is_buy,
        sui_amount,
        coin_amount,
        account,
        coin_price,
        total_sui_reserve,
        total_supply,
    } = event.parsedJson;

    const trade = await prisma.trade.create({
        data: {
            suiAmount: parseInt(sui_amount),
            coinAmount: parseInt(coin_amount),
            account: account,
            coinId: bonding_curve_id,
            transactionId: event.id.txDigest,
            isBuy: is_buy,
            coinPrice: coin_price,
        }
    });

    let oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const coin = await prisma.coin.update({
        where: {
            bondingCurveId: bonding_curve_id
        },
        data: {
            suiReserve: total_sui_reserve,
        }
    });
    broadcastToWs("tradeCreated", {trade, coin})
}

const processStatusUpdatedEvent = async (event: SuiEvent & {
    parsedJson: {
        bonding_curve_id: string
        old_status: string,
        new_status: string
    }
}) => {
    let {bonding_curve_id, old_status, new_status} = event.parsedJson;
    const oldStatus = parseInt(old_status) as CoinStatus
    const newStatus = parseInt(new_status) as CoinStatus
    await prisma.coin.update({
        where: {bondingCurveId: bonding_curve_id},
        data: {
            status: newStatus,
        }
    })
    console.log("STATUS_UPDATED_EVENT", event.parsedJson)
    console.log("oldStatus", oldStatus)
    console.log("newStatus", newStatus)

    if (oldStatus == CoinStatus.ACTIVE && newStatus == CoinStatus.CLOSE_PENDING) {
        const coin = await prisma.coin.findFirst({
            where: {
                bondingCurveId: bonding_curve_id
            }
        })
        if (!coin) throw new Error(`couldn't find coin when doing status change, bondingCurveId: ${bonding_curve_id}`)
        const txb = new TransactionBlock()
        txb.moveCall({
            target: `${config.managementPackageId}::manager_contract::create_lp`,
            arguments: [
                txb.object(config.managementAdminCapId),
                txb.object(bonding_curve_id),
                txb.object(config.kriyaProtocolConfigsId),
                txb.object(coin.coinMetadataId),
                txb.object(config.suiCoinMetadataId),
            ],
            typeArguments: [
                `${coin.packageId}::${coin.module}::${coin.module.toUpperCase()}`,
            ],
        });

        const postLpResponse = await client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: txb,
            options: {
                showBalanceChanges: true,
                showEffects: true,
                showEvents: true,
                showInput: true,
                showObjectChanges: true,
            },
        });
        console.log("postLpResponse", postLpResponse)


        const poolType = `${config.kriyaPackageId}::spot_dex::Pool<${coin.packageId}::${coin.module}::${coin.module.toUpperCase()}, 0x2::sui::SUI>`;
        console.log("coinMetadataType", poolType)
        // '0xb5722117aec83525c71f84c31c1f28e29397feffa95c99cce72a150a555a63dd::spot_dex::Pool<0xff56cdad27d53306ef75e40dbcf84826307922e09406306b6f7ed1319ed541ad::tribuo_delego_defungo::TRIBUO_DELEGO_DEFUNGO, 0x2::sui::SUI>',
        //  0x520b2471ff20ee7b851265c1f4feca4b15bd714cb7a04db652de50a7746f91ea::spot_dex::Pool<0xa26728ed29bd6f9f8f6d359ac3b52bc94053f8675425dd8d20cd809aaca31044::pax_advenio::PAX_ADVENIO, 0x2::sui::SUI>
        //@ts-ignore-next-line
        const pool = postLpResponse.objectChanges?.find(change => change.type === "created" && change.objectType == poolType)?.objectId;
        console.log("poolId", pool)
        await prisma.coin.update({
            where: {
                bondingCurveId: bonding_curve_id
            },
            data: {
                poolId: pool
            }
        })

        // const getTheLiquidity = new TransactionBlock()
        //
        //
        // const txb2 = new TransactionBlock()
        // txb2.moveCall({
        //     target: `${config.managementPackageId}::manager_contract::add_initial_liquidity`,
        //     arguments: [
        //         txb2.object(config.managementAdminCapId),
        //         txb2.object(bonding_curve_id),
        //         txb2.object(pool),
        //     ],
        //     typeArguments: [
        //         `${coin.packageId}::${coin.module}::${coin.module.toUpperCase()}`,
        //     ],
        // });
        //
        // const deliciousLiquidity = await client.signAndExecuteTransactionBlock({
        //     signer: keypair,
        //     transactionBlock: txb2,
        //     options: {
        //         showBalanceChanges: true,
        //         showEffects: true,
        //         showEvents: true,
        //         showInput: true,
        //         showObjectChanges: true,
        //     },
        // });
        // console.log("deliciousLiquidity", deliciousLiquidity)

    }

}
const startListener = async () => {
    console.log(`${new Date().toLocaleString()} listener for events on the management contract. managementPackageId: 
    ${config.managementPackageId} managementConfigId ${config.managementConfigId}`);

    unsubscribe = await client.subscribeEvent({
        filter: {Package: config.managementPackageId},
        onMessage: async (event: SuiEvent & { parsedJson: any }) => {
            const {eventType, packageId, txDigest} = extractEventMetadata(event);
            console.log("EVENT", event)
            if (eventType === EventType.PREPAY_FOR_LISTING_EVENT) {
                await processPrepayForListingEvent(event);
            } else if (eventType == EventType.COIN_SOCIALS_UPDATED_EVENT) {
                await processSocialsUpdatedEvent(event);
            } else if (eventType === EventType.SWAP_EVENT) {
                await processSwapEvent(event);
            } else if (eventType === EventType.STATUS_UPDATED_EVENT) {
                await processStatusUpdatedEvent(event);
            }
        },
    });

    // Query the DB for coins, only return the packageId
    // Compare the DB collection to the current collection of coins
    // If changed, restart the event listener with a filter containing the updated list of coins.


    process.on('SIGINT', async () => {
        console.log('Interrupted...');
        if (unsubscribe) {
            await unsubscribe();
            server.close()
            //@ts-ignore-next-line
            unsubscribe = undefined;
        }
    });
    return unsubscribe;
}
startListener()

// RELOAD listener when a coin is created