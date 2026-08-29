/**
 * Mobilis Frontend Core Invariants & Unit Test Suite
 * Validates cryptographic voucher digests, exchange rate conversions, and network configurations.
 */

import { PHP_EXCHANGE_RATE, getNetworkConfig, setNetwork } from './services/networkConfig';
import { isSoundEnabled, setSoundEnabled } from './utils/webAudio';
import { createOfflineVoucher, verifyOfflineVoucher } from './services/offlineVoucher';
import { Keypair } from '@stellar/stellar-sdk';

export function runMobilisUnitTests(): boolean {
    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, testName: string) {
        if (condition) {
            passed++;
        } else {
            failed++;
            console.error(`❌ Assertion Failed: ${testName}`);
        }
    }

    // ── 1. Exchange Rate Precision Invariants ──────────────────────
    assert(PHP_EXCHANGE_RATE > 0, 'PHP exchange rate constant is strictly positive');
    const sampleXlm = 10;
    const computedPhp = sampleXlm * PHP_EXCHANGE_RATE;
    assert(computedPhp === 606.9, '10 XLM correctly calculates to 606.90 PHP at baseline 60.69');
    assert((computedPhp / PHP_EXCHANGE_RATE) === sampleXlm, 'Bidirectional conversion roundtrips with 0 error');

    // ── 2. Audio & Haptic Preference Toggle Invariants ─────────────
    setSoundEnabled(false);
    assert(!isSoundEnabled(), 'Sound preference can be explicitly disabled');
    setSoundEnabled(true);
    assert(isSoundEnabled(), 'Sound preference can be explicitly enabled');

    // ── 3. Network Configuration Isolation Invariants ──────────────
    setNetwork('testnet');
    const testnetCfg = getNetworkConfig();
    assert(testnetCfg.network === 'testnet', 'Testnet config reports correct network tag');
    assert(testnetCfg.friendbotUrl !== null, 'Testnet config provides faucet endpoint');
    assert(testnetCfg.networkPassphrase.includes('Test SDF Network'), 'Testnet passphrase strictly isolated');

    setNetwork('mainnet');
    const mainnetCfg = getNetworkConfig();
    assert(mainnetCfg.network === 'mainnet', 'Mainnet config reports correct network tag');
    assert(mainnetCfg.friendbotUrl === null, 'Mainnet config explicitly disables Friendbot faucet');
    assert(mainnetCfg.networkPassphrase.includes('Public Global Stellar Network'), 'Mainnet passphrase strictly isolated');

    // Restore to testnet default
    setNetwork('testnet');

    // ── 4. Offline Cryptographic Voucher Signing & Verification Invariants ──
    const commuterPair = Keypair.random();

    const voucher = createOfflineVoucher(
        commuterPair.secret(),
        '15.00', // 15 PHP
        '0.2472', // XLM equivalent
        'Juan Commuter'
    );

    assert(voucher.farePhp === '15.00', 'Voucher contains correct PHP fare amount');
    assert(voucher.commuterPubKey === commuterPair.publicKey(), 'Voucher matches commuter public key');
    assert(voucher.signature.length > 0, 'Voucher includes non-empty Ed25519 signature');

    const verifyResult = verifyOfflineVoucher(voucher);
    assert(verifyResult.valid, 'Offline voucher signature cryptographically verifies against commuter public key');

    // Tampered voucher check
    const tamperedVoucher = { ...voucher, farePhp: '100.00' };
    const tamperedResult = verifyOfflineVoucher(tamperedVoucher);
    assert(!tamperedResult.valid, 'Tampered offline voucher amount correctly rejected by verification');

    return failed === 0;
}

// Self-executing validation on module load during development
if (typeof window !== 'undefined') {
    runMobilisUnitTests();
}
