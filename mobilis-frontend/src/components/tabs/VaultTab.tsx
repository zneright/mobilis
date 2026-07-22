import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, QrCode, ShieldCheck, RefreshCw } from 'lucide-react';
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

    const role = stellarData?.role ?? 'commuter';
    const cardStyle = cardRoleStyle(role);
    const pillStyle = rolePill(role);
    const accentStyle = roleAccentText(role);
    const ctaStyle = roleCtaBg(role);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-5 text-slate-900 dark:text-white font-sans">

            {/* ── BALANCE HERO CARD ───────────────────────────────── */}
            <div className={`p-8 sm:p-10 rounded-3xl relative overflow-hidden text-center space-y-6 transition-all duration-300 ${cardStyle}`}>

                <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold ${pillStyle}`}>
                        <Wallet className="w-4 h-4" />
                        <span>Mobilis Soroban Vault</span>
                    </div>
                    <button
                        onClick={refreshData}
                        className="p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm hover:shadow-md"
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

            {/* ── ASSET LIST ─────────────────────────────────────── */}
            <div className={`p-6 sm:p-8 rounded-3xl space-y-4 transition-all duration-300 ${cardStyle}`}>
                <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">Vault Assets</h3>

                {/* XLM Native Asset */}
                <div className="p-4 bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] border ${pillStyle}`}>
                            XLM
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Stellar Native (XLM)</h4>
                            <p className="text-[10px] font-mono text-slate-400 dark:text-gray-500">{appNetwork} Ledger Asset</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white block">{xlmNum.toFixed(4)} XLM</span>
                        <span className={`text-[10px] font-mono font-semibold block ${accentStyle}`}>{'\u2248'} {'\u20B1'}{phpEquivalent} PHP</span>
                    </div>
                </div>

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
            <div className={`px-6 py-4 rounded-2xl flex items-center justify-between text-xs font-mono transition-all duration-300 ${cardStyle}`}>
                <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${accentStyle}`} />
                    <span className="text-slate-500 dark:text-gray-500">Public Key: {activePubKey ? `${activePubKey.substring(0, 8)}...${activePubKey.substring(activePubKey.length - 8)}` : (stellarData?.publicKey ? `${stellarData.publicKey.substring(0, 8)}...` : 'N/A')}</span>
                </div>
                <span className={`font-bold uppercase text-[10px] ${accentStyle}`}>{appNetwork}</span>
            </div>
        </div>
    );
};

export default VaultTab;