// Type guard to check if an array consists only of strings
import {toPascalCase, toSnakeCase, toSnakeCaseUpper} from "../lib";
import {moveTomlTemplate, tokenTemplate} from "../templates/token_module";
import crypto from "crypto";
import os from "os";
import path from "path";
import fs from "fs";
import {client, prisma} from "../config";
import express from "express";
import {Ed25519Keypair} from "@mysten/sui.js/keypairs/ed25519";
import {verifyPersonalMessage} from '@mysten/sui.js/verify';

import {TransactionBlock} from "@mysten/sui.js/transactions";
import Joi from "joi";

const exec = require('child_process').exec;

const keypair = Ed25519Keypair.deriveKeypair(
    process.env.TEST_MNEMONICS || process.env.PRIVATE_KEY_MNEMONIC || "", //different devs w/ different naming, converge on PRIVATE_KEY_MNEMONIC later
    "m/44'/784'/0'/0'/0'"
);

enum CoinStatus {
    STARTING_UP = 0,
    ACTIVE = 1,
    CLOSE_PENDING = 2,
    CLOSED = 3,
}

function isStringArray(arr: any[]): arr is string[] {
    return arr.every(item => typeof item === 'string');
}

const router = express.Router()
router.get("/top_coins", async (req, res) => {
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

    if(aggregateTradingVolume.length > 0) {
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

        if (typeof packageIdsRaw === "string") {
            packageIds = [packageIdsRaw];
        } else if (Array.isArray(packageIdsRaw) && isStringArray(packageIdsRaw)) {
            packageIds = packageIdsRaw;
        }

        let coins;
        if (packageIds && Array.isArray(packageIds) && packageIds.length) {
            coins = await prisma.coin.findMany({
                where: {
                    packageId: {
                        in: packageIds
                    }
                },
                select: {
                    packageId: true
                }, orderBy: {
                    packageId: "asc"
                }
            });
        } else {
            coins = await prisma.coin.findMany();
        }

        res.json(coins);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
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

router.get('/coins/:id/holders', async (req, res) => {
    const {id} = req.params;
    try {
        const result : AccountTokens[] = await prisma.$queryRaw`
        SELECT
          account,
          SUM(CASE WHEN "isBuy" THEN "coinAmount" ELSE -"coinAmount" END) AS totalTokens
        FROM
          "Trade"
        WHERE
          "coinId" = ${id}
        GROUP BY
          account;
      `;

        // const holders = result.map(row => ({
        //     account: row.account,
        //     totalTokens: row.totaltokens.toString(), // Convert bigint to string if required
        // }));

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
    website: Joi.string().optional().allow(''),
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

    try {
        const {
            decimals,
            name,
            symbol,
            description,
            iconUrl,
            website,
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
            optional_metadata_website_url: website,
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
                res.status(500).json({error: "Internal server error"});
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
            const storeObjectTypeRegex = /^0x[0-9a-f]{64}::[\w]+::[\w]+Store$/;
            const critMetaObjectTypeRegex = /^.*SetCriticalMetadataCap$/; //TODO Regex is sloppy
            //@ts-ignore-next-line
            const publishedPackageId = response.objectChanges?.find(change => change.type === 'published')?.packageId;
            //@ts-ignore-next-line
            const storeObjectId = response.objectChanges?.find(change => change.type === "created" && storeObjectTypeRegex.test(change.objectType))?.objectId;
            //@ts-ignore-next-line
            const critMetaObjectId = response.objectChanges?.find(change => change.type === "created" && critMetaObjectTypeRegex.test(change.objectType))?.objectId;

            fs.rmSync(uniqueDir, {recursive: true, force: true});

            console.log(response);
            const coin = await prisma.coin.create({
                data: {
                    packageId: publishedPackageId,
                    storeId: storeObjectId,
                    module: toSnakeCase(name),
                    creator: publicKey.toSuiAddress(),
                    decimals,
                    name,
                    symbol,
                    description,
                    iconUrl,
                    website,
                    twitterUrl,
                    discordUrl,
                    telegramUrl,
                    target,
                    status: CoinStatus.STARTING_UP,
                    coinType: `${publishedPackageId}::${toSnakeCase(name)}::${toSnakeCaseUpper(name)}`,
                },
            });

            const setCreatorTx = new TransactionBlock();

            console.log(response.objectChanges?.find((change) => {
                //@ts-ignore-next-line
                console.log(change.objectType)
                //@ts-ignore-next-line
                console.log(critMetaObjectTypeRegex.test(change.objectType))
                //@ts-ignore-next-line
                return change.type === "created" && critMetaObjectTypeRegex.test(change.objectType)
            }));
            console.log(response.objectChanges?.find(change => change.type === "created"));

            console.log(storeObjectId, critMetaObjectId, target, publicKey.toSuiAddress());
            setCreatorTx.setSenderIfNotSet(keypair.getPublicKey().toSuiAddress());
            setCreatorTx.moveCall({
                target: `${publishedPackageId}::${toSnakeCase(name)}::set_critical_metadata`,
                arguments: [
                    setCreatorTx.object(storeObjectId),
                    setCreatorTx.object(critMetaObjectId),
                    setCreatorTx.pure.u64(target),
                    setCreatorTx.pure.address(publicKey.toSuiAddress()),
                ],
            })
            const setCreatorResponse = await client.signAndExecuteTransactionBlock({
                signer: keypair,
                transactionBlock: setCreatorTx,
                options: {
                    showBalanceChanges: true,
                    showEffects: true,
                    showEvents: true,
                    showInput: true,
                    showObjectChanges: true,
                },
            });
            console.log("setCreatorResponse", setCreatorResponse);
            return res.json(coin);
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
});


export default router