import {
    rpc,
    Contract,
    TransactionBuilder,
    Transaction,
    Keypair,
    Operation,
    Asset,
    Horizon,
    nativeToScVal,
    scValToNative,
    xdr
} from '@stellar/stellar-sdk';
import { isFreighterConnected, requestFreighterSign } from './freighter';
import {
    getNetworkConfig,
    getHorizonServer,
    getRpcServer,
    getNetworkPassphrase,
    getContractId,
} from './networkConfig';

// Dynamic accessors — these read from the centralized network config at call time.
// Legacy named exports preserved for backward compatibility across the codebase.
export const get_CONTRACT_ID = getContractId;
export const get_RPC_SERVER = getRpcServer;
export const get_HORIZON_SERVER = getHorizonServer;
export const get_NETWORK_PASSPHRASE = getNetworkPassphrase;

// Static re-exports for consumers that still import these names.
// These will resolve to the active network at import time.
export { getNetworkConfig };

export interface TransactionResult {
    hash: string;
    status: string;
    errorResult?: unknown;
}

export interface DriverReputationData {
    successfulRepayments: number;
    totalVolumeRepaid: number;
    creditTier: 1 | 2 | 3;
    consecutiveOnTime: number;
    tierName: string;
    maxBorrowLimit: number;
    coopFeeBps: number;
    platformFeeBps: number;
    totalFeePercentage: number;
}

export const TIER_CONFIG: Record<1 | 2 | 3, { name: string; limit: number; coopBps: number; platBps: number }> = {
    1: { name: 'Bronze Explorer', limit: 15, coopBps: 30, platBps: 20 },
    2: { name: 'Silver Operator', limit: 35, coopBps: 25, platBps: 15 },
    3: { name: 'Gold TODA Master', limit: 75, coopBps: 20, platBps: 10 },
};

type LobstrExtension = {
    requestAccess: () => Promise<string>;
    signTransaction: (xdr: string, network: string) => Promise<string>;
};

export const MAX_POLL_ATTEMPTS = 15;

/**
 * Signs and submits a Stellar / Soroban transaction via secretKey, Freighter, or LOBSTR wallet.
 */
export async function signAndSubmitTransaction(
    server: rpc.Server,
    tx: Transaction,
    secretKey?: string
): Promise<TransactionResult> {
    const walletType = typeof window !== 'undefined' ? localStorage.getItem('externalWalletConnected') : null;

    if (walletType === 'LOBSTR' && typeof window !== 'undefined' && (window as unknown as { lobstr?: LobstrExtension }).lobstr) {
        const lobstrExt = (window as unknown as { lobstr: LobstrExtension }).lobstr;
        const signedXdr = await lobstrExt.signTransaction(tx.toXDR(), getNetworkPassphrase());
        const signedTx = TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase()) as Transaction;
        const result = await server.sendTransaction(signedTx);
        return { hash: result.hash, status: result.status, errorResult: result.errorResult };
    }

    if (walletType === 'Freighter' || (!secretKey && await isFreighterConnected())) {
        const signedXdr = await requestFreighterSign(tx.toXDR(), getNetworkPassphrase());
        const signedTx = TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase()) as Transaction;
        const result = await server.sendTransaction(signedTx);
        return { hash: result.hash, status: result.status, errorResult: result.errorResult };
    }

    if (secretKey) {
        const kp = Keypair.fromSecret(secretKey);
        tx.sign(kp);
        const result = await server.sendTransaction(tx);
        return { hash: result.hash, status: result.status, errorResult: result.errorResult };
    }

    throw new Error('No signing mechanism available (neither secret key, Freighter, nor LOBSTR active).');
}

/**
 * Polls Soroban RPC for transaction completion status.
 */
export async function pollTransactionStatus(server: rpc.Server, hash: string): Promise<boolean> {
    let txResult = await server.getTransaction(hash);
    let attempts = 0;
    while ((txResult.status === "NOT_FOUND" || txResult.status === ("PENDING" as string)) && attempts < MAX_POLL_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        txResult = await server.getTransaction(hash);
        attempts++;
    }
    if (txResult.status === "SUCCESS") return true;
    throw new Error(`On-chain contract execution failed with status: ${txResult.status}`);
}

/**
 * Generic Soroban contract invocation function matching Mobilis smart contract.
 */
export async function executeContractCall(
    activePubKey: string,
    functionName: string,
    args: xdr.ScVal[],
    secretKey?: string
): Promise<boolean> {
    const contractId = getContractId();
    if (!contractId) {
        throw new Error(`Soroban smart contract is not deployed on ${getNetworkConfig().label}. Please switch to Testnet.`);
    }
    const server = new rpc.Server(getRpcServer());
    const account = await server.getAccount(activePubKey);
    const contract = new Contract(contractId);

    const tx = new TransactionBuilder(account, { fee: "10000", networkPassphrase: getNetworkPassphrase() })
        .addOperation(contract.call(functionName, ...args))
        .setTimeout(30)
        .build();

    const preparedTx = await server.prepareTransaction(tx);
    const response = await signAndSubmitTransaction(server, preparedTx as Transaction, secretKey);

    if (response.status === "ERROR") {
        throw new Error(`Contract transaction submission failed: ${JSON.stringify(response.errorResult)}`);
    }

    return await pollTransactionStatus(server, response.hash);
}

/**
 * SMART CONTRACT METHOD: init(admin, token, platform)
 * Initializes the TODA cooperative treasury smart contract.
 */
export async function initContract(
    adminAddress: string,
    tokenAddress: string,
    platformAddress: string,
    secretKey?: string
): Promise<boolean> {
    return executeContractCall(
        adminAddress,
        "init",
        [
            nativeToScVal(adminAddress, { type: 'address' }),
            nativeToScVal(tokenAddress, { type: 'address' }),
            nativeToScVal(platformAddress, { type: 'address' }),
        ],
        secretKey
    );
}

/**
 * SMART CONTRACT METHOD: request_advance(driver, amount)
 */
export async function requestAdvance(
    driverAddress: string,
    amountXlm: number,
    secretKey?: string
): Promise<boolean> {
    const amountInStroops = Math.round(amountXlm * 10_000_000);
    return executeContractCall(
        driverAddress,
        "request_advance",
        [
            nativeToScVal(driverAddress, { type: 'address' }),
            nativeToScVal(amountInStroops, { type: 'i128' }),
        ],
        secretKey
    );
}

export const requestAdvanceLoan = requestAdvance;

/**
 * SMART CONTRACT METHOD: settle_loan(driver)
 */
export async function settleLoan(
    driverAddress: string,
    secretKey?: string
): Promise<boolean> {
    return executeContractCall(
        driverAddress,
        "settle_loan",
        [
            nativeToScVal(driverAddress, { type: 'address' }),
        ],
        secretKey
    );
}

/**
 * SMART CONTRACT METHOD: get_debt(driver)
 */
export async function getDebt(driverAddress: string): Promise<number> {
    try {
        const contractId = getContractId();
        if (!contractId) return 0;
        const server = new rpc.Server(getRpcServer());
        const contract = new Contract(contractId);
        const account = await server.getAccount(driverAddress);

        const tx = new TransactionBuilder(account, { fee: "10000", networkPassphrase: getNetworkPassphrase() })
            .addOperation(contract.call("get_debt", nativeToScVal(driverAddress, { type: 'address' })))
            .setTimeout(30)
            .build();

        const simulation = await server.simulateTransaction(tx);
        if (rpc.Api.isSimulationSuccess(simulation) && simulation.result && simulation.result.retval) {
            const rawDebt = scValToNative(simulation.result.retval);
            return Number(rawDebt) / 10_000_000;
        }
        return 0;
    } catch (error) {
        console.error('[Soroban Integration] Error getting driver debt:', error);
        return 0;
    }
}

export const getDriverDebt = getDebt;

/**
 * SMART CONTRACT METHOD: get_driver_reputation(driver)
 */
export async function getDriverReputation(driverAddress: string): Promise<DriverReputationData> {
    try {
        const contractId = getContractId();
        if (!contractId) throw new Error('Contract not deployed on active network');
        const server = new rpc.Server(getRpcServer());
        const contract = new Contract(contractId);
        const account = await server.getAccount(driverAddress);

        const tx = new TransactionBuilder(account, { fee: "10000", networkPassphrase: getNetworkPassphrase() })
            .addOperation(contract.call("get_driver_reputation", nativeToScVal(driverAddress, { type: 'address' })))
            .setTimeout(30)
            .build();

        const simulation = await server.simulateTransaction(tx);
        if (rpc.Api.isSimulationSuccess(simulation) && simulation.result && simulation.result.retval) {
            const raw = scValToNative(simulation.result.retval);
            const tier = (raw.credit_tier || 1) as 1 | 2 | 3;
            const config = TIER_CONFIG[tier] || TIER_CONFIG[1];
            return {
                successfulRepayments: Number(raw.successful_repayments || 0),
                totalVolumeRepaid: Number(raw.total_volume_repaid || 0) / 10_000_000,
                creditTier: tier,
                consecutiveOnTime: Number(raw.consecutive_on_time || 0),
                tierName: config.name,
                maxBorrowLimit: config.limit,
                coopFeeBps: config.coopBps,
                platformFeeBps: config.platBps,
                totalFeePercentage: (config.coopBps + config.platBps) / 100,
            };
        }
    } catch (error) {
        console.warn('[Soroban Integration] Error querying on-chain reputation, defaulting to local cache:', error);
    }

    // Default Tier 1 fallback
    const config = TIER_CONFIG[1];
    return {
        successfulRepayments: 0,
        totalVolumeRepaid: 0,
        creditTier: 1,
        consecutiveOnTime: 0,
        tierName: config.name,
        maxBorrowLimit: config.limit,
        coopFeeBps: config.coopBps,
        platformFeeBps: config.platBps,
        totalFeePercentage: (config.coopBps + config.platBps) / 100,
    };
}

/**
 * Fetches contract treasury balance from Stellar Horizon.
 */
export async function getTreasuryBalance(): Promise<string> {
    try {
        const contractId = getContractId();
        if (!contractId) return '0.00';
        const horizon = new Horizon.Server(getHorizonServer());
        const account = await horizon.loadAccount(contractId);
        const nativeBalance = account.balances.find(b => b.asset_type === 'native');
        return nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) : '0.00';
    } catch {
        return '0.00';
    }
}

/**
 * Fetches XLM balance for any account from Stellar Horizon.
 */
export async function getAccountXlmBalance(publicKey: string): Promise<string> {
    try {
        const horizon = new Horizon.Server(getHorizonServer());
        const account = await horizon.loadAccount(publicKey);
        const nativeBalance = account.balances.find(b => b.asset_type === 'native');
        return nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) : '0.00';
    } catch {
        return '0.00';
    }
}

/**
 * Performs direct native Stellar XLM fare payment.
 */
export async function sendNativePayment(
    senderPublicKey: string,
    destPublicKey: string,
    amountXlm: string,
    secretKey?: string
): Promise<{ hash: string; status: string }> {
    const server = new rpc.Server(getRpcServer());
    const account = await server.getAccount(senderPublicKey);

    const tx = new TransactionBuilder(account, { fee: "1000", networkPassphrase: getNetworkPassphrase() })
        .addOperation(Operation.payment({
            destination: destPublicKey,
            asset: Asset.native(),
            amount: amountXlm,
        }))
        .setTimeout(30)
        .build();

    const response = await signAndSubmitTransaction(server, tx as Transaction, secretKey);
    if (response.status === "ERROR") {
        throw new Error(`Submission failed: ${JSON.stringify(response.errorResult)}`);
    }

    await pollTransactionStatus(server, response.hash);
    return { hash: response.hash, status: 'SUCCESS' };
}
