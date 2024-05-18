import handlebars from 'handlebars';

export const tokenTemplate =
  handlebars.compile(`
#[allow(duplicate_alias)]
module we_hate_the_ui_contracts::{{name_snake_case}} {
    use std::option;
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::transfer;
    use sui::tx_context::{sender, TxContext};
    use sui::object::{Self, UID};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use std::string::{Self, String};
    use std::debug;
    // use sui::math;

    const ENotEnoughSuiForCoinPurchase: u64 = 1;
    #[allow(unused_const)]
    const POINT_ZERO_ONE_SUI: u64 = 10_000_000; //0.01 SUI
    #[allow(unused_const)]
    const POINT_ONE_SUI: u64 = 100_000_000; //0.1 SUI
    #[allow(unused_const)]
    const ONE_SUI: u64 = 1_000_000_000; //1 SUI
    const PRICE_INCREASE_PER_COIN: u64 = 1; // INCREASE PRICE BY ONE MIST PER COIN MINTED
    const INITIAL_COIN_PRICE: u64 = 1_000; // 0.000001 SUI

    /// Note: For some reason the OTW has to be named the same as the address
    public struct {{name_snake_case_caps}} has drop {}

    // OTW, burned after the creator is set
    public struct SetCreatorCap has key {
        id: UID
    }

    public struct WithdrawCap has key {
        id: UID
    }

    // public struct LinearBondingCurve has key, store {
    //     id: UID,
    //     total_supply: Balance<{{name_snake_case_caps}}>,
    //     reserve_balance: Balance<SUI>,
    // }

    // #[allow(lint(coin_field))]
    public struct {{name_capital_camel_case}}Store has key {
        id: UID,
        treasury: TreasuryCap<{{name_snake_case_caps}}>,
        // Later we should support dynamic metadata, but for now lets use fields
        creator: address,
        publisher: address,
        discordUrl: String,
        twitterUrl: String,
        websiteUrl: String,
        sui_coin_amount: Balance<SUI>,
        // whitepaperUrl: String,
    }

    fun init(witness: {{name_snake_case_caps}}, ctx: &mut TxContext) {
        let (treasury_cap, coin_metadata) = coin::create_currency<{{name_snake_case_caps}}>(witness, 3, b"{{name_snake_case_caps}}", b"XMP", b"", option::none(), ctx);
        transfer::public_freeze_object(coin_metadata); 

        // create and share the {{name_capital_camel_case}}Store
        transfer::share_object({{name_capital_camel_case}}Store {
            id: object::new(ctx),
            treasury: treasury_cap,
            creator: ctx.sender(),
            publisher: ctx.sender(),
            discordUrl: string::utf8(b""),
            twitterUrl: string::utf8(b""),
            websiteUrl: string::utf8(b""),
            sui_coin_amount: balance::zero()
            // whitepaperUrl: String::from(""),
        });

    }


    // Manager will eventually transfer the treasury cap to the creator
    public fun transfer_cap(treasury_cap: TreasuryCap<{{name_snake_case_caps}}>, target: address){
        //I'm not positive this is secure, in theory: There is only one treasury cap, the person who called init has it,
        // so the only person who should be able to transfer it in the person who called init?
        transfer::public_transfer(treasury_cap, target);
    }

    public fun buy_coins(
        self: &mut {{name_capital_camel_case}}Store, payment: Coin<SUI>, mintAmount: u64, ctx: &mut TxContext
    ){
        //TODO: Later we want to return the token and the request here and consume in a PTB. For now this just mints inline for ease of use.
        // : (Token<{{name_snake_case_caps}}>, ActionRequest<{{name_snake_case_caps}}>){
        

        debug::print(&string::utf8(b"payment value"));
        debug::print(&coin::value(&payment));
        assert!(coin::value(&payment) >= get_coin_buy_price(self, mintAmount), ENotEnoughSuiForCoinPurchase); 
      

        coin::put(&mut self.sui_coin_amount, payment);

        coin::mint_and_transfer(&mut self.treasury, mintAmount, sender(ctx), ctx);
    }

    //TODO Later remove the below and return coin for PTB
    #[allow(lint(self_transfer))]
     public fun sell_coins(
        self: &mut {{name_capital_camel_case}}Store, payment: Coin<{{name_snake_case_caps}}>, ctx: &mut TxContext
    ){
        let burnAmount = coin::value(&payment);

        // Take sui from the balance of this contract
        let returnSui = coin::take(&mut self.sui_coin_amount, burnAmount, ctx);

        coin::burn(&mut self.treasury, payment);


        transfer::public_transfer(returnSui, ctx.sender())
    }

    public fun get_coin_price(self: &{{name_capital_camel_case}}Store): u64 {
        let total_supply: u64 = coin::total_supply(&self.treasury);

        debug::print(&string::utf8(b"total supply"));
        debug::print(&total_supply);
        if (total_supply == 0) {
            // get initial price
            INITIAL_COIN_PRICE
        } else {
            // MIST
            // + slope
            // m + supply + b
            // 100 mist per token
            
            ((PRICE_INCREASE_PER_COIN * total_supply) + INITIAL_COIN_PRICE)
        }

    }

    public fun get_sui_balance(self: &{{name_capital_camel_case}}Store): u64 {
        self.sui_coin_amount.value()
    }

    public fun get_coin_buy_price(self: &{{name_capital_camel_case}}Store, payment: u64): u64 {
        let s0: u64 = coin::total_supply(&self.treasury);
        let s1: u64 = s0 + payment;

        let total_cost = (PRICE_INCREASE_PER_COIN * (s1 * (s1 + 1) - s0 * (s0 + 1)) / 2) + (INITIAL_COIN_PRICE * (s1 - s0));
        // let total_cost = (100 * (math::pow(s1, 2) - math::pow(s0, 2)) / 2) + (initialPrice * (s1 - s0));

        total_cost
    }

    public fun get_coin_sell_price(self: &{{name_capital_camel_case}}Store, payment: u64): u64 {
        let s0: u64 = coin::total_supply(&self.treasury);
        let s1: u64 = s0 - payment;

        //m * (S0 * (S0 + 1) - S1 * (S1 + 1)) / 2 + b * (S0 - S1)
        let total_cost = (PRICE_INCREASE_PER_COIN * (s0 * (s0 + 1) - s1 * (s1 + 1)) / 2) + (INITIAL_COIN_PRICE * (s0 - s1));

        total_cost
    }

    public fun sell_action(): String { string::utf8(b"sell_token") }
    public fun dump_self(self: &{{name_capital_camel_case}}Store) {
        debug::print(self)
    }


    #[test_only] use sui::test_scenario;
    #[test]
    fun test_buy_price() {
          // Initialize a mock sender address
        let addr1 = @0xA;
        // Begins a multi-transaction scenario with addr1 as the sender
        let mut scenario = test_scenario::begin(addr1);

        // scenario.next_tx(addr1);
        {
            init({{name_snake_case_caps}} {}, scenario.ctx());
        };

        test_scenario::next_tx(&mut scenario, addr1);
        {
            let mut coinExampleStore = test_scenario::take_shared<{{name_capital_camel_case}}Store>(&scenario);

            let coinPrice = get_coin_price(&coinExampleStore);
            assert!(coinPrice == 1_000, 0);
            let buy100Price = get_coin_buy_price(&coinExampleStore, 100_000);
            debug::print(&string::utf8(b"buy100Price"));
            debug::print(&buy100Price);
            assert!(buy100Price == 5_100_050_000, 0);
            let coin = coin::mint_for_testing<SUI>(buy100Price, test_scenario::ctx(&mut scenario));

            

            // debug::print(&get_coin_buy_price(&coinExampleStore), 100);

            buy_coins(&mut coinExampleStore, coin, 100_000, test_scenario::ctx(&mut scenario));

            let reserve_balance = &coinExampleStore.sui_coin_amount;
            assert!(reserve_balance.value() == buy100Price, 0);
            assert!(coin::total_supply(&coinExampleStore.treasury) == 100_000, 0);

            // 100,500,000,000,000
            // 100 mist increase per token
            // we have 1_000_000_000 because we swap 1 SUI for 1 coin
            // let coinPrice = get_coin_buy_price(&coinExampleStore);
            // debug::print(&coinPrice);
            // assert!(coinPrice == 101_000_000_000, 0);
            // second buy
            // let coin2 = coin::mint_for_testing<SUI>(1_000_000_000, test_scenario::ctx(&mut scenario));
            // buy_coins(&mut coinExampleStore, coin2, test_scenario::ctx(&mut scenario));


            test_scenario::return_shared(coinExampleStore);
        };
        // Cleans up the scenario object
        scenario.end();
    }
}
`);

export const moveTomlTemplate = handlebars.compile(`
[package]
name = "we_hate_the_ui_contracts"
edition = "2024.beta" # edition = "legacy" to use legacy (pre-2024) Move
# license = ""           # e.g., "MIT", "GPL", "Apache 2.0"
# authors = ["..."]      # e.g., ["Joe Smith (joesmith@noemail.com)", "John Snow (johnsnow@noemail.com)"]

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "devnet" }

[addresses]
we_hate_the_ui_contracts = "0x0"
`)