import { Keypair, StrKey } from '@stellar/stellar-sdk';

export interface OfflineVoucherPayload {
    voucherId: string;
    commuterPubKey: string;
    commuterName?: string;
    farePhp: string;
    fareXlm: string;
    timestamp: number;
    expiresAt: number; // e.g. valid for 24 hours
    nonce: string;
    signature: string; // Base64 or Hex signature
}

export interface VerifiedVoucherRecord {
    voucher: OfflineVoucherPayload;
    verifiedAt: number;
    driverPubKey: string;
    status: 'pending_sync' | 'synced' | 'failed';
    syncTxHash?: string;
    errorMessage?: string;
}

const COMMUTER_VOUCHERS_KEY = 'mobilis_offline_commuter_vouchers';
const DRIVER_QUEUE_KEY = 'mobilis_offline_driver_queue';

/**
 * Helper to convert Uint8Array to base64 in browser
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Helper to convert base64 to Uint8Array in browser
 */
function base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Creates a deterministic payload string to sign and verify.
 */
export function serializeVoucherData(voucher: Omit<OfflineVoucherPayload, 'signature'>): string {
    return `${voucher.voucherId}:${voucher.commuterPubKey}:${voucher.farePhp}:${voucher.fareXlm}:${voucher.timestamp}:${voucher.expiresAt}:${voucher.nonce}`;
}

/**
 * Commuter creates a pre-signed time-bound cryptographic voucher offline.
 */
export function createOfflineVoucher(
    commuterKeypairSecret: string,
    farePhp: string,
    fareXlm: string,
    commuterName?: string,
    validityHours: number = 24
): OfflineVoucherPayload {
    const keypair = Keypair.fromSecret(commuterKeypairSecret);
    const commuterPubKey = keypair.publicKey();
    const now = Date.now();
    const expiresAt = now + validityHours * 60 * 60 * 1000;
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const voucherId = `VCH-${now.toString(36).toUpperCase()}-${nonce.substring(0, 6).toUpperCase()}`;

    const unsignedData: Omit<OfflineVoucherPayload, 'signature'> = {
        voucherId,
        commuterPubKey,
        commuterName,
        farePhp,
        fareXlm,
        timestamp: now,
        expiresAt,
        nonce,
    };

    const serialized = serializeVoucherData(unsignedData);
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(serialized);
    const signatureBytes = keypair.sign(encodedData);
    const signature = uint8ArrayToBase64(signatureBytes);

    const fullVoucher: OfflineVoucherPayload = {
        ...unsignedData,
        signature,
    };

    // Store in commuter's local storage
    saveCommuterVoucher(fullVoucher);

    return fullVoucher;
}

/**
 * Saves an offline voucher to the commuter's local cache.
 */
export function saveCommuterVoucher(voucher: OfflineVoucherPayload): void {
    try {
        const existing = getCommuterVouchers();
        const filtered = existing.filter(v => v.voucherId !== voucher.voucherId);
        filtered.unshift(voucher);
        localStorage.setItem(COMMUTER_VOUCHERS_KEY, JSON.stringify(filtered));
    } catch (err) {
        console.warn('Failed to save commuter voucher locally:', err);
    }
}

/**
 * Retrieves all stored commuter vouchers.
 */
export function getCommuterVouchers(): OfflineVoucherPayload[] {
    try {
        const data = localStorage.getItem(COMMUTER_VOUCHERS_KEY);
        if (!data) return [];
        return JSON.parse(data) as OfflineVoucherPayload[];
    } catch {
        return [];
    }
}

/**
 * Verifies the cryptographic ED25519 signature of an offline voucher locally without internet.
 */
export function verifyOfflineVoucher(
    voucher: OfflineVoucherPayload
): { valid: boolean; reason?: string } {
    try {
        if (!voucher.commuterPubKey || !StrKey.isValidEd25519PublicKey(voucher.commuterPubKey)) {
            return { valid: false, reason: 'Invalid commuter Stellar public key format.' };
        }

        const now = Date.now();
        if (voucher.expiresAt && now > voucher.expiresAt) {
            return { valid: false, reason: 'Voucher has expired.' };
        }

        const unsignedData: Omit<OfflineVoucherPayload, 'signature'> = {
            voucherId: voucher.voucherId,
            commuterPubKey: voucher.commuterPubKey,
            commuterName: voucher.commuterName,
            farePhp: voucher.farePhp,
            fareXlm: voucher.fareXlm,
            timestamp: voucher.timestamp,
            expiresAt: voucher.expiresAt,
            nonce: voucher.nonce,
        };

        const serialized = serializeVoucherData(unsignedData);
        const keypair = Keypair.fromPublicKey(voucher.commuterPubKey);
        const sigBytes = base64ToUint8Array(voucher.signature);
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(serialized);

        const isSignatureValid = keypair.verify(encodedData, sigBytes);

        if (!isSignatureValid) {
            return { valid: false, reason: 'Cryptographic signature mismatch. Potential forged voucher.' };
        }

        return { valid: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown verification error';
        return { valid: false, reason: `Verification failed: ${message}` };
    }
}

/**
 * Driver queues a verified voucher in local storage for later blockchain settlement.
 */
export function queueDriverVoucher(
    voucher: OfflineVoucherPayload,
    driverPubKey: string
): { success: boolean; error?: string } {
    const verification = verifyOfflineVoucher(voucher);
    if (!verification.valid) {
        return { success: false, error: verification.reason };
    }

    try {
        const queue = getDriverVoucherQueue();
        const exists = queue.some(item => item.voucher.voucherId === voucher.voucherId);
        if (exists) {
            return { success: false, error: 'This voucher has already been scanned and accepted.' };
        }

        const record: VerifiedVoucherRecord = {
            voucher,
            verifiedAt: Date.now(),
            driverPubKey,
            status: 'pending_sync',
        };

        queue.unshift(record);
        localStorage.setItem(DRIVER_QUEUE_KEY, JSON.stringify(queue));
        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to queue';
        return { success: false, error: message };
    }
}

/**
 * Retrieves the driver's queued offline vouchers.
 */
export function getDriverVoucherQueue(): VerifiedVoucherRecord[] {
    try {
        const data = localStorage.getItem(DRIVER_QUEUE_KEY);
        if (!data) return [];
        return JSON.parse(data) as VerifiedVoucherRecord[];
    } catch {
        return [];
    }
}

/**
 * Updates a record in the driver queue.
 */
export function updateDriverVoucherRecord(
    voucherId: string,
    updates: Partial<VerifiedVoucherRecord>
): void {
    try {
        const queue = getDriverVoucherQueue();
        const updated = queue.map(item => {
            if (item.voucher.voucherId === voucherId) {
                return { ...item, ...updates };
            }
            return item;
        });
        localStorage.setItem(DRIVER_QUEUE_KEY, JSON.stringify(updated));
    } catch (err) {
        console.warn('Failed to update driver voucher record:', err);
    }
}

/**
 * Clears synced vouchers older than 7 days.
 */
export function cleanOldVouchers(): void {
    try {
        const queue = getDriverVoucherQueue();
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const filtered = queue.filter(item => !(item.status === 'synced' && item.verifiedAt < cutoff));
        localStorage.setItem(DRIVER_QUEUE_KEY, JSON.stringify(filtered));
    } catch {
        // Ignore
    }
}
