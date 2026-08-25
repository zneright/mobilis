import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, QrCode, ShieldCheck, Clock, Check, Copy, AlertCircle, Sparkles, RefreshCw, Zap } from 'lucide-react';
import {
    createOfflineVoucher,
    getCommuterVouchers,
    type OfflineVoucherPayload,
} from '../../services/offlineVoucher';
import { roleCtaBg } from '../tabs/roleStyleTokens';

interface OfflineVoucherModalProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commuterData: any;
    onClose: () => void;
}

const PHP_RATE = 60.69;

export const OfflineVoucherModal: React.FC<OfflineVoucherModalProps> = ({
    commuterData,
    onClose,
}) => {
    const [farePhp, setFarePhp] = useState<string>('15');
    const [validityHours, setValidityHours] = useState<number>(24);
    const [activeVoucher, setActiveVoucher] = useState<OfflineVoucherPayload | null>(null);
    const [recentVouchers, setRecentVouchers] = useState<OfflineVoucherPayload[]>([]);
    const [copiedJson, setCopiedJson] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const role = commuterData?.role ?? 'commuter';
    const ctaStyle = roleCtaBg(role);

    const fareXlm = (parseFloat(farePhp || '0') / PHP_RATE).toFixed(4);

    useEffect(() => {
        const stored = getCommuterVouchers();
        setRecentVouchers(stored);
        if (stored.length > 0) {
            // Default to most recent non-expired voucher
            const valid = stored.find(v => v.expiresAt > Date.now());
            if (valid) {
                setActiveVoucher(valid);
            }
        }
    }, []);

    const handleGenerateVoucher = () => {
        setError(null);
        try {
            const secret = commuterData?.secret;
            if (!secret) {
                throw new Error("Commuter signing key not found. Please log in again.");
            }

            const amount = parseFloat(farePhp);
            if (isNaN(amount) || amount <= 0) {
                throw new Error("Please enter a valid fare amount.");
            }

            const newVoucher = createOfflineVoucher(
                secret,
                farePhp,
                fareXlm,
                commuterData?.name || commuterData?.email || 'Commuter',
                validityHours
            );

            setActiveVoucher(newVoucher);
            setRecentVouchers(getCommuterVouchers());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to generate voucher');
        }
    };

    const handleCopyPayload = () => {
        if (!activeVoucher) return;
        navigator.clipboard.writeText(JSON.stringify(activeVoucher, null, 2));
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
    };

    const isExpired = activeVoucher ? activeVoucher.expiresAt < Date.now() : false;
    const hoursRemaining = activeVoucher
        ? Math.max(0, Math.round((activeVoucher.expiresAt - Date.now()) / (1000 * 60 * 60)))
        : 0;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white relative max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <QrCode className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold font-mono tracking-tight">Offline Fare Voucher</h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    SEP-ED25519
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-mono">Pre-signed cryptographic transit pass for zero-connectivity zones</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-xs font-mono">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Main Card */}
                {activeVoucher && !isExpired ? (
                    <div className="space-y-4">
                        {/* High Contrast QR / Cryptographic Pass */}
                        <div className="p-6 rounded-2xl bg-slate-950 border border-emerald-500/40 text-center space-y-4 relative overflow-hidden">
                            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                    <ShieldCheck className="w-4 h-4" /> Cryptographically Signed
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> Valid for {hoursRemaining}h
                                </span>
                            </div>

                            {/* Simulated High-Res QR Code Representation with Matrix pattern & embedded hash */}
                            <div className="mx-auto w-48 h-48 sm:w-56 sm:h-56 bg-white p-3 rounded-2xl flex flex-col items-center justify-center shadow-inner relative group">
                                <div className="w-full h-full border-4 border-slate-900 rounded-xl p-2 flex flex-col justify-between bg-slate-900 text-white relative">
                                    <div className="flex justify-between">
                                        <div className="w-8 h-8 border-4 border-emerald-400 rounded-md bg-white flex items-center justify-center">
                                            <div className="w-3 h-3 bg-slate-900 rounded-sm" />
                                        </div>
                                        <div className="w-8 h-8 border-4 border-emerald-400 rounded-md bg-white flex items-center justify-center">
                                            <div className="w-3 h-3 bg-slate-900 rounded-sm" />
                                        </div>
                                    </div>

                                    {/* Embedded Data Badge */}
                                    <div className="text-center space-y-1">
                                        <div className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
                                            ₱{activeVoucher.farePhp}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-300">
                                            {activeVoucher.fareXlm} XLM
                                        </div>
                                        <div className="text-[8px] font-mono text-slate-400 truncate max-w-[140px] mx-auto">
                                            {activeVoucher.voucherId}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="w-8 h-8 border-4 border-emerald-400 rounded-md bg-white flex items-center justify-center">
                                            <div className="w-3 h-3 bg-slate-900 rounded-sm" />
                                        </div>
                                        <div className="text-[8px] font-mono text-emerald-400 font-bold tracking-widest uppercase">
                                            OFFLINE
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 text-left space-y-1.5 font-mono text-xs">
                                <div className="flex justify-between text-slate-400">
                                    <span>Voucher ID:</span>
                                    <span className="text-white font-bold">{activeVoucher.voucherId}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>Commuter Key:</span>
                                    <span className="text-slate-300 truncate max-w-[180px]">{activeVoucher.commuterPubKey}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>ED25519 Proof:</span>
                                    <span className="text-emerald-400 truncate max-w-[180px]">{activeVoucher.signature.substring(0, 24)}...</span>
                                </div>
                            </div>

                            {/* Action Row */}
                            <div className="flex items-center justify-center gap-3 pt-1">
                                <button
                                    onClick={handleCopyPayload}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold flex items-center gap-2 transition-all"
                                >
                                    {copiedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    <span>{copiedJson ? 'Copied Voucher Data' : 'Copy Voucher Code'}</span>
                                </button>
                                <button
                                    onClick={() => setActiveVoucher(null)}
                                    className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 transition-all"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    <span>Generate New</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Generator Form */
                    <div className="space-y-5">
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold font-mono">
                                <Sparkles className="w-4 h-4" />
                                <span>Zero-Data Transit Pass</span>
                            </div>
                            <p className="text-xs text-slate-300 font-mono leading-relaxed">
                                Pre-sign vouchers before entering dead zones (subways, rural terminals, basement queues). Drivers can scan and verify your fare without cellular signal.
                            </p>
                        </div>

                        {/* Amount Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Select Fare Amount</label>
                            <div className="grid grid-cols-4 gap-2">
                                {['15', '30', '50', '100'].map((amt) => (
                                    <button
                                        key={amt}
                                        onClick={() => setFarePhp(amt)}
                                        className={`py-3 rounded-2xl text-sm font-mono font-bold border transition-all ${
                                            farePhp === amt
                                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                                                : 'bg-slate-950 border-white/10 text-slate-300 hover:border-emerald-500/50'
                                        }`}
                                    >
                                        ₱{amt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Validity Duration */}
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Voucher Validity</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: '6 Hours', val: 6 },
                                    { label: '24 Hours', val: 24 },
                                    { label: '48 Hours', val: 48 },
                                ].map((dur) => (
                                    <button
                                        key={dur.val}
                                        onClick={() => setValidityHours(dur.val)}
                                        className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                                            validityHours === dur.val
                                                ? 'bg-white/15 text-white border-white/30'
                                                : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {dur.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-between font-mono text-xs">
                            <span className="text-slate-400">Estimated Stellar Value:</span>
                            <span className="text-emerald-400 font-bold">≈ {fareXlm} XLM</span>
                        </div>

                        <button
                            onClick={handleGenerateVoucher}
                            className={`w-full py-3.5 rounded-2xl font-mono font-bold text-slate-950 flex items-center justify-center gap-2 shadow-xl hover:scale-[1.01] active:scale-95 transition-all ${ctaStyle}`}
                        >
                            <Zap className="w-4 h-4 fill-current" />
                            <span>Sign & Generate Offline Voucher</span>
                        </button>
                    </div>
                )}

                {/* Stored Active Vouchers Drawer */}
                {recentVouchers.length > 0 && !activeVoucher && (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Cached Active Passes</label>
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                            {recentVouchers.map((v) => {
                                const valid = v.expiresAt > Date.now();
                                return (
                                    <div
                                        key={v.voucherId}
                                        onClick={() => valid && setActiveVoucher(v)}
                                        className={`p-3 rounded-xl border flex items-center justify-between font-mono text-xs cursor-pointer transition-all ${
                                            valid
                                                ? 'bg-slate-950/80 border-emerald-500/30 hover:border-emerald-500/60 text-slate-200'
                                                : 'bg-slate-950/30 border-white/5 text-slate-500 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className="space-y-0.5">
                                            <div className="font-bold flex items-center gap-2">
                                                <span>₱{v.farePhp} ({v.fareXlm} XLM)</span>
                                                {valid ? (
                                                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
                                                ) : (
                                                    <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">Expired</span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-400">{v.voucherId}</div>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
