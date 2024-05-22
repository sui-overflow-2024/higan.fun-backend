import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js";


(async () => {
    const connection = new SuiPriceServiceConnection(
        "https://hermes-beta.pyth.network"
    ); // See Hermes endpoints section below for other endpoints

    const priceIds = [
        // You can find the ids of prices at https://pyth.network/developers/price-feed-ids
        "0xf9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b", // BTC/USD price id in testnet
        "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
    ];

// In order to use Pyth prices in your protocol you need to submit the price update data to Pyth contract in your target
// chain. `getPriceUpdateData` creates the update data which can be submitted to your contract.

    const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);

    console.log(priceUpdateData)
})()

