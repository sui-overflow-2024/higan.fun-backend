import handlebars from 'handlebars';

export const tokenTemplate =
  handlebars.compile(`module we_hate_the_ui_contracts::{{name_snake_case}} {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::tx_context::{sender};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::url;
    use std::string::{Self, String};
    use std::debug;
    use std::ascii;
    // use sui::math;
    use sui::event;

    const ENotEnoughSuiForCoinPurchase: u64 = 0;
    const ETokenNotOpenForBuySell: u64 = 1;
    const ETokenAlreadyInitialized: u64 = 2;
    const EInvalidOwner: u64 = 3;
    const EValMustBeGreaterThanZero: u64 = 4;
    const EClosingNonPendingCoin: u64 = 5;

    #[allow(unused_const)]
    const POINT_ZERO_ONE_SUI: u64 = 10_000_000; //0.01 SUI
    #[allow(unused_const)]
    const POINT_ONE_SUI: u64 = 100_000_000; //0.1 SUI
    #[allow(unused_const)]
    const ONE_SUI: u64 = 1_000_000_000; //1 SUI
    const PRICE_INCREASE_PER_COIN: u64 = 1; // INCREASE PRICE BY ONE MIST PER COIN MINTED
    const INITIAL_COIN_PRICE: u64 = 1_000; // 0.000001 SUI

    // Statuses for coin lifecycle
    const STATUS_STARTING_UP: u64 = 0; // Coin has been created, but we need to do a follow up call to init metadata
    const STATUS_OPEN: u64 = 1; // Coin is ready for buys/sells
    const STATUS_CLOSE_PENDING: u64 = 2; // Coin has hit target, but we haven't yet created the LP for it
    const STATUS_CLOSED: u64 = 3; // We have created the LP, burned the LP tokens, and the initial bonding curve is done

    /// Note: For some reason the OTW has to be named the same as the address
    public struct {{name_snake_case_caps}} has drop {}

    // OTW, burned after the creator is set
    public struct SetCriticalMetadataCap has key {
        id: UID
    }

    public struct WithdrawCap has key {
        id: UID
    }

    public struct CoinSocialsUpdatedEvent has copy, drop {
        coin_store_id: ID,
        twitter_url: String,
        telegram_url: String,
        discord_url: String,
        website_url: String,
        sender: address
    }

    public struct SwapEvent has copy, drop {
        is_buy: bool,
        sui_amount: u64,
        coin_amount: u64,
        coin_price: u64,
        total_sui_reserve: u64,
        total_supply: u64,
        account: address
    }
    public struct CoinStatusChangedEvent has copy, drop {
        old_status: u64,
        new_status: u64,
    }

    // #[allow(lint(coin_field))]
    public struct {{name_capital_camel_case}}Store has key {
        id: UID,
        treasury: TreasuryCap<{{name_snake_case_caps}}>,
        // Later we should support dynamic metadata, but for now lets use fields
        creator: address,
        publisher: address,
        telegram_url: String,
        discord_url: String,
        twitter_url: String,
        website_url: String,
        sui_coin_amount: Balance<SUI>,
        status: u64,
        target: u64 //Amount in MIST that when crossed closes the token
    }

    fun init(witness: {{name_snake_case_caps}}, ctx: &mut TxContext) {
        let iconUrl = option::some(url::new_unsafe(ascii::string(b"{{coin_metadata_icon_url}}")));
        let (treasury_cap, coin_metadata) = coin::create_currency<{{name_snake_case_caps}}>(witness, 3, b"{{name_snake_case_caps}}", b"{{coin_metadata_symbol}}", b"{{coin_metadata_description}}", iconUrl, ctx);
        transfer::public_freeze_object(coin_metadata);

        // create and share the {{name_capital_camel_case}}Store
        transfer::share_object({{name_capital_camel_case}}Store {
            id: object::new(ctx),
            treasury: treasury_cap,
            creator: ctx.sender(), //TODO Figure out how to populate this in the template
            publisher: ctx.sender(),
            website_url: string::utf8(b"{{optional_metadata_website_url}}"),
            telegram_url: string::utf8(b"{{optional_metadata_telegram_url}}"),
            discord_url: string::utf8(b"{{optional_metadata_discord_url}}"),
            twitter_url: string::utf8(b"{{optional_metadata_twitter_url}}"),
            sui_coin_amount: balance::zero(),
            status: STATUS_STARTING_UP,
            target: 0 // TODO when you figure out how to populate creator, also populate this
        });

        transfer::transfer(SetCriticalMetadataCap {
            id: object::new(ctx)
        }, ctx.sender());
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
        assert!(self.status == STATUS_OPEN, ETokenNotOpenForBuySell);
        assert!(coin::value(&payment) >= get_coin_buy_price(self, mintAmount), ENotEnoughSuiForCoinPurchase);

        let payment_amount = coin::value(&payment);

        coin::put(&mut self.sui_coin_amount, payment);

        coin::mint_and_transfer(&mut self.treasury, mintAmount, sender(ctx), ctx);

        let balance_after: u64 = balance::value<SUI>(&self.sui_coin_amount) + payment_amount;

        if(balance_after >= self.target){
            self.status = STATUS_CLOSE_PENDING;
            event::emit(CoinStatusChangedEvent {
                old_status: STATUS_OPEN,
                new_status: STATUS_CLOSE_PENDING
            });
        };

        event::emit(SwapEvent {
            is_buy: true,
            sui_amount: payment_amount,
            coin_amount: mintAmount,
            coin_price: get_coin_price(self),
            total_sui_reserve: self.sui_coin_amount.value(),
            total_supply: coin::total_supply(&self.treasury),
            account: ctx.sender()
        });
    }

    //TODO Later remove the below and return coin for PTB
    #[allow(lint(self_transfer))]
     public fun sell_coins(
        self: &mut {{name_capital_camel_case}}Store, payment: Coin<{{name_snake_case_caps}}>, ctx: &mut TxContext
    ){
        assert!(self.status == STATUS_OPEN, ETokenNotOpenForBuySell);
        let burnAmount = coin::value(&payment);

        // Take sui from the balance of this contract
        let returnSui = coin::take(&mut self.sui_coin_amount, burnAmount, ctx);

        coin::burn(&mut self.treasury, payment);


        event::emit(SwapEvent {
            is_buy: false,
            sui_amount: returnSui.value(),
            coin_amount: burnAmount,
            coin_price: get_coin_price(self),
            total_sui_reserve: self.sui_coin_amount.value(),
            total_supply: coin::total_supply(&self.treasury),
            account: ctx.sender()
        });

        transfer::public_transfer(returnSui, ctx.sender())
    }


    public fun get_sui_balance(self: &{{name_capital_camel_case}}Store): u64 {
        self.sui_coin_amount.value()
    }

    public fun get_coin_total_supply(self: &{{name_capital_camel_case}}Store): u64 {
        coin::total_supply(&self.treasury)
    }

    // Returns current price of the token based on the bonding curve
    public fun get_coin_price(self: &{{name_capital_camel_case}}Store): u64 {
        let total_supply: u64 = coin::total_supply(&self.treasury);

        if (total_supply == 0) {
            // get initial price
            INITIAL_COIN_PRICE
        } else {
            ((PRICE_INCREASE_PER_COIN * total_supply) + INITIAL_COIN_PRICE)
        }
    }

    // Returns the amount in SUI a user must pay to buy some amount of the token
    public fun get_coin_buy_price(self: &{{name_capital_camel_case}}Store, payment: u64): u64 {
        let s0: u64 = coin::total_supply(&self.treasury);
        let s1: u64 = s0 + payment;

        //Formula that considers integer division edge cases
        //m * (S1 * (S1 + 1) - S0 * (S0 + 1)) / 2 + b * (S1 - S0)
        let total_cost = (PRICE_INCREASE_PER_COIN * (s1 * (s1 + 1) - s0 * (s0 + 1)) / 2) + (INITIAL_COIN_PRICE * (s1 - s0));
        // let total_cost = (100 * (math::pow(s1, 2) - math::pow(s0, 2)) / 2) + (initialPrice * (s1 - s0));

        total_cost
    }

    // Returns the amount in SUI a user will receive for selling some amount of the token
    public fun get_coin_sell_price(self: &{{name_capital_camel_case}}Store, payment: u64): u64 {
        let s0: u64 = coin::total_supply(&self.treasury);
        let s1: u64 = s0 - payment;

        //m * (S0 * (S0 + 1) - S1 * (S1 + 1)) / 2 + b * (S0 - S1)
        let total_cost = (PRICE_INCREASE_PER_COIN * (s0 * (s0 + 1) - s1 * (s1 + 1)) / 2) + (INITIAL_COIN_PRICE * (s0 - s1));

        total_cost
    }

    // Set the critical metadata for the coin, creator and target
    // TODO, we have logic here to make sure this only gets called once, but really we want to burn the cap and check that the cap is burned before engaging w/ the token
    public fun set_critical_metadata(self: &mut {{name_capital_camel_case}}Store, _: &mut SetCriticalMetadataCap, target: u64, creator: address){
        assert!(self.status == STATUS_STARTING_UP, ETokenAlreadyInitialized);
        assert!(target > 0, EValMustBeGreaterThanZero);
        self.target = target;
        self.creator = creator;
        self.status = STATUS_OPEN;
        event::emit(CoinStatusChangedEvent {
            old_status: STATUS_STARTING_UP,
            new_status: STATUS_OPEN
        });
    }

    // We use web2 calls to create + manage the LP, once we're done we can close the token
    public fun close_coin_sales(self: &mut {{name_capital_camel_case}}Store, _: &SetCriticalMetadataCap, ctx: &mut TxContext){
        assert!(self.creator == ctx.sender(), EInvalidOwner);
        assert!(self.status == STATUS_CLOSE_PENDING, EClosingNonPendingCoin);
        self.status = STATUS_CLOSED;
        //TODO We need to transfer the treasury cap to the creator
        // transfer::public_transfer(self.treasury, self.creator);
        event::emit(CoinStatusChangedEvent {
            old_status: STATUS_CLOSE_PENDING,
            new_status: STATUS_CLOSED
        });
    }

    public fun set_coin_social_metadata(self: &mut {{name_capital_camel_case}}Store, telegram_url: String, discord_url: String, twitter_url: String, website_url: String, ctx: &mut TxContext) {
        //TODO Code smell, with this block we MUST update socials before setting critical metadata, since crit metadata updates creator
        assert!(self.creator == ctx.sender(), EInvalidOwner);

        self.telegram_url = telegram_url;
        self.discord_url = discord_url;
        self.twitter_url = twitter_url;
        self.website_url = website_url;

        event::emit(CoinSocialsUpdatedEvent {
            coin_store_id: object::id(self),
            telegram_url: telegram_url,
            discord_url: discord_url,
            twitter_url: twitter_url,
            website_url: website_url,
            sender: ctx.sender()
        });
    }


    public fun dump_self(self: &{{name_capital_camel_case}}Store) {
        debug::print(self)
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