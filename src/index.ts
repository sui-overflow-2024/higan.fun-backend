import express from "express";
import cors from "cors";
import coinRouter from "./routes/coins"
import postRouter from "./routes/thread"
import morgan from "morgan";
import { prisma } from "./config";
import { client } from "./config";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(coinRouter)
app.use(postRouter)

const server = app.listen(process.env.PORT || 3000, () =>
    console.log(`
🚀 Server ready at: http://127.0.0.1:${process.env.PORT || 3000}
`)
);

const COIN_SOCIALS_UPDATED_EVENT = 'CoinSocialsUpdatedEvent'
const STATUS_UPDATED_EVENT = 'CoinStatusChangedEvent'
const SWAP_EVENT = 'SwapEvent'

let globalCoins: { packageId: string }[] = [];
//
// let unsubscribe: any
// const startListener = async () => {
//     globalCoins = await prisma.coin.findMany({
//         select: {
//             packageId: true
//         },
//         orderBy: {
//             packageId: 'asc'
//         }
//     });
//     let packagesIds = globalCoins.map(({packageId}) => {
//         return {Package: packageId};
//     });

//     console.log(`${new Date().toLocaleString()} listener for events on this package ids `, packagesIds)

//     unsubscribe = await client.subscribeEvent({
//         // filter: {Package: "0xb96d1556fa6a9f42ac8027b3acd7818691bcc08488dab542678b908dfc80f88f"},
//         filter: {Any: packagesIds},
//         onMessage: async (event: any) => {
//             let eventType = event.type.split('::').at(-1);
//             let packageId = event.packageId;
//             let txDigest = event.id.txDigest;

//             console.log(eventType);
//             console.log('subscribeEvent', JSON.stringify(event, null, 2));

//             if (eventType == COIN_SOCIALS_UPDATED_EVENT) {
//                 let {discord_url, twitter_url, website_url, telegram_url} = event.parsedJson;

//                 const coin = await prisma.coin.update({
//                     where: {packageId: packageId},
//                     data: {
//                         discordUrl: discord_url,
//                         twitterUrl: twitter_url,
//                         website: website_url,
//                         telegramUrl: telegram_url,
//                     },
//                 });
//             } else if (eventType === SWAP_EVENT) {
//                 let {
//                     is_buy,
//                     sui_amount,
//                     coin_amount,
//                     account,
//                     coin_price,
//                     total_sui_reserve,
//                     total_supply,
//                 } = event.parsedJson;
//                 console.log(event.parsedJson)
//                 console.log(is_buy, "isBuy");

//                 await prisma.trade.create({
//                     data: {
//                         suiAmount: parseInt(sui_amount),
//                         coinAmount: parseInt(coin_amount),
//                         account: account,
//                         coinId: packageId,
//                         transactionId: txDigest,
//                         isBuy: is_buy,
//                         coinPrice: coin_price,
//                     }
//                 });

//                 let oneDayAgo = new Date();
//                 oneDayAgo.setHours(oneDayAgo.getHours() - 24);

//                 await prisma.coin.update({
//                     where: {
//                         packageId: packageId
//                     },
//                     data: {
//                         suiReserve: total_sui_reserve,
//                     }
//                 });

//             } else if (eventType === STATUS_UPDATED_EVENT) {
//                 console.log("STATUS_UPDATED_EVENT", event.parsedJson)
//                 let {new_status} = event.parsedJson;
//                 await prisma.coin.update({
//                     where: {packageId: packageId},
//                     data: {
//                         status: parseInt(new_status),
//                     }
//                 })
//             }
//         },
//     });

//     // Query the DB for coins, only return the packageId
//     // Compare the DB collection to the current collection of coins
//     // If changed, restart the event listener with a filter containing the updated list of coins.


//     process.on('SIGINT', async () => {
//         console.log('Interrupted...');
//         if (unsubscribe) {
//             await unsubscribe();
//             server.close()
//             //@ts-ignore-next-line
//             unsubscribe = undefined;
//         }
//     });
//     return unsubscribe;
// }
// startListener()

// setInterval(async () => {
//     try {
//         let needsRefresh = false;
//         const coins = await prisma.coin.findMany({
//             select: {
//                 packageId: true
//             },
//             orderBy: {
//                 packageId: 'asc'
//             }
//         });
//         //   update
//         if (globalCoins.length != coins.length) {
//             // needs refresh
//             console.log("globalCoins.length != coins.length", globalCoins.length, coins.length)
//             needsRefresh = true;
//         } else {
//             for (let i = 0; i < coins.length; i++) {
//                 if (globalCoins[i].packageId !== coins[i].packageId) {
//                     console.log("globalCoins[i] !== coins[i]", globalCoins[i], coins[i])
//                     needsRefresh = true;
//                     break;
//                 }
//             }
//         }
//         if (needsRefresh) {
//             console.log("Refreshing listener on coins")
//             await unsubscribe();
//             unsubscribe = await startListener();
//         }
//     } catch (error) {

//         console.log("Refreshing listener on coins failed", error)
//         await unsubscribe();
//         unsubscribe = await startListener();
//         console.error('Failed to fetch coins:', error);
//     }
// }, 5000);

// RELOAD listener when a coin is created