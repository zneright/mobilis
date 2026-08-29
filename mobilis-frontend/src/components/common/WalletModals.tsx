import React from 'react';
import { X, Copy, Wallet, ArrowUpRight } from 'lucide-react';
import { cardRoleStyle, roleCtaBg } from '../tabs/roleStyleTokens';

interface SendModalProps {
    isOpen: boolean;
    onClose: () => void;
    role: string;
    sendDest: string;
    setSendDest: (v: string) => void;
    sendAmt: string;
    setSendAmt: (v: string) => void;
    isProcessing: boolean;
    appNetwork: string;
    onSend: (e: React.FormEvent) => void;
}

export const SendModal: React.FC<SendModalProps> = ({
    isOpen,
    onClose,
    role,
    sendDest,
    setSendDest,
    sendAmt,
    setSendAmt,
    isProcessing,
    appNetwork,
    onSend,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl relative transition-all ${cardRoleStyle(role)}`}>
                <button
                    onClick={onClose}
                    className="p-2 absolute top-5 right-5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black mb-6 text-slate-900 dark:text-white">Send XLM</h3>
                <form onSubmit={onSend} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-2">
                            Recipient Wallet Address
                        </label>
                        <input
                            required
                            type="text"
                            value={sendDest}
                            onChange={(e) => setSendDest(e.target.value)}
                            placeholder="G..."
                            className="w-full p-4 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none font-mono text-slate-900 dark:text-white focus:border-cyan-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-2">
                            Amount (XLM)
                        </label>
                        <input
                            required
                            type="number"
                            step="0.0000001"
                            value={sendAmt}
                            onChange={(e) => setSendAmt(e.target.value)}
                            placeholder="0.00"
                            className="w-full p-4 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none text-slate-900 dark:text-white focus:border-cyan-500"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isProcessing}
                        className={`w-full py-4 mt-2 font-black text-sm rounded-xl transition-all disabled:opacity-50 ${roleCtaBg(role)}`}
                    >
                        {isProcessing ? 'Processing...' : `Confirm & Send on ${appNetwork}`}
                    </button>
                </form>
            </div>
        </div>
    );
};

interface ReceiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    role: string;
    activePubKey?: string;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
    isOpen,
    onClose,
    role,
    activePubKey,
}) => {
    if (!isOpen || !activePubKey) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className={`w-full max-w-sm rounded-3xl p-8 shadow-2xl relative text-center transition-all ${cardRoleStyle(role)}`}>
                <button
                    onClick={onClose}
                    className="p-2 absolute top-5 right-5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">Receive Assets</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400 mb-8">Scan to transfer funds to your wallet.</p>
                <div className="bg-white p-4 rounded-2xl mx-auto w-fit mb-8 shadow-md">
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${activePubKey}`}
                        alt="QR Code"
                        className="w-48 h-48"
                    />
                </div>
                <div className="text-left">
                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-2">
                        Your Address
                    </label>
                    <div className="flex gap-2">
                        <code className="flex-1 bg-slate-50 dark:bg-black/50 p-4 rounded-xl text-[10px] break-all border border-slate-200 dark:border-white/10 font-mono text-slate-900 dark:text-white">
                            {activePubKey}
                        </code>
                        <button
                            onClick={() => navigator.clipboard.writeText(activePubKey)}
                            className={`p-4 rounded-xl font-bold transition-colors ${roleCtaBg(role)}`}
                            title="Copy address"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface WalletConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
    role: string;
    onConnectWallet: (name: 'Freighter' | 'LOBSTR') => void;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
    isOpen,
    onClose,
    role,
    onConnectWallet,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className={`w-full max-w-sm rounded-3xl p-8 shadow-2xl relative text-center transition-all ${cardRoleStyle(role)}`}>
                <button
                    onClick={onClose}
                    className="p-2 absolute top-5 right-5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
                <Wallet className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
                <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">Connect Wallet</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">Connect your wallet to continue.</p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => onConnectWallet('LOBSTR')}
                        className="w-full py-4 px-6 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between transition-colors"
                    >
                        LOBSTR Extension <ArrowUpRight className="w-4 h-4 opacity-50" />
                    </button>
                    <button
                        onClick={() => onConnectWallet('Freighter')}
                        className="w-full py-4 px-6 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between transition-colors"
                    >
                        Freighter <ArrowUpRight className="w-4 h-4 opacity-50" />
                    </button>
                </div>
            </div>
        </div>
    );
};
