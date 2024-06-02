import handlebars from 'handlebars';

export const tokenTemplate =
    handlebars.compile(`module higan_fun::{{name_snake_case}} {
    use sui::coin::{Self};
    use sui::url;
    use std::ascii;

    public struct {{name_snake_case_caps}} has drop {}

    fun init(witness: {{name_snake_case_caps}}, ctx: &mut TxContext) {
        let iconUrl = option::some(url::new_unsafe(ascii::string(b"{{{coin_metadata_icon_url}}}")));
        let (treasury_cap, coin_metadata) = coin::create_currency<{{name_snake_case_caps}}>(witness, 3, b"{{name_snake_case_caps}}", b"{{coin_metadata_symbol}}", b"{{coin_metadata_description}}", iconUrl, ctx);
        transfer::public_freeze_object(coin_metadata);

        // create and share the CoinExampleStore
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx))
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init({{name_snake_case_caps}} {}, ctx)
    }
}
`);

export const moveTomlTemplate = handlebars.compile(`
[package]
name = "higan_fun"
edition = "2024.beta" # edition = "legacy" to use legacy (pre-2024) Move
# license = ""           # e.g., "MIT", "GPL", "Apache 2.0"
# authors = ["..."]      # e.g., ["Joe Smith (joesmith@noemail.com)", "John Snow (johnsnow@noemail.com)"]

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "devnet" }

[addresses]
higan_fun = "0x0"
`)