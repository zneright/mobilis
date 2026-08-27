import { Keypair } from '@stellar/stellar-sdk';
import { getFriendbotUrl } from './networkConfig';

export interface PasskeyVaultRecord {
    credentialId: string;
    rawIdBase64: string;
    publicKeyBase64?: string;
    encryptedSecret: string; // Base64 AES-GCM ciphertext
    iv: string; // Base64 IV
    salt: string; // Base64 salt for PBKDF2
    stellarPublicKey: string;
    userEmail: string;
    displayName: string;
    role: string;
    createdAt: number;
}

const PASSKEY_VAULT_KEY = 'mobilis_passkey_vault';

/**
 * Checks whether WebAuthn Passkeys are supported by the current browser/device.
 */
export async function isPasskeySupported(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        return false;
    }
    try {
        if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
            return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        }
        return true;
    } catch {
        return false;
    }
}

// ArrayBuffer <-> Base64 Helpers
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Derives an AES-GCM cryptographic key from a passkey credential ID and salt using PBKDF2.
 */
async function deriveEncryptionKey(passkeyCredentialId: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const rawKeyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(`mobilis-passkey-enclave-${passkeyCredentialId}`),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as unknown as ArrayBuffer,
            iterations: 100000,
            hash: 'SHA-256',
        },
        rawKeyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts a Stellar secret key using an AES-GCM key derived from the WebAuthn credential.
 */
export async function encryptSecretWithPasskey(
    stellarSecret: string,
    credentialId: string
): Promise<{ encryptedSecret: string; iv: string; salt: string }> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveEncryptionKey(credentialId, salt);

    const encoder = new TextEncoder();
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
        key,
        encoder.encode(stellarSecret)
    );

    return {
        encryptedSecret: bufferToBase64(encryptedBuffer),
        iv: bufferToBase64(iv),
        salt: bufferToBase64(salt),
    };
}

/**
 * Decrypts a Stellar secret key using the user's biometric passkey.
 */
export async function decryptSecretWithPasskey(
    encryptedSecretBase64: string,
    ivBase64: string,
    saltBase64: string,
    credentialId: string
): Promise<string> {
    const salt = base64ToBuffer(saltBase64);
    const iv = base64ToBuffer(ivBase64);
    const ciphertext = base64ToBuffer(encryptedSecretBase64);

    const key = await deriveEncryptionKey(credentialId, salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
        key,
        ciphertext as unknown as ArrayBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
}

/**
 * Creates a new WebAuthn Passkey credential using TouchID, FaceID, Windows Hello, or Security Key.
 */
export async function createPasskeyCredential(
    userEmail: string,
    displayName: string
): Promise<PublicKeyCredential> {
    if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn Passkeys are not supported on this device/browser.');
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const options: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
            name: 'Mobilis Transit Smart Wallet',
            id: window.location.hostname || 'localhost',
        },
        user: {
            id: userId,
            name: userEmail,
            displayName: displayName || userEmail,
        },
        pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256 (secp256r1 - Stellar Protocol 21 curve)
            { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
            authenticatorAttachment: 'platform', // Built-in biometric (FaceID / TouchID / Windows Hello)
            userVerification: 'required',
            residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
    };

    const credential = (await navigator.credentials.create({
        publicKey: options,
    })) as PublicKeyCredential;

    if (!credential) {
        throw new Error('Passkey creation was cancelled or rejected by user.');
    }

    return credential;
}

/**
 * Authenticates with an existing WebAuthn Passkey using device biometrics.
 */
export async function authenticateWithPasskey(
    targetCredentialId?: string
): Promise<PublicKeyCredential> {
    if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn Passkeys are not supported on this device/browser.');
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const options: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname || 'localhost',
        userVerification: 'required',
        timeout: 60000,
    };

    if (targetCredentialId) {
        options.allowCredentials = [
            {
                id: base64ToBuffer(targetCredentialId) as unknown as ArrayBuffer,
                type: 'public-key',
                transports: ['internal'],
            },
        ];
    }

    const assertion = (await navigator.credentials.get({
        publicKey: options,
    })) as PublicKeyCredential;

    if (!assertion) {
        throw new Error('Passkey biometric authentication failed or cancelled.');
    }

    return assertion;
}

/**
 * Registers a new Stellar account secured with a biometric Passkey.
 */
export async function registerPasskeySmartWallet(
    userEmail: string,
    displayName: string,
    role: string = 'commuter'
): Promise<{ keypair: Keypair; record: PasskeyVaultRecord }> {
    // 1. Create WebAuthn Passkey Credential
    const cred = await createPasskeyCredential(userEmail, displayName);
    const credentialId = bufferToBase64(cred.rawId);

    // 2. Generate Non-Custodial Stellar Keypair
    const pair = Keypair.random();
    const stellarSecret = pair.secret();
    const stellarPublicKey = pair.publicKey();

    // 3. Encrypt Keypair with Passkey Enclave
    const { encryptedSecret, iv, salt } = await encryptSecretWithPasskey(stellarSecret, credentialId);

    const record: PasskeyVaultRecord = {
        credentialId,
        rawIdBase64: credentialId,
        encryptedSecret,
        iv,
        salt,
        stellarPublicKey,
        userEmail,
        displayName,
        role,
        createdAt: Date.now(),
    };

    // 4. Save to Vault
    savePasskeyVault(record);

    // Auto-fund on Testnet only
    const friendbot = getFriendbotUrl();
    if (friendbot) {
        fetch(`${friendbot}?addr=${stellarPublicKey}`).catch(() => { });
    }

    return { keypair: pair, record };
}

/**
 * Logs in and unlocks the Stellar Smart Wallet using FaceID / TouchID / Windows Hello.
 */
export async function loginWithPasskeyVault(): Promise<{ keypair: Keypair; record: PasskeyVaultRecord }> {
    const record = getPasskeyVault();
    if (!record) {
        throw new Error('No Passkey Smart Wallet found on this device. Please register first.');
    }

    // 1. Biometric Authentication Prompt
    const assertion = await authenticateWithPasskey(record.credentialId);
    const credentialId = bufferToBase64(assertion.rawId);

    // 2. Decrypt Stellar Keypair
    const secret = await decryptSecretWithPasskey(
        record.encryptedSecret,
        record.iv,
        record.salt,
        credentialId
    );

    const keypair = Keypair.fromSecret(secret);
    return { keypair, record };
}

/**
 * Vault Storage Helpers
 */
export function savePasskeyVault(record: PasskeyVaultRecord): void {
    localStorage.setItem(PASSKEY_VAULT_KEY, JSON.stringify(record));
}

export function getPasskeyVault(): PasskeyVaultRecord | null {
    try {
        const data = localStorage.getItem(PASSKEY_VAULT_KEY);
        if (!data) return null;
        return JSON.parse(data) as PasskeyVaultRecord;
    } catch {
        return null;
    }
}

export function clearPasskeyVault(): void {
    localStorage.removeItem(PASSKEY_VAULT_KEY);
}
