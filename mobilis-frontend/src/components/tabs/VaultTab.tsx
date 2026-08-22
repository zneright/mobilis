import React, { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, QrCode, ShieldCheck, RefreshCw, Zap, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { cardRoleStyle, rolePill, roleAccentText, roleCtaBg } from './roleStyleTokens';

interface VaultTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stellarData: any;
    externalWallet: string | null;
    activePubKey: string | null;
    xlmBalance: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assetBalances: any[];
    currencyMode: 'XLM' | 'PHP';
    setCurrencyMode: React.Dispatch<React.SetStateAction<'XLM' | 'PHP'>>;
    formatCurrency: (amountXlm: number | string) => string;
    setShowWalletModal: (show: boolean) => void;
    handleDisconnectWallet: () => void;
    setShowReceiveModal: (show: boolean) => void;
    setShowSendModal: (show: boolean) => void;
    appNetwork: string;
    refreshData: () => void;
}

const PHP_RATE = 60.69;

export const VaultTab: React.FC<VaultTabProps> = ({
    stellarData,
    activePubKey,
    xlmBalance,
    assetBalances,
    currencyMode,
    setCurrencyMode,
    setShowReceiveModal,
    setShowSendModal,
    appNetwork,
    refreshData,
}) => {
    const xlmNum = parseFloat(xlmBalance || '0');
    const phpEquivalent = (xlmNum * PHP_RATE).toFixed(2);

    const [isFunding, setIsFunding] = useState(false);
    const [fundMessage, setFundMessage] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState(false);

    const role = stellarData?.role ?? 'commuter';
    const cardStyle = cardRoleStyle(role);
    const pillStyle = rolePill(role);
    const accentStyle = roleAccentText(role);
    const ctaStyle = roleCtaBg(role);

    const targetKey = activePubKey || stellarData?.publicKey;

    const handleCopyKey = () => {
        if (!targetKey) return;
        navigator.clipboard.writeText(targetKey);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    const handleRequestFriendbot = async () => {
        if (!targetKey) return;
        setIsFunding(true);
        setFundMessage(null);
        try {
            const res = await fetch(`https://friendbot.stellar.org?addr=${targetKey}`);
            if (res.ok) {
                setFundMessage('Testnet XLM funded successfully! Refreshing balance...');
                setTimeout(() => {
                    refreshData();
                    setIsFunding(false);
                    setTimeout(() => setFundMessage(null), 4000);
                }, 2000);
            } else {
                setFundMessage('Friendbot rate limit or network delay. Please try again.');
                setIsFunding(false);
            }
        } catch {
            setFundMessage('Failed to reach Stellar Friendbot faucet.');
            setIsFunding(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto text-slate-900 dark:text-white font-sans">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Balance & Wallet Core Actions (Col-span 8) */}
                <div className="md:col-span-8 space-y-6 flex flex-col h-full justify-start">
                    
                    {/* ── BALANCE HERO CARD ───────────────────────────────── */}
                    <div className={`p-8 sm:p-10 rounded-3xl relative overflow-hidden text-center space-y-6 transition-all duration-300 ${cardStyle}`}>
                        <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold ${pillStyle}`}>
                                <Wallet className="w-4 h-4" />
                                <span>Mobilis Soroban Vault</span>
                            </div>
                            <button
                                onClick={refreshData}
                                className="p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95"
                                title="Sync Stellar Ledger"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-gray-500 font-semibold">Total Wallet Balance</p>
                            <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                                {currencyMode === 'PHP' ? `\u20B1${phpEquivalent}` : `${xlmNum.toFixed(2)} XLM`}
                            </h2>
                            <p className={`text-xs font-mono font-semibold ${accentStyle}`}>
                                {currencyMode === 'PHP' ? `\u2248 ${xlmNum.toFixed(4)} XLM` : `\u2248 \u20B1${phpEquivalent} PHP`}
                            </p>
                        </div>

                        {/* Currency Mode Toggle */}
                        <div className="inline-flex p-1 bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl shadow-sm">
                            <button
                                onClick={() => setCurrencyMode('PHP')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    currencyMode === 'PHP'
                                        ? `${ctaStyle} font-black`
                                        : 'text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                PHP Fiat
                            </button>
                            <button
                                onClick={() => setCurrencyMode('XLM')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    currencyMode === 'XLM'
                                        ? `${ctaStyle} font-black`
                                        : 'text-slate-500 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                XLM Native
                            </button>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center justify-center gap-8 pt-2">
                            <button onClick={() => setShowSendModal(true)} className="flex flex-col items-center gap-2 group">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 ${ctaStyle}`}>
                                    <ArrowUpRight className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-600 dark:text-gray-400">Send</span>
                            </button>

                            <button onClick={() => setShowReceiveModal(true)} className="flex flex-col items-center gap-2 group">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 ${ctaStyle}`}>
                                    <ArrowDownLeft className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-600 dark:text-gray-400">Receive</span>
                            </button>

                            <button onClick={() => setShowReceiveModal(true)} className="flex flex-col items-center gap-2 group">
                                <div className="w-14 h-14 rounded-2xl bg-white/70 dark:bg-white/[0.06] text-slate-700 dark:text-gray-300 border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center transition-all group-hover:scale-105 shadow-sm">
                                    <QrCode className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-600 dark:text-gray-400">My QR</span>
                            </button>
                        </div>
                    </div>

                    {/* Faucet Top-Up Card (Feedback Feature) */}
                    <div className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4 ${cardStyle}`}>
                        <div className="flex items-center gap-3.5 text-left">
                            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0 border border-cyan-500/20">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-black text-sm text-slate-900 dark:text-white">Stellar Testnet Top-Up</h4>
                                <p className="text-xs text-slate-500 dark:text-gray-400">Request free Testnet XLM to test fare payments & fuel loans</p>
                            </div>
                        </div>

                        <button
                            onClick={handleRequestFriendbot}
                            disabled={isFunding}
                            className="px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-black text-xs transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)] flex items-center gap-2 flex-shrink-0 active:scale-95"
                        >
                            {isFunding ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Funding Wallet...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-3.5 h-3.5" /> Faucet +100 XLM
                                </>
                            )}
                        </button>
                    </div>

                    {fundMessage && (
                        <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-2xl text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            <span>{fundMessage}</span>
                        </div>
                    )}

                </div>

                {/* Right Column: Asset List & Key Footer (Col-span 4) */}
                <div className="md:col-span-4 space-y-6 flex flex-col h-full justify-start">
                    
                    {/* ── ASSET LIST ─────────────────────────────────────── */}
                    <div className={`p-6 sm:p-8 rounded-3xl space-y-4 transition-all duration-300 ${cardStyle}`}>
                        <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">Vault Assets</h3>

                        {/* XLM Native Asset */}
                        <div className="p-4 bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] border ${pillStyle} flex-shrink-0`}>
                                    XLM
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Stellar Native</h4>
                                    <p className="text-[9px] font-mono text-slate-400 dark:text-gray-500">{appNetwork} Asset</p>
                                </div>
                            </div>
                            <div className="text-left sm:text-right mt-1 sm:mt-0">
                                <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block">{xlmNum.toFixed(4)} XLM</span>
                                <span className={`text-[9px] font-mono font-semibold block ${accentStyle}`}>{'\u2248'} {'\u20B1'}{phpEquivalent} PHP</span>
                            </div>
                        </div>

                        {/* Low Balance Indicator */}
                        {xlmNum < 5 && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>Low balance. Use Faucet Top-Up above to add XLM.</span>
                            </div>
                        )}

                        {/* Other Assets */}
                        {assetBalances && assetBalances.length > 0 && assetBalances.map((asset, idx) => (
                            <div key={idx} className="p-4 bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] border ${pillStyle}`}>
                                        {asset.asset_code?.substring(0, 3) || 'TKN'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{asset.asset_code || 'Custom Asset'}</h4>
                                        <p className="text-[10px] font-mono text-slate-400 dark:text-gray-500">{asset.asset_issuer?.substring(0, 8)}...</p>
                                    </div>
                                </div>
                                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{parseFloat(asset.balance).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    {/* ── PUBLIC KEY FOOTER ──────────────────────────────── */}
                    <div className={`px-5 py-4 rounded-2xl flex flex-col gap-2 text-left text-xs font-mono transition-all duration-300 ${cardStyle}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className={`w-4 h-4 flex-shrink-0 ${accentStyle}`} />
                                <span className="text-slate-500 dark:text-gray-500 font-bold uppercase text-[9px]">Ledger Network: {appNetwork}</span>
                            </div>
                            <button
                                onClick={handleCopyKey}
                                className="px-2 py-1 rounded-lg bg-white/60 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 flex items-center gap-1 text-[10px] transition-all"
                            >
                                {copiedKey ? (
                                    <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3" /> Copy
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-gray-500 break-all select-all font-mono leading-relaxed">
                            {targetKey || 'N/A'}
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default VaultTab;