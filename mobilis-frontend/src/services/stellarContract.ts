import {
    rpc,
    Contract,
    TransactionBuilder,
    Networks,
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

export const CONTRACT_ID = "CAVFLXBG4MXGTGECI6WAZXMDNX2H3UWFTMNY4DHK2MR4YUYEEU5STBID";
export const RPC_SERVER = "https://soroban-testnet.stellar.org";
export const HORIZON_SERVER = "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET;

export interface TransactionResult {
    hash: string;
    status: string;
    errorResult?: unknown;
}

/**
 * Signs and submits a Stellar / Soroban transaction via secretKey or Freighter wallet.
 */
export async function signAndSubmitTransaction(
    server: rpc.Server,
    tx: Transaction,
    secretKey?: string
): Promise<TransactionResult> {
    if (secretKey) {
        const kp = Keypair.fromSecret(secretKey);
        tx.sign(kp);
        const result = await server.sendTransaction(tx);
        return { hash: result.hash, status: result.status, errorResult: result.errorResult };
    }

    if (await isFreighterConnected()) {
        const signedXdr = await requestFreighterSign(tx.toXDR());
        const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as Transaction;
        const result = await server.sendTransaction(signedTx);
        return { hash: result.hash, status: result.status, errorResult: result.errorResult };
    }

    throw new Error('No signing mechanism available (neither secret key nor Freighter active).');
}

/**
 * Polls Soroban RPC for transaction completion status.
 */
export async function pollTransactionStatus(server: rpc.Server, hash: string): Promise<boolean> {
    let txResult = await server.getTransaction(hash);
    while (txResult.status === "NOT_FOUND" || txResult.status === ("PENDING" as string)) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        txResult = await server.getTransaction(hash);
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
    const server = new rpc.Server(RPC_SERVER);
    const account = await server.getAccount(activePubKey);
    const contract = new Contract(CONTRACT_ID);

    const tx = new TransactionBuilder(account, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
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
    signerPublicKey: string,
    secretKey?: string
): Promise<boolean> {
    const args = [
        nativeToScVal(adminAddress, { type: 'address' }),
        nativeToScVal(tokenAddress, { type: 'address' }),
        nativeToScVal(platformAddress, { type: 'address' }),
    ];
    return await executeContractCall(signerPublicKey, 'init', args, secretKey);
}

/**
 * SMART CONTRACT METHOD: request_advance(driver, amount)
 * Driver requests a fuel advance loan from the cooperative treasury contract.
 */
export async function requestAdvanceLoan(
    driverAddress: string,
    amountXlm: number,
    secretKey?: string
): Promise<boolean> {
    const stroopAmount = BigInt(Math.floor(amountXlm * 10_000_000));
    const args = [
        nativeToScVal(driverAddress, { type: 'address' }),
        nativeToScVal(stroopAmount, { type: 'i128' }),
    ];
    return await executeContractCall(driverAddress, 'request_advance', args, secretKey);
}

/**
 * SMART CONTRACT METHOD: settle_loan(driver)
 * Driver settles active fuel loan. Distributes principal + 0.3% to Coop and 0.2% to Mobilis Platform.
 */
export async function settleLoan(
    driverAddress: string,
    secretKey?: string
): Promise<boolean> {
    const args = [
        nativeToScVal(driverAddress, { type: 'address' }),
    ];
    return await executeContractCall(driverAddress, 'settle_loan', args, secretKey);
}

/**
 * SMART CONTRACT METHOD: get_debt(driver)
 * Queries active debt balance of driver from the smart contract state.
 */
export async function getDriverDebt(driverAddress: string): Promise<number> {
    try {
        const server = new rpc.Server(RPC_SERVER);
        const contract = new Contract(CONTRACT_ID);
        const account = await server.getAccount(driverAddress);

        const tx = new TransactionBuilder(account, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
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

/**
 * Fetches contract treasury balance from Stellar Horizon.
 */
export async function getTreasuryBalance(): Promise<string> {
    try {
        const horizon = new Horizon.Server(HORIZON_SERVER);
        const account = await horizon.loadAccount(CONTRACT_ID);
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
        const horizon = new Horizon.Server(HORIZON_SERVER);
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
    const server = new rpc.Server(RPC_SERVER);
    const account = await server.getAccount(senderPublicKey);

    const tx = new TransactionBuilder(account, { fee: "1000", networkPassphrase: NETWORK_PASSPHRASE })
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
