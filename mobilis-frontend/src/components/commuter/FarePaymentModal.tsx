import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { Keypair, Horizon, TransactionBuilder, Operation, Asset, Networks } from '@stellar/stellar-sdk';
import { X, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';
import type { DriverLocationDoc, UserData, FareTransaction } from '../../types';
import { trackPaymentSuccess, trackPaymentFailure } from '../../services/analytics';

interface FarePaymentModalProps {
    driver: DriverLocationDoc;
    commuterData: UserData;
    onClose: () => void;
    onSuccess?: () => void;
}

const HORIZON_SERVER = "https://horizon-testnet.stellar.org";
const PHP_EXCHANGE_RATE = 60.69;

export const FarePaymentModal: React.FC<FarePaymentModalProps> = ({ driver, commuterData, onClose, onSuccess }) => {
    const [step, setStep] = useState<'input' | 'review' | 'processing' | 'success' | 'error'>('input');
    const [fareXlm, setFareXlm] = useState<string>('0.5'); // Default 0.5 XLM (~30 PHP)
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [completedTxHash, setCompletedTxHash] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const presetAmounts = [
        { label: '₱15 (0.25 XLM)', value: '0.25' },
        { label: '₱30 (0.50 XLM)', value: '0.50' },
        { label: '₱50 (0.82 XLM)', value: '0.82' },
        { label: '₱100 (1.65 XLM)', value: '1.65' },
    ];

    const farePhp = (parseFloat(fareXlm || '0') * PHP_EXCHANGE_RATE).toFixed(2);

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

            const amount = parseFloat(fareXlm);
            if (isNaN(amount) || amount <= 0) {
                throw new Error("Please enter a valid fare amount greater than 0.");
            }

            const server = new Horizon.Server(HORIZON_SERVER);

            // 1. Pre-flight Account Balance Check
            const commuterKeyPair = Keypair.fromSecret(commuterData.secret);
            const sourcePublicKey = commuterKeyPair.publicKey();

            const sourceAccount = await server.loadAccount(sourcePublicKey);
            const nativeBalanceObj = sourceAccount.balances.find((b) => b.asset_type === 'native');
            const availableXlm = parseFloat(nativeBalanceObj ? nativeBalanceObj.balance : '0');

            if (availableXlm < amount + 0.001) {
                throw new Error(`Insufficient XLM balance. Available: ${availableXlm.toFixed(2)} XLM`);
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
                        amount: fareXlm.toString(),
                    })
                )
                .setTimeout(30)
                .build();

            // 3. Sign with Commuter Secret
            tx.sign(commuterKeyPair);

            // 4. Submit Transaction to Horizon
            const txResult = await server.submitTransaction(tx);
            const hash = txResult.hash;

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
                amountPhp: farePhp,
                timestamp: new Date().toISOString(),
                status: 'completed',
                type: 'fare_payment',
            };

            await addDoc(collection(db, 'fare_transactions'), fareTxData);

            // Also record in generic transactions collection for compatibility
            await addDoc(collection(db, 'transactions'), {
                txHash: hash,
                sender: sourcePublicKey,
                senderName: commuterData.fullName || 'Commuter',
                receiver: driver.publicKey,
                receiverName: driver.driverName,
                amount: fareXlm,
                asset: 'XLM',
                type: 'FARE_PAYMENT',
                timestamp: new Date().toISOString(),
                network: 'TESTNET',
            });

            trackPaymentSuccess(fareXlm, driver.uid, commuterData.uid, hash);
            setCompletedTxHash(hash);
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#0a0a14] border border-white/10 rounded-3xl p-6 shadow-2xl relative text-white">

                {/* Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                    <div>
                        <h3 className="text-xl font-black tracking-tight">Pay Transport Fare</h3>
                        <p className="text-xs text-gray-400">Direct Stellar Micro-Credit Payment</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Driver Info Card */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Selected Driver</p>
                        <h4 className="font-bold text-base text-white">{driver.driverName}</h4>
                        <p className="text-xs text-gray-400 font-mono">{driver.plateNumber} • {driver.todaAffiliation}</p>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold">
                        On Duty
                    </div>
                </div>

                {/* STEP 1: INPUT */}
                {step === 'input' && (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Fare Amount (XLM)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={fareXlm}
                                    onChange={(e) => setFareXlm(e.target.value)}
                                    placeholder="0.5"
                                    className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-2xl font-black text-emerald-400 outline-none focus:border-emerald-500"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-right">
                                    <span className="text-xs font-bold text-gray-400 block">≈ ₱{farePhp} PHP</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Quick Presets</p>
                            <div className="grid grid-cols-2 gap-2">
                                {presetAmounts.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setFareXlm(preset.value)}
                                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                                            fareXlm === preset.value
                                                ? 'bg-emerald-500 text-black border-emerald-400 shadow-md'
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
                            className="w-full py-4 bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all"
                        >
                            Review Payment <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* STEP 2: REVIEW */}
                {step === 'review' && (
                    <div className="space-y-5">
                        <div className="p-4 bg-black/50 border border-white/10 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Driver</span>
                                <span className="font-bold">{driver.driverName}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Plate Number</span>
                                <span className="font-mono">{driver.plateNumber}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Fare in XLM</span>
                                <span className="font-bold text-emerald-400">{fareXlm} XLM</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Fare in PHP</span>
                                <span className="font-bold text-gray-200">₱{farePhp} PHP</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-white/10">
                                <span>Network Fee</span>
                                <span className="font-mono">0.0001 XLM (Stellar Testnet)</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('input')}
                                className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleExecutePayment}
                                disabled={isSubmitting}
                                className="flex-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)] disabled:opacity-50"
                            >
                                <ShieldCheck className="w-5 h-5" /> Confirm & Pay
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: PROCESSING */}
                {step === 'processing' && (
                    <div className="py-12 text-center space-y-4">
                        <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                        <h4 className="text-lg font-black text-white">Submitting to Stellar Network...</h4>
                        <p className="text-xs text-gray-400 max-w-xs mx-auto">
                            Signing transaction with commuter keypair & broadcasting on Stellar Testnet ledger.
                        </p>
                    </div>
                )}

                {/* STEP 4: SUCCESS */}
                {step === 'success' && (
                    <div className="py-8 text-center space-y-5">
                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(52,211,153,0.4)]">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-white">Payment Confirmed!</h4>
                            <p className="text-sm text-emerald-400 font-bold mt-1">
                                {fareXlm} XLM (₱{farePhp} PHP) sent to {driver.driverName}
                            </p>
                        </div>

                        {completedTxHash && (
                            <a
                                href={`https://stellar.expert/explorer/testnet/tx/${completedTxHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:underline bg-white/5 px-4 py-2.5 rounded-xl border border-white/10"
                            >
                                Verify on StellarExpert <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-gray-200 transition-all mt-4"
                        >
                            Done
                        </button>
                    </div>
                )}

                {/* STEP 5: ERROR */}
                {step === 'error' && (
                    <div className="py-6 text-center space-y-5">
                        <div className="w-16 h-16 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="w-10 h-10" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-white">Payment Failed</h4>
                            <p className="text-xs text-red-400 mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                {errorMessage}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('input')}
                                className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 bg-red-500/20 text-red-400 font-bold rounded-2xl transition-all"
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
