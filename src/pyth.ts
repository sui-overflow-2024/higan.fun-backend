// Demo script for fetching Sui price from Pyth. Call w/ `ts-node src/pyth.ts`
import axios from "axios";

//
// (async () => {
//     const connection = new SuiPriceServiceConnection(
//         "https://hermes-beta.pyth.network"
//     ); // See Hermes endpoints section below for other endpoints
//
//     const priceIds = [
//         // You can find the ids of prices at https://pyth.network/developers/price-feed-ids
//         "0xf9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b", // BTC/USD price id in testnet
//         "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
//     ];
//
// // In order to use Pyth prices in your protocol you need to submit the price update data to Pyth contract in your target
// // chain. `getPriceUpdateData` creates the update data which can be submitted to your contract.
//
//     const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);
//
//     console.log(priceUpdateData)
// })()
//


(async () => {
    const res = await axios.get('https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744')
    const priceObj = res.data?.parsed?.[0]?.price;
    const {price, expo} = priceObj;
    console.log(price, expo)
    const priceNumber = price * Math.pow(10, expo);
    console.log("Price in USD: $", priceNumber.toString())
})()
