import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { ExternalLink, Fuel, Zap, CheckCircle2, Receipt, X, Printer, Copy, Check } from 'lucide-react';

interface HistoryTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    txHistory: any[];
    appNetwork: 'TESTNET';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stellarData?: any;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ txHistory, appNetwork, stellarData }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [fareTxs, setFareTxs] = useState<any[]>([]);
    const [loadingFares, setLoadingFares] = useState<boolean>(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
    const [copiedHash, setCopiedHash] = useState<boolean>(false);

    useEffect(() => {
        if (!stellarData?.uid) {
            setLoadingFares(false);
            return;
        }

        const role = stellarData.role;
        let q;

        if (role === 'commuter') {
            q = query(collection(db, 'fare_transactions'), where('commuterId', '==', stellarData.uid));
        } else if (role === 'driver') {
            q = query(collection(db, 'fare_transactions'), where('driverId', '==', stellarData.uid));
        } else {
            q = query(collection(db, 'fare_transactions'));
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fares: any[] = [];
                snapshot.forEach((doc) => fares.push({ id: doc.id, ...doc.data() }));
                setFareTxs(fares);
                setLoadingFares(false);
            },
            (err) => {
                console.error('Error fetching fare transactions:', err);
                setLoadingFares(false);
            }
        );

        return () => unsubscribe();
    }, [stellarData]);

    const combinedHistory = [
        ...fareTxs.map((f) => ({
            txHash: f.txHash,
            amount: f.amount,
            amountPhp: f.amountPhp,
            asset: 'XLM',
            timestamp: f.timestamp,
            type: 'FARE_PAYMENT',
            senderName: f.commuterName || 'Commuter',
            receiverName: f.driverName || 'Driver',
            plateNumber: f.driverPlateNumber || 'N/A',
            coopName: f.driverToda || 'Independent',
            status: f.status || 'completed',
        })),
        ...(txHistory || []).map((t) => ({
            ...t,
            type: t.type || 'CONTRACT_ADVANCE',
            status: 'completed',
        })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const handleCopyHash = (hash: string) => {
        navigator.clipboard.writeText(hash);
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-[#0a0a14] border border-gray-200 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                        Transit & Fleet Ledger
                    </h3>
                    <p className="text-gray-500 text-xs sm:text-sm">
                        Verified micro-payments and contract operations recorded on Stellar Testnet.
                    </p>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono hidden sm:block">
                    Immutable Receipts
                </div>
            </div>

            <div className="space-y-4">
                {loadingFares ? (
                    <div className="space-y-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="p-5 bg-gray-50 dark:bg-white/5 rounded-2xl animate-pulse h-28" />
                        ))}
                    </div>
                ) : combinedHistory.length > 0 ? (
                    combinedHistory.map((tx, idx) => {
                        const isFare = tx.type === 'FARE_PAYMENT';
                        return (
                            <div
                                key={idx}
                                className="p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5 flex flex-col md:flex-row md:justify-between md:items-start gap-4 transition-all hover:border-emerald-500/30"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`p-1.5 rounded-lg text-xs font-black flex items-center gap-1 ${
                                                isFare
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                            }`}>
                                                {isFare ? <Zap className="w-3.5 h-3.5" /> : <Fuel className="w-3.5 h-3.5" />}
                                                {isFare ? 'FARE PAYMENT' : 'CONTRACT ADVANCE'}
                                            </span>
                                            <span className="text-xs font-bold text-gray-400 font-mono">
                                                {tx.status?.toUpperCase() || 'CONFIRMED'}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-lg text-emerald-500">
                                                +{parseFloat(tx.amount || 0).toFixed(2)} {tx.asset || 'XLM'}
                                            </p>
                                            {tx.amountPhp && (
                                                <p className="text-[10px] font-bold text-gray-400 font-mono">
                                                    ≈ ₱{tx.amountPhp} PHP
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <p className="text-gray-400 text-xs font-mono mb-4">
                                        {new Date(tx.timestamp).toLocaleString()}
                                    </p>

                                    {/* Rich Metadata */}
                                    <div className="grid grid-cols-2 gap-2 bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                                        <div className="col-span-2 sm:col-span-1">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Commuter Payer</p>
                                            <p className="text-sm font-bold truncate text-gray-900 dark:text-white">{tx.senderName || 'Commuter'}</p>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Driver Recipient</p>
                                            <p className="text-sm font-bold truncate text-gray-900 dark:text-white">{tx.receiverName || 'Driver'}</p>
                                        </div>
                                        <div className="col-span-2 mt-2 pt-2 border-t border-gray-200 dark:border-white/10 flex justify-between items-center text-xs">
                                            <span className="text-gray-500 font-mono">🛺 Plate: {tx.plateNumber || 'N/A'}</span>
                                            <span className="font-bold text-emerald-500">{tx.coopName || 'Mobilis Fleet'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 md:mt-0 mt-2 self-start md:self-center w-full md:w-auto">
                                    <button
                                        onClick={() => setSelectedReceipt(tx)}
                                        className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-xs transition-all shadow-lg"
                                    >
                                        <Receipt className="w-4 h-4" /> View Digital Receipt
                                    </button>
                                    <a
                                        href={`https://stellar.expert/explorer/${appNetwork.toLowerCase()}/tx/${tx.txHash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
                                    >
                                        StellarExplorer <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-12 text-center text-gray-500">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                        <p className="font-bold">No recorded transit activity available.</p>
                        <p className="text-xs text-gray-400 mt-1">Completed fare payments and contract advances will appear here.</p>
                    </div>
                )}
            </div>

            {/* DIGITAL RECEIPT MODAL */}
            {selectedReceipt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-md bg-[#0a0a14] border border-white/10 rounded-3xl p-6 shadow-2xl relative text-white">
                        
                        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-emerald-400" />
                                <h4 className="text-lg font-black">Official Digital Receipt</h4>
                            </div>
                            <button onClick={() => setSelectedReceipt(null)} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-white text-slate-900 rounded-3xl p-6 text-left shadow-2xl relative border-4 border-emerald-400 mb-6">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                <div>
                                    <h4 className="font-black text-lg tracking-tight text-slate-900">MOBILIS RECEIPT</h4>
                                    <p className="text-[10px] font-mono text-emerald-600 font-bold uppercase">Transport Fare Proof</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black">
                                    ✓
                                </div>
                            </div>

                            <div className="py-4 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">Serial No:</span>
                                    <span className="font-mono font-bold text-slate-900 truncate max-w-[160px]">
                                        OR-{selectedReceipt.txHash?.substring(0, 10).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">Date & Time:</span>
                                    <span className="font-mono text-slate-900">
                                        {new Date(selectedReceipt.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">Driver:</span>
                                    <span className="font-bold text-slate-900">{selectedReceipt.receiverName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">Vehicle / TODA:</span>
                                    <span className="font-mono text-slate-800">🛺 {selectedReceipt.plateNumber} ({selectedReceipt.coopName})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">Commuter Payer:</span>
                                    <span className="font-bold text-slate-900">{selectedReceipt.senderName}</span>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-baseline">
                                    <span className="text-xs font-bold text-slate-700">TOTAL FARE</span>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-emerald-600 block">
                                            ₱{selectedReceipt.amountPhp || (parseFloat(selectedReceipt.amount || 0) * 60.69).toFixed(2)} PHP
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-500 font-bold block">
                                            ({parseFloat(selectedReceipt.amount || 0).toFixed(4)} XLM)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-dashed border-slate-300 text-center">
                                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                                    VERIFIED ON STELLAR TESTNET BLOCKCHAIN
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleCopyHash(selectedReceipt.txHash)}
                                className="flex-1 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                            >
                                {copiedHash ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                {copiedHash ? 'Copied!' : 'Copy Hash'}
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="py-3.5 px-5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4" /> Print
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryTab;