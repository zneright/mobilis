/**
 * Mobilis Smart Contract & Stellar SDK Integration Service
 * 
 * Provides end-to-end integration between the Mobilis Frontend application and the
 * Rust-based Soroban Smart Contract (`MobilisTreasury`) deployed on Stellar Testnet.
 * 
 * Smart Contract Address: CAVFLXBG4MXGTGECI6WAZXMDNX2H3UWFTMNY4DHK2MR4YUYEEU5STBID
 * 
 * Exported Smart Contract Methods:
 * - initContract(admin, token, platform): Initializes TODA Treasury
 * - requestAdvanceLoan(driver, amountXlm): Borrow fuel advance from contract vault
 * - settleLoan(driver): Settle loan principal + 0.3% coop fee + 0.2% platform fee
 * - getDriverDebt(driver): Query active debt state from Soroban smart contract
 * - getTreasuryBalance(): Query contract vault balance on Horizon
 * - sendNativePayment(sender, dest, amountXlm): Direct XLM fare settlement
 */

export {
    CONTRACT_ID,
    RPC_SERVER,
    HORIZON_SERVER,
    NETWORK_PASSPHRASE,
    initContract,
    requestAdvanceLoan,
    settleLoan,
    getDriverDebt,
    getTreasuryBalance,
    getAccountXlmBalance,
    sendNativePayment,
    executeContractCall,
    signAndSubmitTransaction,
    pollTransactionStatus
} from './stellarContract';

export {
    isFreighterConnected,
    checkFreighterAccess,
    requestFreighterSign
} from './freighter';
