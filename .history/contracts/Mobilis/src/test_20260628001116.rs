use super::*;
use soroban_sdk::{Env, Address, token};
use soroban_sdk::testutils::{Address as _};
use crate::{MobilisTreasury, MobilisTreasuryClient};

fn setup_test() -> (Env, MobilisTreasuryClient<'static>, token::Client<'static>, token::StellarAssetClient<'static>, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let platform = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_client = token::Client::new(&env, &token_contract.address());
    let token_admin_client = token::StellarAssetClient::new(&env, &token_contract.address());

    let contract_id = env.register_contract(None, MobilisTreasury);
    let client = MobilisTreasuryClient::new(&env, &contract_id);
    
    client.init(&admin, &token_contract.address(), &platform);
    token_admin_client.mint(&contract_id, &1000_0000000);

    (env, client, token_client, token_admin_client, platform, contract_id, admin)
}

#[test]
fn test_end_to_end_borrow_and_settle() {
    let (env, client, token_client, token_admin_client, platform, _contract_id, admin) = setup_test();
    let driver = Address::generate(&env);
    let advance_amount = 15_0000000; 

    client.request_advance(&driver, &advance_amount);
    assert_eq!(token_client.balance(&driver), advance_amount);

    token_admin_client.mint(&driver, &5_0000000); 

    let initial_platform_balance = token_client.balance(&platform);
    let initial_admin_balance = token_client.balance(&admin);

    client.settle_loan(&driver);
    
    assert_eq!(client.get_debt(&driver), 0);

    let final_platform_balance = token_client.balance(&platform);
    let final_admin_balance = token_client.balance(&admin);

    let coop_fee = (advance_amount * 3) / 1000; 
    let platform_fee = (advance_amount * 2) / 1000; 

    assert_eq!(final_platform_balance - initial_platform_balance, platform_fee);
    assert_eq!(final_admin_balance - initial_admin_balance, advance_amount + coop_fee);
}

#[test]
fn test_get_debt_initial_state() {
    let (env, client, _, _, _, _, _) = setup_test();
    let driver = Address::generate(&env);
    assert_eq!(client.get_debt(&driver), 0);
}

#[test]
#[should_panic(expected = "Advance amount must be greater than zero")]
fn test_request_advance_zero_amount() {
    let (env, client, _, _, _, _, _) = setup_test();
    let driver = Address::generate(&env);
    // This should trigger the panic you defined in lib.rs
    client.request_advance(&driver, &0);
}

#[test]
#[should_panic(expected = "Driver already has an active advance. Settle first.")]
fn test_prevent_double_advance() {
    let (env, client, _, _, _, _, _) = setup_test();
    let driver = Address::generate(&env);
    
    client.request_advance(&driver, &1000);
    // Requesting a second advance before settling should panic
    client.request_advance(&driver, &1000);
}