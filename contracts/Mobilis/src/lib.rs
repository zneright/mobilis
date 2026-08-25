#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, token, Address, Env};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct DriverReputation {
    pub successful_repayments: u32,
    pub total_volume_repaid: i128,
    pub credit_tier: u32, // 1: Bronze, 2: Silver, 3: Gold
    pub consecutive_on_time: u32,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token, 
    PlatformWallet,
    DriverDebt(Address),
    DriverReputation(Address),
}

// Tier Limits in Stroops (1 XLM = 10_000_000 Stroops)
pub const TIER_1_LIMIT: i128 = 15_0000000;  // Bronze: 15 XLM
pub const TIER_2_LIMIT: i128 = 35_0000000;  // Silver: 35 XLM
pub const TIER_3_LIMIT: i128 = 75_0000000;  // Gold: 75 XLM

#[contract]
pub struct MobilisTreasury;

#[contractimpl]
impl MobilisTreasury {
    /// Initializes the TODA cooperative treasury contract.
    pub fn init(env: Env, admin: Address, token: Address, platform: Address) {
        admin.require_auth();
        
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract is already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::PlatformWallet, &platform);
    }

    /// Returns the maximum borrow limit for a given tier.
    pub fn get_tier_limit(_env: Env, tier: u32) -> i128 {
        match tier {
            1 => TIER_1_LIMIT,
            2 => TIER_2_LIMIT,
            3 => TIER_3_LIMIT,
            _ => TIER_1_LIMIT,
        }
    }

    /// Returns the (coop_fee_bps, platform_fee_bps) for a given tier.
    /// Basis points (bps): 100 bps = 1%
    /// Tier 1 (Bronze): 30 bps (0.3%) coop + 20 bps (0.2%) platform = 0.5% total
    /// Tier 2 (Silver): 25 bps (0.25%) coop + 15 bps (0.15%) platform = 0.4% total
    /// Tier 3 (Gold): 20 bps (0.2%) coop + 10 bps (0.1%) platform = 0.3% total
    pub fn get_tier_fee_rates(_env: Env, tier: u32) -> (i128, i128) {
        match tier {
            1 => (30, 20),
            2 => (25, 15),
            3 => (20, 10),
            _ => (30, 20),
        }
    }

    /// Fetches the on-chain credit reputation for a driver.
    pub fn get_driver_reputation(env: Env, driver: Address) -> DriverReputation {
        let rep_key = DataKey::DriverReputation(driver);
        env.storage().instance().get(&rep_key).unwrap_or(DriverReputation {
            successful_repayments: 0,
            total_volume_repaid: 0,
            credit_tier: 1,
            consecutive_on_time: 0,
        })
    }

    /// Driver requests a fuel advance validated against dynamic on-chain tier limits.
    pub fn request_advance(env: Env, driver: Address, amount: i128) {
        driver.require_auth();
        
        let debt_key = DataKey::DriverDebt(driver.clone());
        if env.storage().instance().has(&debt_key) {
            panic!("Driver already has an active advance. Settle first.");
        }

        if amount <= 0 {
            panic!("Advance amount must be greater than zero");
        }

        // Tier limit verification
        let reputation = Self::get_driver_reputation(env.clone(), driver.clone());
        let max_limit = Self::get_tier_limit(env.clone(), reputation.credit_tier);
        if amount > max_limit {
            panic!("Requested amount exceeds current credit tier limit");
        }

        let token_address: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_address);
        let contract_address = env.current_contract_address();

        if token_client.balance(&contract_address) < amount {
            panic!("Insufficient liquidity in the cooperative treasury");
        }

        token_client.transfer(&contract_address, &driver, &amount);
        env.storage().instance().set(&debt_key, &amount);
        env.events().publish(
            (symbol_short!("advance"), driver),
            (amount, reputation.credit_tier)
        );
    }

    /// Driver settles the loan with dynamic fee discounts based on credit tier.
    /// Updates on-chain reputation score and advances tier upon hitting milestones.
    pub fn settle_loan(env: Env, driver: Address) {
        driver.require_auth();

        let debt_key = DataKey::DriverDebt(driver.clone());
        let principal: i128 = env.storage().instance().get(&debt_key).unwrap_or_else(|| panic!("No active loan found"));

        let mut reputation = Self::get_driver_reputation(env.clone(), driver.clone());
        let (coop_bps, platform_bps) = Self::get_tier_fee_rates(env.clone(), reputation.credit_tier);

        let coop_fee = (principal * coop_bps) / 10000;
        let platform_fee = (principal * platform_bps) / 10000;
        
        let token_address: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let admin_address: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        let platform_address: Address = env.storage().instance().get(&DataKey::PlatformWallet).unwrap();
        
        let token_client = token::Client::new(&env, &token_address);

        let total_required = principal + coop_fee + platform_fee;
        if token_client.balance(&driver) < total_required {
            panic!("Driver has insufficient balance to settle principal and fees");
        }

        // 1. Transfer Principal + Coop Fee directly to the Coop Admin's Personal Wallet
        token_client.transfer(&driver, &admin_address, &(principal + coop_fee));
        
        // 2. Transfer Platform Fee directly to the Mobilis platform wallet
        token_client.transfer(&driver, &platform_address, &platform_fee);

        // Clear debt state
        env.storage().instance().remove(&debt_key);

        // 3. Update Credit Reputation & Tier Progression
        reputation.successful_repayments += 1;
        reputation.consecutive_on_time += 1;
        reputation.total_volume_repaid += principal;

        // Tier Progression Logic:
        // Tier 1 -> Tier 2: At least 3 successful repayments
        // Tier 2 -> Tier 3: At least 8 successful repayments
        if reputation.successful_repayments >= 8 {
            reputation.credit_tier = 3;
        } else if reputation.successful_repayments >= 3 {
            reputation.credit_tier = 2;
        } else {
            reputation.credit_tier = 1;
        }

        let rep_key = DataKey::DriverReputation(driver.clone());
        env.storage().instance().set(&rep_key, &reputation);

        env.events().publish(
            (symbol_short!("settle"), driver.clone()),
            (principal, coop_fee, platform_fee, reputation.credit_tier)
        );
    }

    pub fn get_debt(env: Env, driver: Address) -> i128 {
        let debt_key = DataKey::DriverDebt(driver);
        env.storage().instance().get(&debt_key).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;