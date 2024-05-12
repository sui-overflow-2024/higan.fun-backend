import handlebars from 'handlebars';

export const tokenTemplate =
  handlebars.compile(`/// Example custom coin. The backend uses this as a template 
module we_hate_the_ui_contracts::{{name_snake_case}} {
    use std::option;
    use sui::coin::{Self, Coin, TreasuryCap, CoinMetadata};
    use sui::transfer;
    use sui::tx_context::{Self, sender, TxContext};
    use sui::token::{Self, Token, ActionRequest}; // See here for the difference between coin and token: https://docs.sui.io/standards/closed-loop-token/coin-token-comparison
    use sui::object::{Self, UID};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use std::string::{Self, String};
    use std::debug;

    const POINT_ZERO_ONE_SUI: u64 = 10_000_000; //0.01 SUI
    const POINT_ONE_SUI: u64 = 100_000_000; //0.1 SUI
    const ONE_SUI: u64 = 1_000_000_000; //1 SUI

    /// The OTW for coin creation, must have the same name as the module
    public struct {{name_snake_case_caps}} has drop {}
    
    // OTW for setting the creator, must be burned for the creator to be set
    public struct SetCreatorCap has key {
        id: UID
    }


    public struct {{name_capital_camel_case}}Store has key {
        id: UID,
        /// The Treasury Cap for the in-game currency.
        treasury: TreasuryCap<{{name_snake_case_caps}}>,
        metadata: CoinMetadata<{{name_snake_case_caps}}>,
        // Later we should support dynamic metadata, but for now lets use fields
        creator: address,
        discordUrl: String,
        twitterUrl: String,
        websiteUrl: String,
        sui_coin_amount: Balance<SUI>,
        // whitepaperUrl: String,
    }

    fun init(witness: {{name_snake_case_caps}}, ctx: &mut TxContext) {
        // Get a treasury cap for the coin and give it to the transaction sender
        let (treasury_cap, coin_metadata) = coin::create_currency<{{name_snake_case_caps}}>(witness, 9, b"{{name_snake_case_caps}}S", b"XMPS", b"", option::none(), ctx);
        // transfer::public_freeze_object(coin_metadata); //TODO There is a follow up function to seal properties on the token, don't forget to freeze the metadata at that time
        
        // create and share the {{name_capital_camel_case}}Store
        transfer::share_object({{name_capital_camel_case}}Store {
            id: object::new(ctx),
            treasury: treasury_cap,
            metadata: coin_metadata,
            creator: ctx.sender(),
            discordUrl: string::utf8(b""),
            twitterUrl: string::utf8(b""),
            websiteUrl: string::utf8(b""),
            sui_coin_amount: balance::zero(),
            // whitepaperUrl: String::from(""),
        });

    }

    // Manager will eventually transfer the treasury cap to the creator
    public fun transfer_cap(treasury_cap: TreasuryCap<{{name_snake_case_caps}}>, target: address){
        //I'm not positive this is secure, in theory: There is only one treasury cap, the person who called init has it, 
        // so the only person who should be able to transfer it in the person who called init?
        transfer::public_transfer(treasury_cap, target);
    }

    // When we want to get fancy with PTBs, we should return the token instead of calling mint and transfer, and let the user do whatever they want to do with it
    // PTBs are awkward with the CLI, so do this towards the end of the project when we're all good w/ Sui Move
    public fun buy_coins(
        self: &mut {{name_capital_camel_case}}Store, payment: Coin<SUI>, ctx: &mut TxContext
    ){
        //Later we want to return the token and the request here and consume in a PTB. For now this just mints and transfers inline for ease of use.
        // : (Token<{{name_snake_case_caps}}>, ActionRequest<{{name_snake_case_caps}}>){ 

        //TODO Make sure that coins are still allowed to be purchased from the bonding curve
        //TODO Should require a minimum amount so the user doesn't lose a signficant percentage with integer division
            // and so it always looks like a gain in the explorer when they sell (fringe issue we saw when buying and selling 1 MIST)
            // Maybe require 1,000,000 MIST minimum? 0.0001 SUI?
        
        let mintAmount = coin::value(&payment);

        coin::put(&mut self.sui_coin_amount, payment);

        coin::mint_and_transfer(&mut self.treasury, mintAmount, sender(ctx), ctx);
    }


     public fun sell_coins(
        self: &mut {{name_capital_camel_case}}Store, payment: Coin<{{name_snake_case_caps}}>, ctx: &mut TxContext
    ){
        let burnAmount = coin::value(&payment);
        
        // Take sui from the balance of this contract
        let returnSui = coin::take(&mut self.sui_coin_amount, burnAmount, ctx);

        coin::burn(&mut self.treasury, payment);
        
        transfer::public_transfer(returnSui, ctx.sender())
    }

    public fun dump_self(self: &{{name_capital_camel_case}}Store) {
        debug::print(self)
    }

    #[test_only]
    /// Wrapper of module initializer for testing
    public fun test_init(ctx: &mut TxContext) {   
        init({{name_snake_case_caps}} {}, ctx)
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