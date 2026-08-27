/**
 * NetworkDisclaimerModal — Multi-step mainnet confirmation dialog.
 * 
 * Requires users to acknowledge 3 safety checkboxes and type "MAINNET"
 * before switching to the live Stellar network with real funds.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert, ArrowRight, X, CheckCircle2 } from 'lucide-react';

interface NetworkDisclaimerModalProps {
    isOpen: boolean;
    targetNetwork: 'testnet' | 'mainnet';
    onConfirm: () => void;
    onCancel: () => void;
}

export const NetworkDisclaimerModal: React.FC<NetworkDisclaimerModalProps> = ({
    isOpen,
    targetNetwork,
    onConfirm,
    onCancel,
}) => {
    const [step, setStep] = useState(1);
    const [checks, setChecks] = useState([false, false, false]);
    const [confirmText, setConfirmText] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setChecks([false, false, false]);
            setConfirmText('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isToMainnet = targetNetwork === 'mainnet';
    const allChecked = checks.every(Boolean);
    const confirmMatch = confirmText.trim().toUpperCase() === 'MAINNET';

    const toggleCheck = (idx: number) => {
        setChecks((prev) => prev.map((v, i) => (i === idx ? !v : v)));
    };

    // Switching BACK to testnet is a simple 1-step confirmation
    if (!isToMainnet) {
        return createPortal(
            <AnimatePresence>
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onCancel}
                >
                    <motion.div
                        className="relative w-full max-w-md mx-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                                <CheckCircle2 size={22} className="text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Switch to Testnet</h3>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                            You are switching back to the <span className="font-semibold text-emerald-500">Stellar Testnet</span> — the safe sandbox environment.
                            All transactions will use test XLM with no monetary value.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
                            >
                                Switch to Testnet
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>,
            document.body
        );
    }

    // ─── Mainnet: Multi-Step Confirmation ─────────────────────
    return createPortal(
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCancel}
            >
                <motion.div
                    className="relative w-full max-w-lg mx-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 shadow-2xl shadow-amber-500/10 overflow-hidden"
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-500/10 via-red-500/10 to-amber-500/10 dark:from-amber-500/20 dark:via-red-500/20 dark:to-amber-500/20 px-6 py-4 border-b border-amber-500/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center animate-pulse">
                                    <ShieldAlert size={22} className="text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Switch to Mainnet</h3>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Step {step} of 3</p>
                                </div>
                            </div>
                            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                                initial={{ width: '0%' }}
                                animate={{ width: `${(step / 3) * 100}%` }}
                                transition={{ duration: 0.4 }}
                            />
                        </div>
                    </div>

                    <div className="p-6">
                        <AnimatePresence mode="wait">
                            {/* ─── Step 1: Warning ──────────────────── */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <div className="flex items-start gap-4 mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                                        <AlertTriangle size={24} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">Real Funds Warning</p>
                                            <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                                                You are about to switch to the <strong>Stellar Public Network (Mainnet)</strong>.
                                                All transactions will use <strong>real XLM</strong> with real monetary value.
                                                This cannot be undone once a transaction is submitted.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                                                <span className="text-red-500 font-bold text-sm">₱</span>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">Fare payments will deduct <strong>real XLM</strong> from your wallet</p>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                                                <span className="text-red-500 font-bold text-sm">⛓</span>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">All on-chain transactions are <strong>permanent and irreversible</strong></p>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                                                <span className="text-red-500 font-bold text-sm">🚫</span>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">Testnet Friendbot faucet is <strong>not available</strong> on mainnet</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setStep(2)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/25"
                                    >
                                        I Understand the Risks
                                        <ArrowRight size={16} />
                                    </button>
                                </motion.div>
                            )}

                            {/* ─── Step 2: Acknowledgment Checklist ──── */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                        Please confirm each statement before proceeding:
                                    </p>

                                    <div className="space-y-3 mb-6">
                                        {[
                                            'I understand that all transactions on Mainnet are irreversible and use real XLM.',
                                            'I understand that this uses real funds with real monetary value.',
                                            'I have verified my wallet address and will review all transactions before signing.',
                                        ].map((label, idx) => (
                                            <label
                                                key={idx}
                                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                    checks[idx]
                                                        ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10'
                                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checks[idx]}
                                                    onChange={() => toggleCheck(idx)}
                                                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{label}</span>
                                            </label>
                                        ))}
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setStep(1)}
                                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={() => setStep(3)}
                                            disabled={!allChecked}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                                allChecked
                                                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/25'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                            }`}
                                        >
                                            Continue
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─── Step 3: Type Confirmation ─────────── */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                        To confirm the switch, type <span className="font-mono font-bold text-amber-500">MAINNET</span> below:
                                    </p>

                                    <input
                                        type="text"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        placeholder="Type MAINNET to confirm"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all mb-6"
                                        autoFocus
                                    />

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setStep(2)}
                                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={onConfirm}
                                            disabled={!confirmMatch}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                                confirmMatch
                                                    ? 'bg-gradient-to-r from-amber-500 to-red-500 text-white hover:from-amber-600 hover:to-red-600 shadow-lg shadow-red-500/25'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                            }`}
                                        >
                                            <ShieldAlert size={16} />
                                            Activate Mainnet
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};
