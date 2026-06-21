#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    UsdcToken,
    PlatformWallet,
    DriverDebt(Address),
}

#[contract]
pub struct MobilisTreasury;

#[contractimpl]
impl MobilisTreasury {
    /// Initializes the TODA cooperative treasury contract.
    /// Sets the admin, the USDC token address, and the Mobilis platform fee wallet.
    pub fn init(env: Env, admin: Address, token: Address, platform: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::UsdcToken, &token);
        env.storage().instance().set(&DataKey::PlatformWallet, &platform);
    }

    /// Driver requests a fuel advance.
    /// Transfers USDC from this contract (the TODA treasury) to the driver.
    pub fn request_advance(env: Env, driver: Address, amount: i128) {
        driver.require_auth();
        
        let debt_key = DataKey::DriverDebt(driver.clone());
        if env.storage().instance().has(&debt_key) {
            panic!("Driver already has an active advance");
        }

        let token_address: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let client = token::Client::new(&env, &token_address);
        
        // Transfer from treasury (contract) to driver
        client.transfer(&env.current_contract_address(), &driver, &amount);

        // Record debt
        env.storage().instance().set(&debt_key, &amount);
    }

    /// Driver settles the loan at the end of the shift.
    /// Driver pays Principal + 0.5% fee.
    /// 0.3% goes to the TODA treasury (stays in contract), 0.2% goes to platform.
    pub fn settle_loan(env: Env, driver: Address) {
        driver.require_auth();

        let debt_key = DataKey::DriverDebt(driver.clone());
        let principal: i128 = env.storage().instance().get(&debt_key).unwrap_or_else(|| panic!("No active loan found"));

        let coop_fee = (principal * 3) / 1000; // 0.3%
        let platform_fee = (principal * 2) / 1000; // 0.2%
        
        let token_address: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let platform_address: Address = env.storage().instance().get(&DataKey::PlatformWallet).unwrap();
        let client = token::Client::new(&env, &token_address);

        // Driver pays principal + coop_fee back to the treasury contract
        client.transfer(&driver, &env.current_contract_address(), &(principal + coop_fee));
        
        // Driver pays platform_fee directly to the platform wallet
        client.transfer(&driver, &platform_address, &platform_fee);

        // Clear debt state
        env.storage().instance().remove(&debt_key);
    }

    /// Helper to check a driver's active debt.
    pub fn get_debt(env: Env, driver: Address) -> i128 {
        let debt_key = DataKey::DriverDebt(driver);
        env.storage().instance().get(&debt_key).unwrap_or(0)
    }
}