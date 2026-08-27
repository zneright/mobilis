/**
 * NetworkSwitcher — Premium pill-style toggle for Testnet/Mainnet switching.
 * 
 * Displays the active network with color-coded indicator and opens
 * the NetworkDisclaimerModal when the user attempts to switch.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Shield, Zap } from 'lucide-react';
import { getActiveNetwork, setNetwork, onNetworkChange, type StellarNetwork } from '../../services/networkConfig';
import { NetworkDisclaimerModal } from './NetworkDisclaimerModal';

interface NetworkSwitcherProps {
    /** Optional callback invoked after network change is confirmed */
    onNetworkChanged?: (network: StellarNetwork) => void;
    /** Compact mode for tight spaces */
    compact?: boolean;
}

export const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({ onNetworkChanged, compact = false }) => {
    const [activeNetwork, setActiveNetwork] = useState<StellarNetwork>(getActiveNetwork);
    const [pendingTarget, setPendingTarget] = useState<StellarNetwork | null>(null);

    useEffect(() => {
        const unsub = onNetworkChange((config) => {
            setActiveNetwork(config.network);
        });
        return unsub;
    }, []);

    const handleToggleClick = () => {
        const target: StellarNetwork = activeNetwork === 'testnet' ? 'mainnet' : 'testnet';
        setPendingTarget(target);
    };

    const handleConfirm = () => {
        if (pendingTarget) {
            setNetwork(pendingTarget);
            setActiveNetwork(pendingTarget);
            onNetworkChanged?.(pendingTarget);
        }
        setPendingTarget(null);
    };

    const handleCancel = () => {
        setPendingTarget(null);
    };

    const isMainnet = activeNetwork === 'mainnet';

    if (compact) {
        return (
            <>
                <button
                    onClick={handleToggleClick}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        isMainnet
                            ? 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border border-emerald-500/30'
                    }`}
                    title={`Current: ${isMainnet ? 'Mainnet' : 'Testnet'}. Click to switch.`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${isMainnet ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    {isMainnet ? 'MAINNET' : 'TESTNET'}
                </button>

                <NetworkDisclaimerModal
                    isOpen={pendingTarget !== null}
                    targetNetwork={pendingTarget || 'testnet'}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            </>
        );
    }

    return (
        <>
            <div className="flex items-center gap-3">
                {/* Network Info Badge */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isMainnet
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                    {isMainnet ? (
                        <Shield size={14} className="text-amber-500" />
                    ) : (
                        <Zap size={14} className="text-emerald-500" />
                    )}
                    <span className={`w-1.5 h-1.5 rounded-full ${isMainnet ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    {isMainnet ? 'Stellar Mainnet' : 'Stellar Testnet'}
                </div>

                {/* Toggle Pill */}
                <button
                    onClick={handleToggleClick}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                        isMainnet
                            ? 'bg-gradient-to-r from-amber-500 to-red-500 focus:ring-amber-500'
                            : 'bg-emerald-500 focus:ring-emerald-500'
                    }`}
                    title={`Switch to ${isMainnet ? 'Testnet' : 'Mainnet'}`}
                >
                    <motion.div
                        className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center"
                        animate={{ left: isMainnet ? '2rem' : '0.25rem' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                        <Globe size={12} className={isMainnet ? 'text-amber-500' : 'text-emerald-500'} />
                    </motion.div>
                </button>
            </div>

            <NetworkDisclaimerModal
                isOpen={pendingTarget !== null}
                targetNetwork={pendingTarget || 'testnet'}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </>
    );
};
