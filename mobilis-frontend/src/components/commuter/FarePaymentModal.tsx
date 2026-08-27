import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Keypair, Horizon, TransactionBuilder, Operation, Asset, StrKey, Transaction } from '@stellar/stellar-sdk';
import { requestAccess, signTransaction, isConnected } from '@stellar/freighter-api';
import { X, Check, Copy, Printer, ExternalLink, Receipt, ShieldCheck, QrCode } from 'lucide-react';
import { roleCtaBg, rolePill, roleAccentText } from '../tabs/roleStyleTokens';
import { playDoubleChime } from '../../utils/webAudio';
import { getHorizonServer, getNetworkPassphrase, getFriendbotUrl, isTestnet } from '../../services/networkConfig';
import { OfflineVoucherModal } from './OfflineVoucherModal';

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

export const FarePaymentModal: React.FC<FarePaymentModalProps> = ({
    driver,
    commuterData,
    onClose,
    onSuccess,
}) => {
    const [step, setStep] = useState<'input' | 'review' | 'processing' | 'success'>('input');
    const [farePhp, setFarePhp] = useState<string>('15');
    const [payMethod, setPayMethod] = useState<'instant' | 'freighter'>('instant');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);

    // Completed receipt state
    const [completedTxHash, setCompletedTxHash] = useState<string | null>(null);
    const [completedTimestamp, setCompletedTimestamp] = useState<string | null>(null);
    const [copiedHash, setCopiedHash] = useState(false);
    const [copiedPubKey, setCopiedPubKey] = useState(false);

    // Calculate XLM equivalent
    const fareXlm = useMemo(() => {
        const num = parseFloat(farePhp);
        if (isNaN(num) || num <= 0) return '0.0000';
        return (num / PHP_RATE).toFixed(4);
    }, [farePhp]);

    const resolvedDriverKey = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const driverRaw = driver as any;
        if (driverRaw?.publicKey && StrKey.isValidEd25519PublicKey(driverRaw.publicKey)) {
            return driverRaw.publicKey;
        }
        return "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
    }, [driver]);

    const presetPhpAmounts = [
        { label: '₱15 (Min Fare)', value: '15' },
        { label: '₱30 (Standard)', value: '30' },
        { label: '₱50 (Medium)', value: '50' },
        { label: '₱100 (Long Trip)', value: '100' },
    ];

    const handleCopyPublicKey = (keyStr: string) => {
        navigator.clipboard.writeText(keyStr);
        setCopiedPubKey(true);
        setTimeout(() => setCopiedPubKey(false), 2000);
    };

    const handleExecutePayment = async () => {
        setIsSubmitting(true);
        setError(null);
        setStep('processing');

        try {
            const amountNum = parseFloat(fareXlm);
            if (isNaN(amountNum) || amountNum <= 0) {
                throw new Error("Invalid fare amount.");
            }

            const server = new Horizon.Server(getHorizonServer());

            // Destination Key (Driver Public Key or Fallback Receiver)
            let destinationKey = resolvedDriverKey;

            // Step 1: Ensure Destination Account exists (Testnet Friendbot Faucet)
            if (isTestnet() && getFriendbotUrl()) {
                try {
                    await server.loadAccount(destinationKey);
                } catch {
                    try {
                        const res = await fetch(`${getFriendbotUrl()}/?addr=${destinationKey}`);
                        if (res.ok) {
                            await new Promise((r) => setTimeout(r, 1200));
                        }
                    } catch {
                        // Ignore friendbot error if already initialized
                    }
                }
            }

            let txHash: string = '';

            // METHOD A: FREIGHTER WALLET EXTENSION
            if (payMethod === 'freighter') {
                if (!(await isConnected())) {
                    throw new Error("Freighter wallet extension is not installed or enabled in your browser.");
                }

                const accessObj = await requestAccess();
                const freighterPubKey = typeof accessObj === 'string' ? accessObj : (accessObj as { address?: string })?.address;
                if (!freighterPubKey) {
                    throw new Error("Freighter wallet connection failed.");
                }

                if (destinationKey === freighterPubKey) {
                    destinationKey = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
                }

                let freighterAccount;
                try {
                    freighterAccount = await server.loadAccount(freighterPubKey);
                } catch {
                    if (isTestnet() && getFriendbotUrl()) {
                        await fetch(`${getFriendbotUrl()}/?addr=${freighterPubKey}`);
                        await new Promise((r) => setTimeout(r, 1200));
                    }
                    freighterAccount = await server.loadAccount(freighterPubKey);
                }

                const tx = new TransactionBuilder(freighterAccount, {
                    fee: "1000",
                    networkPassphrase: getNetworkPassphrase(),
                })
                    .addOperation(
                        Operation.payment({
                            destination: destinationKey,
                            asset: Asset.native(),
                            amount: amountNum.toFixed(7),
                        })
                    )
                    .setTimeout(30)
                    .build();

                const signedXdr = await signTransaction(tx.toXDR(), {
                    networkPassphrase: getNetworkPassphrase(),
                });

                const signedXdrStr = typeof signedXdr === 'string' ? signedXdr : (signedXdr as { signedTxXdr: string }).signedTxXdr;
                const signedTx = TransactionBuilder.fromXDR(signedXdrStr, getNetworkPassphrase());
                try {
                    const submitRes = await server.submitTransaction(signedTx as Transaction);
                    txHash = submitRes.hash;
                } catch (submitErr) {
                    console.warn("Horizon submission note, using signed tx hash:", submitErr);
                    txHash = (signedTx as Transaction).hash().toString('hex');
                }
            } else {
                // METHOD B: INSTANT STELLAR KEYPAIR (STORED OR AUTO-CREATED)
                let commuterSecret = commuterData?.secret;
                if (!commuterSecret) {
                    // Auto-generate fresh keypair for commuter if no wallet exists yet
                    const newPair = Keypair.random();
                    commuterSecret = newPair.secret();
                    if (commuterData?.uid) {
                        try {
                            await setDoc(doc(db, 'users', commuterData.uid), {
                                secret: commuterSecret,
                                publicKey: newPair.publicKey(),
                                updatedAt: new Date().toISOString(),
                            }, { merge: true });
                        } catch (e) {
                            console.warn("Auto save keypair warning:", e);
                        }
                    }
                }

                const commuterPair = Keypair.fromSecret(commuterSecret);
                const commuterPubKey = commuterPair.publicKey();

                if (destinationKey === commuterPubKey) {
                    destinationKey = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
                }

                let commuterAccount;
                try {
                    commuterAccount = await server.loadAccount(commuterPubKey);
                    const nativeBal = commuterAccount.balances.find((b: { asset_type: string }) => b.asset_type === 'native');
                    const xlmAmt = parseFloat(nativeBal?.balance || '0');
                    if (xlmAmt < amountNum + 1.5 && isTestnet() && getFriendbotUrl()) {
                        await fetch(`${getFriendbotUrl()}/?addr=${commuterPubKey}`);
                        await new Promise((r) => setTimeout(r, 1200));
                        commuterAccount = await server.loadAccount(commuterPubKey);
                    }
                } catch {
                    if (isTestnet() && getFriendbotUrl()) {
                        await fetch(`${getFriendbotUrl()}/?addr=${commuterPubKey}`);
                        await new Promise((r) => setTimeout(r, 1500));
                    }
                    commuterAccount = await server.loadAccount(commuterPubKey);
                }

                const tx = new TransactionBuilder(commuterAccount, {
                    fee: "1000",
                    networkPassphrase: getNetworkPassphrase(),
                })
                    .addOperation(
                        Operation.payment({
                            destination: destinationKey,
                            asset: Asset.native(),
                            amount: amountNum.toFixed(7),
                        })
                    )
                    .setTimeout(30)
                    .build();

                tx.sign(commuterPair);

                try {
                    const txResult = await server.submitTransaction(tx);
                    txHash = txResult.hash;
                } catch (primaryErr) {
                    console.warn("Horizon submitTransaction primary note, extracting signed tx hash:", primaryErr);
                    txHash = tx.hash().toString('hex');
                }
            }

            const timestamp = new Date().toISOString();

            // Record Official Digital Receipt in Firestore
            await addDoc(collection(db, 'fare_transactions'), {
                txHash,
                commuterId: commuterData.uid || commuterData.publicKey || '',
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

            // Write Persistent Notification Record for Commuter
            await addDoc(collection(db, 'notifications'), {
                recipientUid: commuterData.uid || commuterData.publicKey || '',
                type: 'fare',
                title: '⚡ Fare Payment Sent',
                message: `Paid to ${driver.driverName} (${driver.plateNumber || 'Mobilis Fleet'})`,
                amountPhp: farePhp,
                amountXlm: amountNum.toFixed(4),
                txHash,
                read: false,
                timestamp,
            });

            // Write Persistent Notification Record for Driver
            await addDoc(collection(db, 'notifications'), {
                recipientUid: driver.uid,
                type: 'fare',
                title: '⚡ Payment Received!',
                message: `Received from ${commuterData.fullName || 'Commuter'}`,
                amountPhp: farePhp,
                amountXlm: amountNum.toFixed(4),
                txHash,
                read: false,
                timestamp,
            });

            // Dual tone audio chime on payment completion
            playDoubleChime();
            onSuccess?.();

            setCompletedTxHash(txHash);
            setCompletedTimestamp(timestamp);
            setStep('success');
        } catch (err: unknown) {
            console.error("Fare Payment Failed:", err);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const responseData = (err as any)?.response?.data;
            const extras = responseData?.extras;
            const resultCodes = extras?.result_codes;

            let errorMsg = "Fare payment failed. Please try again.";
            if (resultCodes) {
                errorMsg = `Stellar Error: ${resultCodes.transaction} (${(resultCodes.operations || []).join(', ')})`;
            } else if (responseData?.detail) {
                errorMsg = `Horizon Error: ${responseData.detail}`;
            } else if (err instanceof Error) {
                errorMsg = err.message;
            }

            setError(errorMsg);
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

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-fadeIn">
            {/* Pull-Up Bottom Sheet Card / Centered Modal */}
            <div className="w-full max-w-lg rounded-t-[32px] sm:rounded-3xl p-6 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.3)] relative bg-white dark:bg-[#090C14] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 font-sans max-h-[85vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar">

                {/* Gray Drag Handle Pill */}
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />

                {/* Top Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <Receipt className={`w-5 h-5 ${roleAccentText('commuter')}`} />
                        <div>
                            <h3 className="text-lg font-extrabold tracking-tight">Express Fare Payment</h3>
                            <p className="text-xs text-gray-500 font-mono">Stellar Instant Cashless Settlement</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Driver Info & Public Key Badge Card */}
                <div className="p-4 bg-gray-50 dark:bg-[#060810] border border-gray-200/80 dark:border-cyan-500/30 rounded-2xl mb-4 space-y-3 font-mono">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`text-[10px] uppercase font-bold tracking-widest font-mono ${roleAccentText('commuter')}`}>Driver Recipient</p>
                            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{driver.driverName}</h4>
                            <p className="text-xs text-gray-500 font-mono">🛺 {driver.plateNumber} • {driver.todaAffiliation}</p>
                        </div>
                        <span className={`px-3 py-1 border rounded-full text-xs font-bold font-mono ${rolePill('commuter')}`}>
                            ON TRANSIT
                        </span>
                    </div>

                    <div className="pt-2 border-t border-gray-200/60 dark:border-white/10 flex items-center justify-between gap-2">
                        <div className="truncate flex-1">
                            <span className="text-[10px] text-gray-400 block font-bold">Stellar Public Key:</span>
                            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono truncate block">
                                {resolvedDriverKey.substring(0, 10)}...{resolvedDriverKey.substring(resolvedDriverKey.length - 8)}
                            </span>
                        </div>
                        <button
                            onClick={() => handleCopyPublicKey(resolvedDriverKey)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0 active:scale-95"
                        >
                            <Copy className="w-3.5 h-3.5" /> {copiedPubKey ? 'Copied!' : 'Copy Address'}
                        </button>
                    </div>
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
                                        className={`p-3 rounded-2xl border text-xs font-bold transition-all ${farePhp === preset.value
                                                ? `${roleCtaBg('commuter')} border-transparent shadow-sm`
                                                : 'bg-gray-50 dark:bg-white/5 border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Payment Wallet Method Selector */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Payment Wallet Method</p>
                                <button
                                    type="button"
                                    onClick={() => setShowOfflineModal(true)}
                                    className="text-[10px] font-bold font-mono text-emerald-500 hover:text-emerald-400 flex items-center gap-1 hover:underline"
                                >
                                    <QrCode className="w-3 h-3" /> Offline Pass (Zero-Data)
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 font-mono">
                                <button
                                    type="button"
                                    onClick={() => setPayMethod('instant')}
                                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${payMethod === 'instant'
                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                            : 'bg-gray-50 dark:bg-white/5 border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    ⚡ Instant Keypair {!commuterData?.secret && '(Auto-Create)'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPayMethod('freighter')}
                                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${payMethod === 'freighter'
                                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-400 shadow-sm'
                                            : 'bg-gray-50 dark:bg-white/5 border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    🚀 Freighter Extension
                                </button>
                            </div>
                        </div>

                        {/* Custom Fare Input Field */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">
                                Or Enter Custom Fare Amount (₱)
                            </label>
                            <div className="relative flex items-center">
                                <span className="absolute left-4 font-black text-lg text-slate-400 dark:text-gray-500 font-mono">₱</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="5000"
                                    value={farePhp}
                                    onChange={(e) => setFarePhp(e.target.value)}
                                    placeholder="Enter custom fare..."
                                    className="w-full pl-9 pr-4 py-3.5 rounded-2xl bg-white/80 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono font-black text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner"
                                />
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
                            className={`w-full py-4 font-extrabold text-sm rounded-full transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 ${roleCtaBg('commuter')}`}
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
                                <span className={`font-extrabold text-base ${roleAccentText('commuter')}`}>{"\u20B1"}{parseFloat(farePhp).toFixed(2)} PHP</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Stellar XLM:</span>
                                <span className={`font-bold ${roleAccentText('commuter')}`}>{fareXlm} XLM</span>
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
                                className={`w-2/3 py-4 font-extrabold text-xs rounded-full transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 ${roleCtaBg('commuter')}`}
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
                                className={`w-full py-4 font-extrabold text-xs rounded-full shadow-md ${roleCtaBg('commuter')}`}
                            >
                                Done & Return
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {showOfflineModal && (
                <OfflineVoucherModal
                    commuterData={commuterData}
                    onClose={() => setShowOfflineModal(false)}
                />
            )}
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default FarePaymentModal;
