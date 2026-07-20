import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { Keypair, Horizon, TransactionBuilder, Operation, Asset, Networks } from '@stellar/stellar-sdk';
import { X, AlertCircle, ArrowRight, ShieldCheck, ExternalLink, Receipt, Copy, Check, Printer } from 'lucide-react';
import type { DriverLocationDoc, UserData, FareTransaction } from '../../types';
import { trackPaymentSuccess, trackPaymentFailure } from '../../services/analytics';

interface FarePaymentModalProps {
    driver: DriverLocationDoc;
    commuterData: UserData;
    onClose: () => void;
    onSuccess?: () => void;
}

const HORIZON_SERVER = "https://horizon-testnet.stellar.org";
const PHP_EXCHANGE_RATE = 60.69; // 1 XLM = 60.69 PHP (Testnet rate)

export const FarePaymentModal: React.FC<FarePaymentModalProps> = ({ driver, commuterData, onClose, onSuccess }) => {
    const [step, setStep] = useState<'input' | 'review' | 'processing' | 'success' | 'error'>('input');
    const [farePhp, setFarePhp] = useState<string>('15'); // Default ₱15 PHP
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [completedTxHash, setCompletedTxHash] = useState<string | null>(null);
    const [completedTimestamp, setCompletedTimestamp] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [copiedHash, setCopiedHash] = useState<boolean>(false);

    const presetPhpAmounts = [
        { label: '₱15 (Tricycle)', value: '15' },
        { label: '₱30 (Regular)', value: '30' },
        { label: '₱50 (Extended)', value: '50' },
        { label: '₱100 (Express)', value: '100' },
    ];

    // Compute real-time XLM equivalent from PHP
    const fareXlm = (parseFloat(farePhp || '0') / PHP_EXCHANGE_RATE).toFixed(4);

    const handleExecutePayment = async () => {
        setIsSubmitting(true);
        setStep('processing');
        setErrorMessage(null);

        try {
            if (!commuterData.secret) {
                throw new Error("Commuter Stellar secret key not available for signing.");
            }
            if (!driver.publicKey) {
                throw new Error("Driver public key missing.");
            }

            const amountXlmNum = parseFloat(fareXlm);
            if (isNaN(amountXlmNum) || amountXlmNum <= 0) {
                throw new Error("Please enter a valid fare amount greater than ₱0.");
            }

            const server = new Horizon.Server(HORIZON_SERVER);

            // 1. Pre-flight Account Balance Check
            const commuterKeyPair = Keypair.fromSecret(commuterData.secret);
            const sourcePublicKey = commuterKeyPair.publicKey();

            const sourceAccount = await server.loadAccount(sourcePublicKey);
            const nativeBalanceObj = sourceAccount.balances.find((b) => b.asset_type === 'native');
            const availableXlm = parseFloat(nativeBalanceObj ? nativeBalanceObj.balance : '0');

            if (availableXlm < amountXlmNum + 0.001) {
                throw new Error(`Insufficient XLM balance. Available: ${availableXlm.toFixed(2)} XLM (${(availableXlm * PHP_EXCHANGE_RATE).toFixed(2)} PHP)`);
            }

            // 2. Build Standard Stellar Payment Transaction
            const tx = new TransactionBuilder(sourceAccount, {
                fee: '10000', // 0.001 XLM base fee
                networkPassphrase: Networks.TESTNET,
            })
                .addOperation(
                    Operation.payment({
                        destination: driver.publicKey,
                        asset: Asset.native(),
                        amount: fareXlm,
                    })
                )
                .setTimeout(30)
                .build();

            // 3. Sign with Commuter Secret
            tx.sign(commuterKeyPair);

            // 4. Submit Transaction to Horizon
            const txResult = await server.submitTransaction(tx);
            const hash = txResult.hash;
            const nowIso = new Date().toISOString();

            // 5. Store Metadata in Firestore
            const fareTxData: FareTransaction = {
                txHash: hash,
                driverId: driver.uid,
                driverName: driver.driverName,
                driverPublicKey: driver.publicKey,
                driverPlateNumber: driver.plateNumber,
                driverToda: driver.todaAffiliation,
                commuterId: commuterData.uid,
                commuterName: commuterData.fullName || 'Commuter',
                commuterPublicKey: sourcePublicKey,
                amount: fareXlm,
                amountPhp: parseFloat(farePhp).toFixed(2),
                timestamp: nowIso,
                status: 'completed',
                type: 'fare_payment',
            };

            await addDoc(collection(db, 'fare_transactions'), fareTxData);

            // Also record in generic transactions collection
            await addDoc(collection(db, 'transactions'), {
                txHash: hash,
                sender: sourcePublicKey,
                senderName: commuterData.fullName || 'Commuter',
                receiver: driver.publicKey,
                receiverName: driver.driverName,
                amount: fareXlm,
                amountPhp: parseFloat(farePhp).toFixed(2),
                asset: 'XLM',
                type: 'FARE_PAYMENT',
                timestamp: nowIso,
                network: 'TESTNET',
            });

            trackPaymentSuccess(fareXlm, driver.uid, commuterData.uid, hash);
            setCompletedTxHash(hash);
            setCompletedTimestamp(nowIso);
            setStep('success');
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Fare payment failed:', err);
            const msg = err instanceof Error ? err.message : 'Transaction failed. Please try again.';
            setErrorMessage(msg);
            trackPaymentFailure(msg, driver.uid);
            setStep('error');
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
            <div className="w-full max-w-md bg-[#0a0a14] border border-white/10 rounded-3xl p-6 shadow-2xl relative text-white my-auto">

                {/* Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-emerald-400" />
                        <div>
                            <h3 className="text-xl font-black tracking-tight">Automatic Transport Fare</h3>
                            <p className="text-xs text-gray-400">Real-Time PHP Equivalent Payment</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Driver Info Card */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Driver Recipient</p>
                        <h4 className="font-bold text-base text-white">{driver.driverName}</h4>
                        <p className="text-xs text-gray-400 font-mono">🛺 {driver.plateNumber} • {driver.todaAffiliation}</p>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold">
                        ON TRANSIT
                    </div>
                </div>

                {/* STEP 1: INPUT */}
                {step === 'input' && (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Enter Fare Amount in PHP (₱)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-400">₱</span>
                                <input
                                    type="number"
                                    step="1"
                                    value={farePhp}
                                    onChange={(e) => setFarePhp(e.target.value)}
                                    placeholder="15"
                                    className="w-full pl-10 pr-24 p-4 bg-black/50 border border-white/10 rounded-2xl text-2xl font-black text-emerald-400 outline-none focus:border-emerald-500"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-right">
                                    <span className="text-xs font-bold text-emerald-400 block font-mono">≈ {fareXlm} XLM</span>
                                    <span className="text-[9px] text-gray-400 uppercase font-mono block">Real-time Rate</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick PHP Presets */}
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Popular Fare Presets</p>
                            <div className="grid grid-cols-2 gap-2">
                                {presetPhpAmounts.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setFarePhp(preset.value)}
                                        className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                                            farePhp === preset.value
                                                ? 'bg-emerald-500 text-black border-emerald-400 shadow-md font-black'
                                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setStep('review')}
                            className="w-full py-4 bg-emerald-500 text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                        >
                            Review & Confirm Payment <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* STEP 2: REVIEW */}
                {step === 'review' && (
                    <div className="space-y-5">
                        <div className="p-4 bg-black/60 border border-white/10 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Driver Recipient</span>
                                <span className="font-bold text-white">{driver.driverName}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Plate Number</span>
                                <span className="font-mono text-gray-200">🛺 {driver.plateNumber}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">TODA Cooperative</span>
                                <span className="font-bold text-emerald-400">{driver.todaAffiliation}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm pt-2 border-t border-white/10">
                                <span className="text-gray-400">Fare in PHP</span>
                                <span className="font-black text-xl text-emerald-400">₱{parseFloat(farePhp || '0').toFixed(2)} PHP</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-400">
                                <span>Equivalent in XLM</span>
                                <span className="font-mono font-bold text-white">{fareXlm} XLM</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-gray-500 pt-2 border-t border-white/10">
                                <span>Network Fee</span>
                                <span className="font-mono">0.0001 XLM (Stellar Testnet)</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('input')}
                                className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all text-xs"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleExecutePayment}
                                disabled={isSubmitting}
                                className="flex-2 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)] disabled:opacity-50 text-xs"
                            >
                                <ShieldCheck className="w-5 h-5" /> Execute Payment
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: PROCESSING */}
                {step === 'processing' && (
                    <div className="py-12 text-center space-y-4">
                        <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                        <h4 className="text-lg font-black text-white">Broadcasting Real-Time Fare...</h4>
                        <p className="text-xs text-gray-400 max-w-xs mx-auto">
                            Executing on-chain Stellar payment and recording digital receipt in Firebase Firestore.
                        </p>
                    </div>
                )}

                {/* STEP 4: SUCCESS DIGITAL RECEIPT */}
                {step === 'success' && (
                    <div className="py-4 text-center space-y-5">
                        
                        {/* DIGITAL RECEIPT CARD */}
                        <div className="bg-white text-slate-900 rounded-3xl p-6 text-left shadow-2xl relative border-4 border-emerald-400">
                            
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
                                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                                >
                                    {copiedHash ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    {copiedHash ? 'Hash Copied!' : 'Copy TX Hash'}
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                                >
                                    <Printer className="w-4 h-4" /> Print
                                </button>
                            </div>

                            {completedTxHash && (
                                <a
                                    href={`https://stellar.expert/explorer/testnet/tx/${completedTxHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                                >
                                    Verify Blockchain Ledger <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] mt-2 text-sm"
                            >
                                Done & Close Receipt
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 5: ERROR */}
                {step === 'error' && (
                    <div className="py-6 text-center space-y-5">
                        <div className="w-16 h-16 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="w-10 h-10" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-white">Payment Unsuccessful</h4>
                            <p className="text-xs text-red-400 mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                {errorMessage}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('input')}
                                className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all text-xs"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 bg-red-500/20 text-red-400 font-bold rounded-2xl transition-all text-xs"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default FarePaymentModal;
