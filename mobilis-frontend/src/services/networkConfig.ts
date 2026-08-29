/**
 * Mobilis Centralized Network Configuration Service
 * 
 * Single source of truth for all Stellar network configuration.
 * Supports dynamic switching between Testnet and Mainnet with
 * localStorage persistence and reactive event-driven updates.
 */

import { Networks } from '@stellar/stellar-sdk';

// ─── Exchange Rate Constant & Cache ──────────────────────────
export const PHP_EXCHANGE_RATE = 60.69; // 1 XLM ≈ 60.69 PHP (baseline fallback conversion rate)

const RATE_STORAGE_KEY = 'mobilis_php_exchange_rate';
const RATE_TIMESTAMP_KEY = 'mobilis_php_rate_ts';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches the live PHP/XLM exchange rate with a 5-minute local cache and resilient offline fallback.
 */
export async function fetchLiveExchangeRate(): Promise<number> {
    try {
        const cachedRate = localStorage.getItem(RATE_STORAGE_KEY);
        const cachedTs = localStorage.getItem(RATE_TIMESTAMP_KEY);
        const now = Date.now();

        if (cachedRate && cachedTs && now - parseInt(cachedTs, 10) < CACHE_TTL_MS) {
            const parsed = parseFloat(cachedRate);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }

        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=php');
        if (res.ok) {
            const data = await res.json();
            const liveRate = data?.stellar?.php;
            if (typeof liveRate === 'number' && liveRate > 0) {
                localStorage.setItem(RATE_STORAGE_KEY, liveRate.toString());
                localStorage.setItem(RATE_TIMESTAMP_KEY, now.toString());
                return liveRate;
            }
        }
    } catch {
        // Fallback silently on network interruption
    }
    return PHP_EXCHANGE_RATE;
}

// ─── Network Type ────────────────────────────────────────────
export type StellarNetwork = 'testnet' | 'mainnet';

// ─── Network Configuration Interface ─────────────────────────
export interface NetworkConfig {
    network: StellarNetwork;
    horizonServer: string;
    rpcServer: string;
    networkPassphrase: string;
    contractId: string | null;
    friendbotUrl: string | null;
    explorerBaseUrl: string;
    label: string;
}

// ─── Network Definitions ────────────────────────────────────
const TESTNET_CONFIG: NetworkConfig = {
    network: 'testnet',
    horizonServer: 'https://horizon-testnet.stellar.org',
    rpcServer: 'https://soroban-testnet.stellar.org',
    networkPassphrase: Networks.TESTNET,
    contractId: 'CAVFLXBG4MXGTGECI6WAZXMDNX2H3UWFTMNY4DHK2MR4YUYEEU5STBID',
    friendbotUrl: 'https://friendbot.stellar.org',
    explorerBaseUrl: 'https://stellar.expert/explorer/testnet',
    label: 'Stellar Testnet',
};

const MAINNET_CONFIG: NetworkConfig = {
    network: 'mainnet',
    horizonServer: 'https://horizon.stellar.org',
    rpcServer: 'https://mainnet.sorobanrpc.com',
    networkPassphrase: Networks.PUBLIC,
    contractId: null, // Not yet deployed to mainnet
    friendbotUrl: null, // No faucet on mainnet
    explorerBaseUrl: 'https://stellar.expert/explorer/public',
    label: 'Stellar Mainnet (Public)',
};

// ─── Storage Key ─────────────────────────────────────────────
const STORAGE_KEY = 'mobilis_stellar_network';

// ─── Event System ────────────────────────────────────────────
type NetworkChangeListener = (config: NetworkConfig) => void;
const listeners: NetworkChangeListener[] = [];

/**
 * Returns the currently active network configuration.
 * Reads from localStorage with fallback to testnet.
 */
export function getNetworkConfig(): NetworkConfig {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'mainnet') return MAINNET_CONFIG;
    } catch {
        // localStorage unavailable (SSR, privacy mode)
    }
    return TESTNET_CONFIG;
}

/**
 * Returns the active Stellar network identifier.
 */
export function getActiveNetwork(): StellarNetwork {
    return getNetworkConfig().network;
}

/**
 * Checks if the current network is testnet.
 */
export function isTestnet(): boolean {
    return getNetworkConfig().network === 'testnet';
}

/**
 * Checks if the current network is mainnet.
 */
export function isMainnet(): boolean {
    return getNetworkConfig().network === 'mainnet';
}

/**
 * Switches the active Stellar network.
 * Persists to localStorage and notifies all listeners.
 */
export function setNetwork(network: StellarNetwork): void {
    try {
        localStorage.setItem(STORAGE_KEY, network);
    } catch {
        // localStorage unavailable
    }
    const config = network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG;
    listeners.forEach((fn) => fn(config));
}

/**
 * Registers a callback to be invoked when the network changes.
 * Returns an unsubscribe function.
 */
export function onNetworkChange(listener: NetworkChangeListener): () => void {
    listeners.push(listener);
    return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
    };
}

// ─── Convenience Accessors ───────────────────────────────────
// These are functions (not constants) so they always reflect the active network.

export function getHorizonServer(): string {
    return getNetworkConfig().horizonServer;
}

export function getRpcServer(): string {
    return getNetworkConfig().rpcServer;
}

export function getNetworkPassphrase(): string {
    return getNetworkConfig().networkPassphrase;
}

export function getContractId(): string | null {
    return getNetworkConfig().contractId;
}

export function getFriendbotUrl(): string | null {
    return getNetworkConfig().friendbotUrl;
}

export function getExplorerUrl(type: 'tx' | 'account', id: string): string {
    const base = getNetworkConfig().explorerBaseUrl;
    if (type === 'tx') return `${base}/tx/${id}`;
    return `${base}/account/${id}`;
}
