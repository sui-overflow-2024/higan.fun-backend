// Type guard to check if an array consists only of strings
import {toPascalCase, toSnakeCase} from "../lib";
import {moveTomlTemplate, tokenTemplate} from "../templates/token_module";
import crypto from "crypto";
import os from "os";
import path from "path";
import fs from "fs";
import {client, config, prisma} from "../config";
import express from "express";
import {verifyPersonalMessage} from '@mysten/sui.js/verify';

import {TransactionBlock} from "@mysten/sui.js/transactions";
import Joi from "joi";
import {CoinStatus} from "../types";

const exec = require('child_process').exec;


function isStringArray(arr: any[]): arr is string[] {
    return arr.every(item => typeof item === 'string');
}

const router = express.Router()
router.get("/top_coins", async (_, res) => {
    let hottest = undefined;
    let newest = await prisma.coin.findFirst({
        orderBy: {
            createdAt: 'desc'
        }
    });


    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);

    const aggregateTradingVolume = await prisma.trade.groupBy({
        by: ['coinId'],
        where: {
            createdAt: {
                gte: twentyFourHoursAgo,
            },
        },
        _sum: {
            suiAmount: true
        },
        orderBy: {
            _sum: {
                suiAmount: 'desc',
            },
        },
        take: 1,
    });

    if (aggregateTradingVolume.length > 0) {
        const coinId = aggregateTradingVolume[0].coinId;
        hottest = await prisma.coin.findFirst({
            where: {
                packageId: coinId,
            },
        });
    }

    let imminent = await prisma.coin.findFirst({
        where: {
            suiReserve: {
                lt: prisma.coin.fields.target,
            },
        },
        orderBy: {
            suiReserve: 'desc', // Order by suiReserve descending
        },
    });

    res.json({
        newest,
        hottest: hottest || newest,
        imminent: imminent,
    })
});

type SortOrder = 'asc' | 'desc';

router.get("/coins", async (req, res) => {
    try {
        let packageIds: string[] = [];
        let packageIdsRaw = req.query.packageIds;
        let creatorRaw = req.query.creator;

        if (typeof packageIdsRaw === "string") {
            packageIds = packageIdsRaw.split(",");
        } else if (Array.isArray(packageIdsRaw) && isStringArray(packageIdsRaw)) {
            packageIds = packageIdsRaw;
        }

        const whereArgs: any = {}
        if (packageIds.length > 0) {
            whereArgs["packageId"] = {
                in: packageIds
            }
        }
        if (creatorRaw) {
            whereArgs["creator"] = creatorRaw;
        }

        const coins = await prisma.coin.findMany({
            where: whereArgs,
        });


        return res.json(coins);
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: "Internal server error"});
    }
});

const searchCoinsSchema = Joi.object({
    order: Joi.string().valid('asc', 'desc').optional(),
    sort: Joi.string().valid('created', 'marketCap', 'tvl').optional(),
    term: Joi.string().allow('').optional(),
});
router.get("/coins/search", async (req, res) => {
    // TODO: fix later
    const validation = searchCoinsSchema.validate(req.query);

    if (validation.error) {
        return res.status(400).send(validation.error.details[0].message);
    }

    let sortBy = 'createdAt';
    let order: SortOrder = (req.query.order === 'asc' || req.query.order === 'desc') ? req.query.order : 'desc';
    let sort = req.query.sort;
    let term = req.query.term as string;
    let whereClause = {};
    try {
        if (term) {
            whereClause = {
                OR: [
                    {
                        name: {
                            contains: term,
                            //   mode: 'sensitive',
                        },
                    },
                    {
                        symbol: {
                            startsWith: term,
                            // mode: 'insensitive',
                        },
                    },
                ],
            };
        }

        if (sort === 'marketCap') {
            sortBy = 'suiReserve';
        }

        if (sort === 'tvl') {
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);

            const aggregateTradingVolume = await prisma.trade.groupBy({
                by: ['coinId'],
                where: {
                    createdAt: {
                        gte: twentyFourHoursAgo,
                    },
                    coin: {
                        ...whereClause,
                    }
                },
                _sum: {
                    suiAmount: true
                },
                orderBy: {
                    _sum: {
                        suiAmount: order,
                    },
                }
            });

            const coinIds = aggregateTradingVolume.map(trade => trade.coinId);

            const coins = await prisma.coin.findMany({
                where: {
                    packageId: {
                        in: coinIds,
                    },
                },
            });

            const coinMap = new Map(coins.map(coin => [coin.packageId, coin]));
            const sortedCoins = coinIds.map(id => coinMap.get(id));

            res.json(sortedCoins);

            return;
        }

        let coins = await prisma.coin.findMany({
            where: whereClause,
            orderBy: {
                [sortBy]: order
            }
        });

        res.json(coins);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
});

router.get("/coins/:id", async (req, res) => {
    const {id} = req.params;
    try {
        const coin = await prisma.coin.findUnique({
            where: {bondingCurveId: id},
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

router.get('/coins/:id/trades', async (req, res) => {
    const {id} = req.params;
    try {
        // TODO: apply a limit ?
        const trades = await prisma.trade.findMany({
            where: {coinId: id},
            orderBy: {
                createdAt: "desc"
            }
        });

        const tradesJson = JSON.stringify(trades, (_, value) =>
            typeof value === 'bigint' ? value.toString() : value
        );

        res.json(JSON.parse(tradesJson))
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
});

interface AccountTokens {
    account: string;
    totalTokens: number;
}

router.get('/coin/:id/holders', async (req, res) => {
    const {id} = req.params;
    try {
        const result: AccountTokens[] = await prisma.$queryRaw`
            SELECT account                                                         as address,
                   SUM(CASE WHEN "isBuy" THEN "coinAmount" ELSE -"coinAmount" END) AS balance
            FROM "Trade"
            WHERE "coinId" = ${id}
            GROUP BY account;
        `;

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
});

const postCoinSchema = Joi.object({
    decimals: Joi.number().required(),
    name: Joi.string().required().regex(/^[A-Za-z0-9 ]+$/),
    symbol: Joi.string().required().regex(/^[A-Za-z0-9]+$/),
    description: Joi.string().required(),
    iconUrl: Joi.string().required(),
    websiteUrl: Joi.string().optional().allow(''),
    twitterUrl: Joi.string().optional().allow(''),
    discordUrl: Joi.string().optional().allow(''),
    telegramUrl: Joi.string().optional().allow(''),
    target: Joi.number().required().greater(0),
    signature: Joi.string().required(),
});

router.post("/coins", async (req, res) => {
    const validation = postCoinSchema.validate(req.body);
    console.log("validation", validation)
    if (validation.error) {
        return res.status(400).send(validation.error.details[0].message);
    }
    const {keypair} = config;

    try {
        const {
            decimals,
            name,
            symbol,
            description,
            iconUrl,
            websiteUrl,
            twitterUrl,
            discordUrl,
            telegramUrl,
            target,
            signature,
        } = req.body;

        const publicKey = await verifyPersonalMessage(new TextEncoder().encode(symbol), signature);


        const templateData = {
            name_snake_case_caps: toSnakeCase(name).toUpperCase(),
            name_snake_case: toSnakeCase(name),
            name_capital_camel_case: toPascalCase(name),
            coin_metadata_decimals: decimals, //NOTE: Decimals are hardcoded to 3 in the template contract, this does nothing
            coin_metadata_icon_url: iconUrl,
            coin_metadata_symbol: symbol,
            coin_metadata_description: description,
            optional_metadata_website_url: websiteUrl,
            optional_metadata_twitter_url: twitterUrl,
            optional_metadata_discord_url: discordUrl,
            optional_metadata_telegram_url: telegramUrl,
        };

        const tokenCode = tokenTemplate(templateData);
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


        exec(`sui move build --dump-bytecode-as-base64 --path ${coinDir}`, async (error: any, stdout: any, stderr: any) => {
            console.log('stdout: ' + stdout);
            console.log("error" + error);
            console.log("stderr" + stderr);

            if (error !== null) {
                console.log('exec error: ' + error);
                return res.status(500).json({error: "Internal server error"});
            }

            const compiledModulesAndDependencies = JSON.parse(stdout);
            const tx = new TransactionBlock();
            tx.setSenderIfNotSet(config.keypair.getPublicKey().toSuiAddress());
            const [upgradeCap] = tx.publish({
                modules: compiledModulesAndDependencies.modules,
                dependencies: compiledModulesAndDependencies.dependencies,
            });
            // const res = tx.publish({
            //     modules: compiledModulesAndDependencies.modules,
            //     dependencies: compiledModulesAndDependencies.dependencies,
            // });
            //
            // const upgradeCap = res[0];
            tx.transferObjects(
                [upgradeCap],
                tx.pure(config.keypair.getPublicKey().toSuiAddress())
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
            //@ts-ignore-next-line
            const publishedPackageId = response.objectChanges?.find(change => change.type === 'published')?.packageId;
            //@ts-ignore-next-line
            // const storeObjectId = response.objectChanges?.find(change => change.type === "created" && storeObjectTypeRegex.test(change.objectType))?.objectId;
            const coinType = `${publishedPackageId}::${templateData.name_snake_case}::${templateData.name_snake_case_caps}`;
            const treasuryCapType = `0x2::coin::TreasuryCap<${coinType}>`
            //@ts-ignore-next-line
            const treasuryCapObjectId = response.objectChanges?.find(change => change.type === "created" && change.objectType == treasuryCapType)?.objectId;
            //@ts-ignore-next-line

            fs.rmSync(uniqueDir, {recursive: true, force: true});

            const listCoinTx = new TransactionBlock();
            listCoinTx.setSenderIfNotSet(keypair.getPublicKey().toSuiAddress());
            listCoinTx.moveCall({
                target: `${config.managementPackageId}::${config.managementModuleName}::list`,
                arguments: [
                    listCoinTx.object(config.managementAdminCapId),
                    listCoinTx.object(treasuryCapObjectId),
                    listCoinTx.pure(publicKey.toSuiAddress()),
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

            if (bondingCurveId === undefined) {
                return res.status(500).json({error: "Internal server error, BondingCurve not found"});
            }

            console.log(listCoinResponse)

            const coin = await prisma.coin.create({
                data: {
                    packageId: publishedPackageId,
                    bondingCurveId: bondingCurveId,
                    module: toSnakeCase(name),
                    creator: publicKey.toSuiAddress(),
                    decimals,
                    name,
                    symbol,
                    description,
                    iconUrl,
                    websiteUrl,
                    twitterUrl,
                    discordUrl,
                    telegramUrl,
                    target,
                    status: CoinStatus.STARTING_UP,
                },
            });

            return res.json(coin);
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
});


export default router