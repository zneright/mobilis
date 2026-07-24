import { requestAccess, signTransaction, isConnected, isAllowed } from '@stellar/freighter-api';
import { Networks } from '@stellar/stellar-sdk';

export async function isFreighterConnected(): Promise<boolean> {
    try {
        const connected = await isConnected();
        return !!connected;
    } catch {
        return false;
    }
}

export async function checkFreighterAccess(): Promise<string | null> {
    try {
        const allowed = await isAllowed();
        if (allowed) {
            const accessObj = await requestAccess();
            if (typeof accessObj === 'string') return accessObj;
            if (accessObj && typeof accessObj === 'object' && 'address' in accessObj) {
                return (accessObj as { address: string }).address;
            }
        }
        return null;
    } catch {
        return null;
    }
}

export async function requestFreighterSign(xdr: string, networkPassphrase = Networks.TESTNET): Promise<string> {
    const signedResult = await signTransaction(xdr, { networkPassphrase });
    if (typeof signedResult === 'string') return signedResult;
    if (signedResult && typeof signedResult === 'object' && 'signedTxXdr' in signedResult) {
        return (signedResult as { signedTxXdr: string }).signedTxXdr;
    }
    throw new Error('Freighter wallet signing declined or failed.');
}
