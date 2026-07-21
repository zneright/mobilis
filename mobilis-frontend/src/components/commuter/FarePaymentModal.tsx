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
        { label: '₱15 (Min Fare)', value: '15' },
        { label: '₱30 (Standard)', value: '30' },
        { label: '₱50 (Medium)', value: '50' },
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
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
            {/* Pull-Up Bottom Sheet Card */}
            <div className="w-full max-w-lg mx-auto bg-white dark:bg-[#07090E] rounded-t-[40px] p-6 shadow-[0_-20px_60px_rgba(0,0,0,0.15)] relative border-t border-gray-100 dark:border-white/10 text-gray-900 dark:text-white font-sans max-h-[90vh] overflow-y-auto">
                
                {/* Gray Drag Handle Pill */}
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />

                {/* Top Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-emerald-500" />
                        <div>
                            <h3 className="text-lg font-extrabold tracking-tight">Express Fare Payment</h3>
                            <p className="text-xs text-gray-500 font-mono">Stellar Instant Cashless Settlement</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Driver Info Card */}
                <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 font-mono">Driver Recipient</p>
                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{driver.driverName}</h4>
                        <p className="text-xs text-gray-500 font-mono">🛺 {driver.plateNumber} • {driver.todaAffiliation}</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-xs font-bold font-mono">
                        ON TRANSIT
                    </span>
                </div>

                {/* STEP 1: INPUT */}
                {step === 'input' && (
                    <div className="space-y-4">
                        <div className="text-center py-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Total Fare Receipt</span>
                            <div className="text-4xl font-black text-gray-900 dark:text-white">
                                ₱{farePhp}.00 <span className="text-xs font-mono font-normal text-emerald-500 block mt-1">({fareXlm} XLM)</span>
                            </div>
                        </div>

                        {/* Quick PHP Presets */}
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 font-mono">Select Fare Preset</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {presetPhpAmounts.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setFarePhp(preset.value)}
                                        className={`p-3 rounded-2xl border text-xs font-bold transition-all ${
                                            farePhp === preset.value
                                                ? 'bg-gray-900 text-white dark:bg-emerald-500 dark:text-black border-transparent shadow-sm'
                                                : 'bg-gray-50 dark:bg-white/5 border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-xs text-center font-bold">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={() => setStep('review')}
                            disabled={!farePhp || parseFloat(farePhp) <= 0}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm rounded-full transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
                        >
                            Confirm Stellar Payment
                        </button>
                    </div>
                )}

                {/* STEP 2: REVIEW */}
                {step === 'review' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl space-y-2.5 text-xs font-mono">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200/50 dark:border-white/10">
                                <span className="text-gray-500">Driver Recipient:</span>
                                <span className="font-bold text-gray-900 dark:text-white">{driver.driverName}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200/50 dark:border-white/10">
                                <span className="text-gray-500">Plate / TODA:</span>
                                <span className="font-bold text-gray-900 dark:text-white">🛺 {driver.plateNumber}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200/50 dark:border-white/10">
                                <span className="text-gray-500">Fare Amount:</span>
                                <span className="font-extrabold text-emerald-500 text-base">₱{parseFloat(farePhp).toFixed(2)} PHP</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Stellar XLM:</span>
                                <span className="font-bold text-cyan-500">{fareXlm} XLM</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setStep('input')}
                                className="w-1/3 py-4 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-gray-900 dark:text-white font-bold rounded-full text-xs"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleExecutePayment}
                                disabled={isSubmitting}
                                className="w-2/3 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
                            >
                                <ShieldCheck className="w-4 h-4" /> Confirm & Pay ₱{farePhp}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: PROCESSING */}
                {step === 'processing' && (
                    <div className="py-10 text-center space-y-4">
                        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <h4 className="text-base font-extrabold text-gray-900 dark:text-white">Broadcasting Stellar Payment...</h4>
                        <p className="text-xs text-gray-500 max-w-xs mx-auto font-mono">
                            Executing on-chain transaction and generating receipt.
                        </p>
                    </div>
                )}

                {/* STEP 4: SUCCESS DIGITAL RECEIPT */}
                {step === 'success' && (
                    <div className="py-2 text-center space-y-4">
                        <div className="bg-white text-gray-900 rounded-3xl p-5 text-left shadow-lg border border-emerald-500">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <div>
                                    <h4 className="font-extrabold text-base text-gray-900">MOBILIS RECEIPT</h4>
                                    <p className="text-[10px] font-mono text-emerald-600 font-bold uppercase">Official Transit Fare</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold">
                                    ✓
                                </div>
                            </div>

                            <div className="py-3 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Receipt No:</span>
                                    <span className="font-mono font-bold text-gray-900 truncate max-w-[150px]">
                                        OR-{completedTxHash?.substring(0, 10).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Date & Time:</span>
                                    <span className="font-mono text-gray-800">
                                        {completedTimestamp ? new Date(completedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Driver:</span>
                                    <span className="font-bold text-gray-900">{driver.driverName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Vehicle / TODA:</span>
                                    <span className="font-mono text-gray-800">🛺 {driver.plateNumber} ({driver.todaAffiliation})</span>
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-baseline">
                                    <span className="text-xs font-bold text-gray-700">TOTAL PAID</span>
                                    <div className="text-right">
                                        <span className="text-xl font-extrabold text-emerald-600">₱{parseFloat(farePhp).toFixed(2)} PHP</span>
                                        <span className="text-[10px] font-mono text-gray-500 block">({fareXlm} XLM)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RECEIPT ACTIONS */}
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyTxHash}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold rounded-full text-xs flex items-center justify-center gap-2"
                                >
                                    {copiedHash ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    {copiedHash ? 'Hash Copied!' : 'Copy TX Hash'}
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="py-3 px-4 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold rounded-full text-xs flex items-center justify-center gap-1.5"
                                >
                                    <Printer className="w-4 h-4" /> Print
                                </button>
                            </div>

                            {completedTxHash && (
                                <a
                                    href={`https://stellar.expert/explorer/testnet/tx/${completedTxHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-3 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold rounded-full text-xs flex items-center justify-center gap-2"
                                >
                                    Verify Ledger <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-emerald-500 text-black font-extrabold text-xs rounded-full shadow-md"
                            >
                                Done & Return
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FarePaymentModal;
