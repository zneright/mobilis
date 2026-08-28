/**
 * Mobilis Smart Contract & Stellar SDK Integration Service
 * 
 * Provides end-to-end integration between the Mobilis Frontend application and the
 * Rust-based Soroban Smart Contract (`MobilisTreasury`) deployed on Stellar.
 * 
 * Network configuration is managed centrally by networkConfig.ts
 * and supports dynamic switching between Testnet and Mainnet.
 * 
 * Exported Smart Contract Methods:
 * - initContract(admin, token, platform): Initializes TODA Treasury
 * - requestAdvanceLoan(driver, amountXlm): Borrow fuel advance from contract vault
 * - settleLoan(driver): Settle loan principal + coop fee + platform fee
 * - getDriverDebt(driver): Query active debt state from Soroban smart contract
 * - getTreasuryBalance(): Query contract vault balance on Horizon
 * - sendNativePayment(sender, dest, amountXlm): Direct XLM fare settlement
 */

// Dynamic network configuration (single source of truth)
export {
    getNetworkConfig,
    getActiveNetwork,
    getHorizonServer,
    getRpcServer,
    getNetworkPassphrase,
    getContractId,
    getFriendbotUrl,
    getExplorerUrl,
    isTestnet,
    isMainnet,
    setNetwork,
    onNetworkChange,
} from './networkConfig';

export type { StellarNetwork, NetworkConfig } from './networkConfig';

// Legacy named exports for backward compatibility
export {
    get_CONTRACT_ID as CONTRACT_ID,
    get_RPC_SERVER as RPC_SERVER,
    get_HORIZON_SERVER as HORIZON_SERVER,
    get_NETWORK_PASSPHRASE as NETWORK_PASSPHRASE,
} from './stellarContract';

// Smart contract interaction methods
export {
    initContract,
    requestAdvanceLoan,
    settleLoan,
    getDriverDebt,
    getDriverReputation,
    getTreasuryBalance,
    getAccountXlmBalance,
    sendNativePayment,
    executeContractCall,
    signAndSubmitTransaction,
    pollTransactionStatus,
} from './stellarContract';

export {
    isFreighterConnected,
    checkFreighterAccess,
    requestFreighterSign
} from './freighter';

