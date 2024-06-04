// Type guard to check if an array consists only of strings
import {prisma} from "../config";
import express from "express";
import Joi from "joi";

function isStringArray(arr: any[]): arr is string[] {
    return arr.every(item => typeof item === 'string');
}

type SortOrder = 'asc' | 'desc';


const router = express.Router()
router.get("/coins/top", async (_, res) => {
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
                bondingCurveId: coinId,
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
                            mode: 'insensitive',
                        },
                    },
                    {
                        symbol: {
                            startsWith: term,
                            mode: 'insensitive',
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
                    bondingCurveId: {
                        in: coinIds,
                    },
                },
            });

            const coinMap = new Map(coins.map(coin => [coin.bondingCurveId, coin]));
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

router.get('/coins/:id/holders', async (req, res) => {
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

router.get('/coins/:bondingCurveId/tvl24h', async (req, res) => {
    const id = req.params.bondingCurveId;
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);
    console.log("twentyFourHoursAgo", twentyFourHoursAgo)
    console.log("id", id)

    const aggregateTradingVolume = await prisma.trade.groupBy({
        by: ['coinId'],
        where: {
            createdAt: {
                gte: twentyFourHoursAgo,
            },
            coin: {
                bondingCurveId: id,
            }
        },
        _sum: {
            suiAmount: true
        },
    });
    console.log("aggregateTradingVolume", aggregateTradingVolume)
    return res.json({
        bondingCurveId: id,
        tvl: aggregateTradingVolume[0]?._sum?.suiAmount || 0,
    })
})

// Get posts for a given bonding curve
router.get('/coins/:coinId/posts', async (req, res) => {
    let {coinId} = req.params;

    const threads = await prisma.post.findMany({
        where: {
            coinId: coinId,
        },
        orderBy: {
            createdAt: 'desc'
        }
    },);

    return res.json(threads);
});

export default router