import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, QrCode, ShieldCheck, RefreshCw } from 'lucide-react';

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

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 text-white font-sans">
            
            {/* REVOLUT / APPLE WALLET BALANCE HERO CARD */}
            <div className="p-8 sm:p-10 rounded-[2.5rem] bg-gradient-to-br from-[#121418] to-[#1C1F26] border border-white/10 shadow-2xl relative overflow-hidden text-center space-y-6">
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold">
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Mobilis Web3 Vault</span>
                    </div>
                    <button
                        onClick={refreshData}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all"
                        title="Sync Stellar Ledger"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-mono uppercase tracking-widest text-gray-400 font-bold">Total Wallet Balance</p>
                    <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white font-mono">
                        {currencyMode === 'PHP' ? `₱${phpEquivalent} PHP` : `${xlmNum.toFixed(2)} XLM`}
                    </h2>
                    <p className="text-xs font-mono text-cyan-400 font-bold">
                        {currencyMode === 'PHP' ? `≈ ${xlmNum.toFixed(4)} XLM` : `≈ ₱${phpEquivalent} PHP`}
                    </p>
                </div>

                {/* Quick Currency Mode Toggle */}
                <div className="inline-flex p-1 bg-black/40 border border-white/10 rounded-2xl">
                    <button
                        onClick={() => setCurrencyMode('PHP')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            currencyMode === 'PHP'
                                ? 'bg-cyan-500 text-black shadow-md font-black'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        🇵🇭 PHP Fiat Mode
                    </button>
                    <button
                        onClick={() => setCurrencyMode('XLM')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            currencyMode === 'XLM'
                                ? 'bg-cyan-500 text-black shadow-md font-black'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        🚀 XLM Native Mode
                    </button>
                </div>

                {/* QUICK ACTION CIRCLE BUTTONS */}
                <div className="flex items-center justify-center gap-6 pt-4">
                    <button
                        onClick={() => setShowSendModal(true)}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-cyan-500 text-black flex items-center justify-center font-black transition-all group-hover:scale-110 shadow-[0_0_20px_rgba(0,210,255,0.4)]">
                            <ArrowUpRight className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-300">Send</span>
                    </button>

                    <button
                        onClick={() => setShowReceiveModal(true)}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-black transition-all group-hover:scale-110 shadow-[0_0_20px_rgba(52,211,153,0.4)]">
                            <ArrowDownLeft className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-300">Receive</span>
                    </button>

                    <button
                        onClick={() => setShowReceiveModal(true)}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-white/10 text-white border border-white/20 flex items-center justify-center font-black transition-all group-hover:scale-110">
                            <QrCode className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-300">My QR</span>
                    </button>
                </div>
            </div>

            {/* ASSET LIST */}
            <div className="p-8 rounded-[2.5rem] bg-[#121418] border border-white/10 shadow-2xl space-y-4">
                <h3 className="font-black text-lg text-white">Vault Assets</h3>

                <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-black text-xs">
                            XLM
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-white">Stellar Native (XLM)</h4>
                            <p className="text-[10px] font-mono text-gray-400">{appNetwork} Ledger Asset</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="font-mono font-bold text-sm text-white block">{xlmNum.toFixed(4)} XLM</span>
                        <span className="text-xs font-mono text-emerald-400 font-bold block">≈ ₱{phpEquivalent} PHP</span>
                    </div>
                </div>

                {assetBalances && assetBalances.length > 0 && assetBalances.map((asset, idx) => (
                    <div key={idx} className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-xs">
                                {asset.asset_code?.substring(0, 3) || 'TOKEN'}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-white">{asset.asset_code || 'Custom Asset'}</h4>
                                <p className="text-[10px] font-mono text-gray-400">{asset.asset_issuer?.substring(0, 8)}...</p>
                            </div>
                        </div>
                        <span className="font-mono font-bold text-sm text-white">{parseFloat(asset.balance).toFixed(2)}</span>
                    </div>
                ))}
            </div>

            {/* PUBLIC KEY & STATUS BLOCK */}
            <div className="p-6 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs text-gray-400 font-mono">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Public Key: {activePubKey ? `${activePubKey.substring(0, 8)}...${activePubKey.substring(activePubKey.length - 8)}` : (stellarData?.publicKey ? `${stellarData.publicKey.substring(0, 8)}...` : 'N/A')}</span>
                </div>
                <span className="text-cyan-400 font-bold uppercase">{appNetwork}</span>
            </div>
        </div>
    );
};

export default VaultTab;