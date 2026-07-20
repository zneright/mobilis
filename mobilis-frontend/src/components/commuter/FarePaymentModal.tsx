import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Keypair, Horizon, TransactionBuilder, Operation, Asset } from '@stellar/stellar-sdk';
import { X, Check, Copy, Printer, ExternalLink, Receipt, ShieldCheck } from 'lucide-react';
import { playDoubleChime } from '../../utils/webAudio';

interface DriverLocation {
    uid: string;
    driverName: string;
    plateNumber: string;
    todaAffiliation: string;
    active: boolean;
    lat?: number;
    lng?: number;
}

interface FarePaymentModalProps {
    driver: DriverLocation;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commuterData: any;
    onClose: () => void;
    onSuccess?: () => void;
}

const PHP_RATE = 60.69; // 1 XLM ≈ 60.69 PHP
const HORIZON_SERVER = "https://horizon-testnet.stellar.org";

export const FarePaymentModal: React.FC<FarePaymentModalProps> = ({
    driver,
    commuterData,
    onClose,
    onSuccess,
}) => {
    const [step, setStep] = useState<'input' | 'review' | 'processing' | 'success'>('input');
    const [farePhp, setFarePhp] = useState<string>('15');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Completed receipt state
    const [completedTxHash, setCompletedTxHash] = useState<string | null>(null);
    const [completedTimestamp, setCompletedTimestamp] = useState<string | null>(null);
    const [copiedHash, setCopiedHash] = useState(false);

    // Calculate XLM equivalent
    const fareXlm = (parseFloat(farePhp || '0') / PHP_RATE).toFixed(4);

    const presetPhpAmounts = [
        { label: '₱15 (Minimum Fare)', value: '15' },
        { label: '₱30 (Standard Fare)', value: '30' },
        { label: '₱50 (Medium Trip)', value: '50' },
        { label: '₱100 (Long Trip)', value: '100' },
    ];

    const handleExecutePayment = async () => {
        setIsSubmitting(true);
        setError(null);
        setStep('processing');

        try {
            const amountNum = parseFloat(fareXlm);
            if (isNaN(amountNum) || amountNum <= 0) {
                throw new Error("Invalid fare amount.");
            }

            const server = new Horizon.Server(HORIZON_SERVER);

            // Fetch Commuter Keypair
            const commuterSecret = commuterData?.secret;
            if (!commuterSecret) {
                throw new Error("Commuter wallet credentials not found.");
            }
            const commuterPair = Keypair.fromSecret(commuterSecret);

            // Fetch Driver Public Key from Firestore driver doc or fallback
            const driverPubKey = driver.uid;
            if (!driverPubKey) {
                throw new Error("Driver account address not found.");
            }

            // Load Commuter Stellar Account
            const commuterAccount = await server.loadAccount(commuterPair.publicKey());

            // Build Payment Transaction
            const tx = new TransactionBuilder(commuterAccount, {
                fee: "100",
                networkPassphrase: "Test Stellar Network ; September 2015",
            })
                .addOperation(
                    Operation.payment({
                        destination: driverPubKey,
                        asset: Asset.native(),
                        amount: amountNum.toFixed(7),
                    })
                )
                .setTimeout(30)
                .build();

            tx.sign(commuterPair);
            const txResult = await server.submitTransaction(tx);
            const txHash = txResult.hash;
            const timestamp = new Date().toISOString();

            // Record Official Digital Receipt in Firestore
            await addDoc(collection(db, 'fare_transactions'), {
                txHash,
                commuterId: commuterData.uid || commuterPair.publicKey(),
                commuterName: commuterData.fullName || 'Commuter',
                driverId: driver.uid,
                driverName: driver.driverName,
                plateNumber: driver.plateNumber,
                coopName: driver.todaAffiliation,
                amount: amountNum.toFixed(4),
                amountPhp: farePhp,
                timestamp,
                status: 'completed',
                type: 'fare_payment',
            });

            // Dual tone audio chime on payment completion
            playDoubleChime();
            onSuccess?.();

            setCompletedTxHash(txHash);
            setCompletedTimestamp(timestamp);
            setStep('success');
        } catch (err: unknown) {
            console.error("Fare Payment Failed:", err);
            const msg = err instanceof Error ? err.message : "Fare payment failed. Please check your Stellar balance.";
            setError(msg);
            setStep('input');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyTxHash = () => {
        if (completedTxHash) {
            navigator.clipboard.writeText(completedTxHash);
            setCopiedHash(true);
            setTimeout(() => setCopiedHash(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-md bg-white dark:bg-[#0a0a14] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative text-slate-900 dark:text-white my-auto transition-colors duration-300">

                {/* Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Automatic Transport Fare</h3>
                            <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">Real-Time PHP Equivalent Payment</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Driver Info Card */}
                <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">Driver Recipient</p>
                        <h4 className="font-bold text-base text-slate-900 dark:text-white">{driver.driverName}</h4>
                        <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">🛺 {driver.plateNumber} • {driver.todaAffiliation}</p>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold">
                        ON TRANSIT
                    </div>
                </div>

                {/* STEP 1: INPUT */}
                {step === 'input' && (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                Enter Fare Amount in PHP (₱)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-600 dark:text-emerald-400">₱</span>
                                <input
                                    type="number"
                                    step="1"
                                    value={farePhp}
                                    onChange={(e) => setFarePhp(e.target.value)}
                                    placeholder="15"
                                    className="w-full pl-10 pr-24 p-4 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-2xl text-2xl font-black text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-right">
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block font-mono">≈ {fareXlm} XLM</span>
                                    <span className="text-[9px] text-slate-400 dark:text-gray-400 uppercase font-mono block">Real-time Rate</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick PHP Presets */}
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-2">Popular Fare Presets</p>
                            <div className="grid grid-cols-2 gap-2">
                                {presetPhpAmounts.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setFarePhp(preset.value)}
                                        className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                                            farePhp === preset.value
                                                ? 'bg-emerald-500 text-black border-emerald-400 shadow-md font-black'
                                                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs text-center font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={() => setStep('review')}
                            disabled={!farePhp || parseFloat(farePhp) <= 0}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black text-sm rounded-2xl transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)] flex items-center justify-center gap-2"
                        >
                            Review Payment Details
                        </button>
                    </div>
                )}

                {/* STEP 2: REVIEW */}
                {step === 'review' && (
                    <div className="space-y-5">
                        <div className="p-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl space-y-3 font-mono text-xs">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
                                <span className="text-slate-500 dark:text-gray-400">Recipient Driver:</span>
                                <span className="font-bold text-slate-900 dark:text-white">{driver.driverName}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
                                <span className="text-slate-500 dark:text-gray-400">TODA / Plate:</span>
                                <span className="font-bold text-slate-900 dark:text-white">🛺 {driver.plateNumber}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
                                <span className="text-slate-500 dark:text-gray-400">Amount (PHP):</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₱{parseFloat(farePhp).toFixed(2)} PHP</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-gray-400">XLM Equivalent:</span>
                                <span className="font-bold text-cyan-600 dark:text-cyan-400">{fareXlm} XLM</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('input')}
                                className="w-1/3 py-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold rounded-2xl text-xs border border-slate-200 dark:border-white/10"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleExecutePayment}
                                disabled={isSubmitting}
                                className="w-2/3 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-2xl transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)] flex items-center justify-center gap-2"
                            >
                                <ShieldCheck className="w-4 h-4" /> Confirm & Pay ₱{farePhp}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: PROCESSING */}
                {step === 'processing' && (
                    <div className="py-12 text-center space-y-4">
                        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <h4 className="text-lg font-black text-slate-900 dark:text-white">Broadcasting Real-Time Fare...</h4>
                        <p className="text-xs text-slate-500 dark:text-gray-400 max-w-xs mx-auto">
                            Executing on-chain Stellar payment and recording digital receipt in Firebase Firestore.
                        </p>
                    </div>
                )}

                {/* STEP 4: SUCCESS DIGITAL RECEIPT */}
                {step === 'success' && (
                    <div className="py-4 text-center space-y-5">
                        
                        {/* DIGITAL RECEIPT CARD */}
                        <div className="bg-white text-slate-900 rounded-3xl p-6 text-left shadow-2xl relative border-4 border-emerald-500">
                            
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                <div>
                                    <h4 className="font-black text-lg tracking-tight text-slate-900">MOBILIS RECEIPT</h4>
                                    <p className="text-[10px] font-mono text-emerald-600 font-bold uppercase">Official Transit Fare Receipt</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black">
                                    ✓
                                </div>
                            </div>

                            <div className="py-4 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">Receipt No:</span>
                                    <span className="font-mono font-bold text-slate-900 truncate max-w-[160px]">
                                        OR-{completedTxHash?.substring(0, 10).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">Date & Time:</span>
                                    <span className="font-mono text-slate-900">
                                        {completedTimestamp ? new Date(completedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">Driver:</span>
                                    <span className="font-bold text-slate-900">{driver.driverName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">Vehicle / TODA:</span>
                                    <span className="font-mono text-slate-800">🛺 {driver.plateNumber} ({driver.todaAffiliation})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-medium">Commuter:</span>
                                    <span className="font-bold text-slate-900">{commuterData.fullName || 'Commuter'}</span>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-baseline">
                                    <span className="text-xs font-bold text-slate-700">TOTAL PAID</span>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-emerald-600 block">₱{parseFloat(farePhp).toFixed(2)} PHP</span>
                                        <span className="text-[10px] font-mono text-slate-500 font-bold block">({fareXlm} XLM)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-dashed border-slate-300 text-center">
                                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                                    VERIFIED ON STELLAR BLOCKCHAIN LEDGER
                                </span>
                            </div>
                        </div>

                        {/* RECEIPT ACTIONS */}
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyTxHash}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-white/10 transition-all"
                                >
                                    {copiedHash ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    {copiedHash ? 'Hash Copied!' : 'Copy TX Hash'}
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="py-3 px-4 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 dark:border-white/10 transition-all"
                                >
                                    <Printer className="w-4 h-4" /> Print
                                </button>
                            </div>

                            {completedTxHash && (
                                <a
                                    href={`https://stellar.expert/explorer/testnet/tx/${completedTxHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                                >
                                    Verify Blockchain Ledger <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-2xl transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                            >
                                Done & Return to Radar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FarePaymentModal;
