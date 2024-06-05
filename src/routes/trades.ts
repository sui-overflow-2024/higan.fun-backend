import {prisma} from "../config";
import express from "express";


const router = express.Router();

router.get('/trades', async (req, res) => {
    try {
        let limit = req.query.limit ? parseInt(req.query.limit as string) : undefined; // Add limit
        let order: 'asc' | 'desc' = req.query.order === 'asc' ? 'asc' : 'desc'; // Add order

        // TODO: apply a limit ?
        const trades = await prisma.trade.findMany({
            include: {
                coin: true
            },
            take: limit, // Use limit
            orderBy: {
                createdAt: order
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


export default router;