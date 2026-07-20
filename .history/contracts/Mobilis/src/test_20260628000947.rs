    use super::*;
    use soroban_sdk::{Env, Address, token};
    use soroban_sdk::testutils::{Address as _};
    use crate::{MobilisTreasury, MobilisTreasuryClient};

    // Helper function remains outside
    fn setup_test() -> (Env, MobilisTreasuryClient<'static>, token::Client<'static>, token::StellarAssetClient<'static>, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        // ... rest of your setup code
        (env, client, token_client, token_admin_client, platform, contract_id, admin)
    }

    #[test]
    fn test_end_to_end_borrow_and_settle() {
        let (env, client, token_client, token_admin_client, platform, _contract_id, admin) = setup_test();
        // ... rest of your test code
    }

    #[test]
    fn test_get_debt_initial_state() {
        let (env, client, _, _, _, _, _) = setup_test();
        let driver = Address::generate(&env);
        assert_eq!(client.get_debt(&driver), 0);
    }