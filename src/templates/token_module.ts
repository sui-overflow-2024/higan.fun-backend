import handlebars from 'handlebars';

export const tokenTemplate = handlebars.compile(`
module we_hate_the_ui_contracts::{{token_snake_case}} {
    use std::option;
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    /// Name of the coin. By convention, this type has the same name as its parent module
    /// and has no fields. The full type of the coin defined by this module will be COIN<{{token_sname_case_caps}}>.
    /// Note: For some reason the OTW has to be named the same as the address
    public struct {{name_snake_case_caps}} has drop {}

    /// Register the managed currency to acquire its TreasuryCap. Because
    /// this is a module initializer, it ensures the currency only gets
    /// registered once.
    fun init(witness: {{name_snake_case_caps}}, ctx: &mut TxContext) {
        // Get a treasury cap for the coin and give it to the transaction sender
        let (treasury_cap, metadata) = coin::create_currency<{{name_snake_case_caps}}>(witness, {{decimals}}, b"{{name_snake_case_caps}}", b"{{symbol}}", b"{{description}}", b"{{icon_url}}", ctx);
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx))
    }

    /// Manager can mint new coins
    public fun mint(
        treasury_cap: &mut TreasuryCap<{{name_snake_case_caps}}>, amount: u64, recipient: address, ctx: &mut TxContext
    ) {
        coin::mint_and_transfer(treasury_cap, amount, recipient, ctx)
    }

    /// Manager can burn coins
    public fun burn(treasury_cap: &mut TreasuryCap<{{name_snake_case_caps}}>, coin: Coin<{{name_snake_case_caps}}>) {
        coin::burn(treasury_cap, coin);
    }

    public fun transfer_cap(treasury_cap: TreasuryCap<{{name_snake_case_caps}}>, target: address){
        //I'm not positive this is secure, in theory: There is only one treasury cap, the person who called init has it,
        // so the only person who should be able to transfer it in the person who called init?
        transfer::public_transfer(treasury_cap, target);
    }
}`)