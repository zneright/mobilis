use soroban_sdk::{Env, Address, token};
use soroban_sdk::testutils::{Address as _};
use crate::{MobilisTreasury, MobilisTreasuryClient, TIER_1_LIMIT, TIER_2_LIMIT, TIER_3_LIMIT};

fn setup_test() -> (Env, MobilisTreasuryClient<'static>, token::Client<'static>, token::StellarAssetClient<'static>, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let platform = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_client = token::Client::new(&env, &token_contract.address());
    let token_admin_client = token::StellarAssetClient::new(&env, &token_contract.address());

    let contract_id = env.register(MobilisTreasury, ());
    let client = MobilisTreasuryClient::new(&env, &contract_id);
    
    client.init(&admin, &token_contract.address(), &platform);
    token_admin_client.mint(&contract_id, &10000_0000000);

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

    // Tier 1 Fee: 30 bps (0.3%) coop, 20 bps (0.2%) platform
    let coop_fee = (advance_amount * 30) / 10000; 
    let platform_fee = (advance_amount * 20) / 10000; 

    assert_eq!(final_platform_balance - initial_platform_balance, platform_fee);
    assert_eq!(final_admin_balance - initial_admin_balance, advance_amount + coop_fee);

    // Verify reputation increased
    let rep = client.get_driver_reputation(&driver);
    assert_eq!(rep.successful_repayments, 1);
    assert_eq!(rep.total_volume_repaid, advance_amount);
    assert_eq!(rep.credit_tier, 1);
}

#[test]
fn test_tier_progression_from_bronze_to_gold() {
    let (env, client, _token_client, token_admin_client, _platform, _contract_id, _admin) = setup_test();
    let driver = Address::generate(&env);

    // Initially Tier 1 (Bronze)
    let initial_rep = client.get_driver_reputation(&driver);
    assert_eq!(initial_rep.credit_tier, 1);
    assert_eq!(client.get_tier_limit(&1), TIER_1_LIMIT);

    // Perform 3 repayments -> Advance to Tier 2 (Silver)
    for _ in 0..3 {
        client.request_advance(&driver, &10_0000000);
        token_admin_client.mint(&driver, &5_0000000);
        client.settle_loan(&driver);
    }

    let rep_tier2 = client.get_driver_reputation(&driver);
    assert_eq!(rep_tier2.credit_tier, 2);
    assert_eq!(rep_tier2.successful_repayments, 3);
    assert_eq!(client.get_tier_limit(&2), TIER_2_LIMIT);

    // Now driver can borrow up to Tier 2 limit (35 XLM)
    client.request_advance(&driver, &30_0000000);
    token_admin_client.mint(&driver, &5_0000000);
    client.settle_loan(&driver);

    // Perform 5 more repayments (total 8+ repayments) -> Advance to Tier 3 (Gold)
    for _ in 0..4 {
        client.request_advance(&driver, &20_0000000);
        token_admin_client.mint(&driver, &5_0000000);
        client.settle_loan(&driver);
    }

    let rep_tier3 = client.get_driver_reputation(&driver);
    assert_eq!(rep_tier3.credit_tier, 3);
    assert_eq!(rep_tier3.successful_repayments, 8);
    assert_eq!(client.get_tier_limit(&3), TIER_3_LIMIT);

    // Gold driver can borrow up to Tier 3 limit (75 XLM)
    client.request_advance(&driver, &70_0000000);
    assert_eq!(client.get_debt(&driver), 70_0000000);
}

#[test]
#[should_panic(expected = "Requested amount exceeds current credit tier limit")]
fn test_borrow_exceeds_tier1_limit() {
    let (env, client, _token_client, _token_admin_client, _platform, _contract_id, _admin) = setup_test();
    let driver = Address::generate(&env);
    
    // Tier 1 limit is 15 XLM. Requesting 20 XLM should panic.
    client.request_advance(&driver, &20_0000000);
}

#[test]
fn test_discounted_fee_rates_by_tier() {
    let (_env, client, _token_client, _token_admin_client, _platform, _contract_id, _admin) = setup_test();
    
    let (coop1, plat1) = client.get_tier_fee_rates(&1);
    assert_eq!((coop1, plat1), (30, 20)); // 0.5% total

    let (coop2, plat2) = client.get_tier_fee_rates(&2);
    assert_eq!((coop2, plat2), (25, 15)); // 0.4% total

    let (coop3, plat3) = client.get_tier_fee_rates(&3);
    assert_eq!((coop3, plat3), (20, 10)); // 0.3% total
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
    client.request_advance(&driver, &0);
}

#[test]
#[should_panic(expected = "Driver already has an active advance. Settle first.")]
fn test_prevent_double_advance() {
    let (env, client, _, _, _, _, _) = setup_test();
    let driver = Address::generate(&env);
    
    client.request_advance(&driver, &10_0000000);
    client.request_advance(&driver, &10_0000000);
}