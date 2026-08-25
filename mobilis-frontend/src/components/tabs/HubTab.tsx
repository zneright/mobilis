import React, { useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Fuel, Building2, UserCheck, ArrowUpRight, ShieldCheck, CheckCircle2, Megaphone, Send, BellRing, X, Truck, Award, Sparkles, QrCode, TrendingUp } from 'lucide-react';
import { roleCtaBg, roleCardBorder } from './roleStyleTokens';
import { getDriverReputation, DriverReputationData } from '../../services/stellarContract';
import { OfflineDriverScanner } from '../driver/OfflineDriverScanner';

interface HubTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stellarData: any;
    isAdmin: boolean;
    currencyMode: 'XLM' | 'PHP';
    setCurrencyMode: React.Dispatch<React.SetStateAction<'XLM' | 'PHP'>>;
    formatCurrency: (amountXlm: number | string) => string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debtState: any;
    isProcessing: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleRequestAdvance: (amount?: any) => void;
    handleInjectLiquidity: () => void;
    handleSettleLoan: () => void;
    appNetwork: string;
    treasuryBalance: string;
    borrowLimit: number;
    handleSetBorrowLimit: (limit: number) => void;
}

export const HubTab: React.FC<HubTabProps> = ({
    stellarData,
    isAdmin,
    formatCurrency,
    debtState,
    isProcessing,
    handleRequestAdvance,
    handleSettleLoan,
    borrowLimit,
}) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
    const [loadingDrivers, setLoadingDrivers] = useState<boolean>(false);
    const [approvingUid, setApprovingUid] = useState<string | null>(null);

    // Vehicle Change Requests State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [vehicleChangeRequests, setVehicleChangeRequests] = useState<any[]>([]);
    const [approvingVehicleUid, setApprovingVehicleUid] = useState<string | null>(null);

    // Broadcast Notification Form State
    const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
    const [broadcastTitle, setBroadcastTitle] = useState<string>('');
    const [broadcastMessage, setBroadcastMessage] = useState<string>('');
    const [targetAudience, setTargetAudience] = useState<string>('coop_drivers');
    const [sendingBroadcast, setSendingBroadcast] = useState<boolean>(false);
    const [broadcastSuccess, setBroadcastSuccess] = useState<boolean>(false);
    // Custom Credit Advance State
    const [showAdvanceModal, setShowAdvanceModal] = useState<boolean>(false);
    const [customAdvanceInput, setCustomAdvanceInput] = useState<string>('15');
    const [advanceError, setAdvanceError] = useState<string>('');

    // Driver On-Chain Reputation & Offline Scanner State
    const [reputation, setReputation] = useState<DriverReputationData | null>(null);
    const [showScannerModal, setShowScannerModal] = useState<boolean>(false);

    const isSuperAdmin = stellarData?.role === 'superadmin';

    // Fetch Pending Drivers for Cooperative Admin (or Coop Admins for Superadmin)
    React.useEffect(() => {
        if (!isAdmin) return;
        setLoadingDrivers(true);

        const targetRole = isSuperAdmin ? 'admin' : 'driver';

        const q = query(
            collection(db, 'users'),
            where('role', '==', targetRole),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const list: any[] = [];
                snapshot.forEach((docSnap) => {
                    const d = docSnap.data();
                    if (isSuperAdmin || d.todaAffiliation === stellarData.coopName) {
                        list.push({ uid: docSnap.id, ...d });
                    }
                });
                setPendingDrivers(list);
                setLoadingDrivers(false);
            },
            (err) => {
                console.warn("Error fetching pending drivers/coops:", err);
                setLoadingDrivers(false);
            }
        );

        return () => unsubscribe();
    }, [isAdmin, stellarData, isSuperAdmin]);

    // Fetch Pending Vehicle Change Requests
    React.useEffect(() => {
        if (!isAdmin) return;
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'driver'),
            where('vehicleChangeStatus', '==', 'pending')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const list: any[] = [];
                snapshot.forEach((docSnap) => {
                    const d = docSnap.data();
                    if (d.todaAffiliation === stellarData.coopName || isSuperAdmin) {
                        list.push({ uid: docSnap.id, ...d });
                    }
                });
                setVehicleChangeRequests(list);
            },
            (err) => {
                console.warn("Error fetching vehicle change requests:", err);
            }
        );

        return () => unsubscribe();
    }, [isAdmin, stellarData, isSuperAdmin]);

    const handleApproveVehicleChange = async (driverUid: string, newVehicleType: string) => {
        setApprovingVehicleUid(driverUid);
        try {
            await updateDoc(doc(db, 'users', driverUid), {
                vehicleType: newVehicleType,
                pendingVehicleType: null,
                vehicleChangeStatus: 'approved',
                vehicleApprovedAt: new Date().toISOString(),
                vehicleApprovedBy: stellarData.uid,
            });
            // Also sync active location document using setDoc merge:true
            await setDoc(doc(db, 'driver_locations', driverUid), {
                vehicleType: newVehicleType,
            }, { merge: true }).catch(() => { });
        } catch (err) {
            console.error("Failed to approve vehicle change:", err);
        } finally {
            setApprovingVehicleUid(null);
        }
    };

    const handleApproveDriver = async (driverUid: string) => {
        setApprovingUid(driverUid);
        try {
            await updateDoc(doc(db, 'users', driverUid), {
                status: 'approved',
                approvedAt: new Date().toISOString(),
                approvedBy: stellarData.uid,
            });
        } catch (err) {
            console.error("Failed to approve driver:", err);
        } finally {
            setApprovingUid(null);
        }
    };

    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastTitle || !broadcastMessage) return;
        setSendingBroadcast(true);

        try {
            await addDoc(collection(db, 'system_notifications'), {
                title: broadcastTitle.trim(),
                message: broadcastMessage.trim(),
                senderName: stellarData.coopName || stellarData.fullName || 'Admin',
                senderRole: stellarData.role,
                targetRole: isSuperAdmin ? targetAudience : 'driver',
                targetCoop: stellarData.coopName || '',
                timestamp: new Date().toISOString(),
            });

            setBroadcastSuccess(true);
            setBroadcastTitle('');
            setBroadcastMessage('');
            setTimeout(() => {
                setBroadcastSuccess(false);
                setShowBroadcastModal(false);
            }, 2000);
        } catch (err) {
            console.error("Failed to broadcast notification:", err);
        } finally {
            setSendingBroadcast(false);
        }
    };

    const isDriver = stellarData?.role?.toLowerCase() === 'driver';
    const role = stellarData?.role ?? 'commuter';
    const ctaStyle = roleCtaBg(role);
    const cardBorder = roleCardBorder(role);

    // Fetch on-chain driver reputation data
    React.useEffect(() => {
        if (isDriver && stellarData?.publicKey) {
            getDriverReputation(stellarData.publicKey).then(setReputation);
        }
    }, [isDriver, stellarData?.publicKey, debtState]);

    const safeBorrowLimit = reputation?.maxBorrowLimit ?? (typeof borrowLimit === 'number' && !isNaN(borrowLimit) && borrowLimit > 0 ? borrowLimit : 15);
    const safeDebt = typeof debtState === 'number' ? debtState : (debtState && typeof debtState.debt === 'number' ? debtState.debt : 0);
    const availableXlm = Math.max(0, safeBorrowLimit - safeDebt);
    const usedDebtPercentage = Math.min((safeDebt / safeBorrowLimit) * 100, 100);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-5 text-slate-900 dark:text-white font-sans">

            {/* DRIVER / MEMBER SOROBAN CREDIT HERO GAUGE CARD */}
            {isDriver && (
                <div className={`p-8 rounded-3xl bg-white dark:bg-[#0e121a] relative overflow-hidden space-y-6 transition-colors duration-300 ${cardBorder}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                                <Fuel className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-slate-900 dark:text-white">Soroban Micro-Credit Line</h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">Affiliated with {stellarData?.todaAffiliation || 'Cooperative TODA'}</p>
                            </div>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
                            Active Gauge
                        </div>
                    </div>

                    {/* Circular Debt Gauge Visualizer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-8 p-6 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-3xl">

                        <div className="relative w-36 h-36 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                    className="text-slate-200 dark:text-white/10"
                                    strokeWidth="3.5"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                    className="text-cyan-500 dark:text-cyan-400 transition-all duration-1000"
                                    strokeDasharray={`${usedDebtPercentage}, 100`}
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                            </svg>
                            <div className="absolute text-center">
                                <span className="text-xl font-black text-slate-900 dark:text-white block">{availableXlm}</span>
                                <span className="text-[9px] font-mono text-slate-500 dark:text-gray-400 uppercase tracking-widest block font-bold">Available XLM</span>
                            </div>
                        </div>

                        <div className="space-y-3 flex-1 text-center sm:text-left">
                            <div className="flex justify-between items-baseline text-sm">
                                <span className="text-slate-500 dark:text-gray-400 font-medium">Used Credit Debt:</span>
                                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatCurrency(safeDebt)}</span>
                            </div>
                            <div className="flex justify-between items-baseline text-sm">
                                <span className="text-slate-500 dark:text-gray-400 font-medium">Total Credit Limit:</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(safeBorrowLimit)}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-xs">
                                <span className="text-slate-400 dark:text-gray-500 font-mono">Smart Contract:</span>
                                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">Soroban Verified</span>
                            </div>
                        </div>
                    </div>

                    {/* Shift Economics & Net Earnings Card (Feedback Feature) */}
                    <div className="p-6 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-3xl space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                📊 Today's Shift Economics & Take-Home
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                Live In-Memory Simulation
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-4 bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl">
                                <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 block uppercase font-bold">Gross Fares Collected</span>
                                <span className="text-lg font-black text-slate-900 dark:text-white font-mono block mt-1">{formatCurrency(safeDebt > 0 ? (safeDebt * 2.8).toFixed(1) : '45.0')}</span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">{'\u2248'} {'\u20B1'}{((safeDebt > 0 ? safeDebt * 2.8 : 45) * 60.69).toFixed(0)} PHP</span>
                            </div>

                            <div className="p-4 bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl">
                                <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 block uppercase font-bold">Soroban Fuel Advance</span>
                                <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono block mt-1">-{formatCurrency(safeDebt)}</span>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold font-mono">{'\u2248'} -{'\u20B1'}{(safeDebt * 60.69).toFixed(0)} PHP</span>
                            </div>

                            <div className="p-4 bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl">
                                <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 block uppercase font-bold">Net Daily Take-Home</span>
                                <span className="text-lg font-black text-emerald-500 font-mono block mt-1">
                                    +{formatCurrency(Math.max(0, (safeDebt > 0 ? safeDebt * 1.8 : 45)).toFixed(1))}
                                </span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                                    {'\u2248'} +{'\u20B1'}{(Math.max(0, (safeDebt > 0 ? safeDebt * 1.8 : 45)) * 60.69).toFixed(0)} PHP
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ON-CHAIN CREDIT REPUTATION & TIER BADGE CARD */}
                    <div className="p-6 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-3xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <div className={`p-2.5 rounded-xl border ${
                                    reputation?.creditTier === 3
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                        : reputation?.creditTier === 2
                                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                                        : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                                }`}>
                                    <Award className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                                            {reputation?.tierName || 'Bronze Explorer'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            Tier {reputation?.creditTier || 1}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-mono text-slate-500 dark:text-gray-400">
                                        On-Chain Repayments: <strong>{reputation?.successfulRepayments || 0}</strong> • Discounted Protocol Fee: <strong>{reputation?.totalFeePercentage || 0.5}%</strong>
                                    </span>
                                </div>
                            </div>

                            <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 self-start sm:self-auto">
                                Max Limit: {safeBorrowLimit} XLM
                            </span>
                        </div>

                        {/* Tier Progression Progress Bar */}
                        <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between text-[10px] font-mono text-slate-400">
                                <span>Tier 1 (Bronze - 15 XLM)</span>
                                <span>Tier 2 (Silver - 35 XLM)</span>
                                <span>Tier 3 (Gold - 75 XLM)</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-400 via-cyan-400 to-amber-400 rounded-full transition-all duration-700"
                                    style={{
                                        width: `${Math.min(100, Math.max(15, ((reputation?.successfulRepayments || 0) / 8) * 100))}%`,
                                    }}
                                />
                            </div>
                            <div className="text-right text-[10px] font-mono text-cyan-400 font-semibold">
                                {reputation?.creditTier === 3
                                    ? '🏆 Maximum Gold TODA Master Unlocked!'
                                    : `${Math.max(0, (reputation?.creditTier === 1 ? 3 : 8) - (reputation?.successfulRepayments || 0))} more on-time repayment(s) to unlock next tier`}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                            onClick={() => {
                                setCustomAdvanceInput('15');
                                setAdvanceError('');
                                setShowAdvanceModal(true);
                            }}
                            disabled={isProcessing || (debtState?.isLocked ?? false) || availableXlm <= 0}
                            className={`py-3.5 disabled:opacity-50 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 ${ctaStyle}`}
                        >
                            <ArrowUpRight className="w-4 h-4" /> Request Advance
                        </button>
                        <button
                            onClick={handleSettleLoan}
                            disabled={isProcessing || safeDebt <= 0}
                            className={`py-3.5 disabled:opacity-50 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 ${ctaStyle}`}
                        >
                            <ShieldCheck className="w-4 h-4" /> Repay Loan
                        </button>
                        <button
                            onClick={() => setShowScannerModal(true)}
                            className="py-3.5 bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 hover:text-cyan-300 font-mono font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                        >
                            <QrCode className="w-4 h-4" /> Offline Scanner
                        </button>
                    </div>
                </div>
            )}

            {/* OFFLINE DRIVER SCANNER MODAL */}
            {showScannerModal && (
                <OfflineDriverScanner
                    driverData={stellarData}
                    onClose={() => setShowScannerModal(false)}
                    onSuccess={() => {}}
                />
            )}



            {/* CUSTOM CREDIT ADVANCE MODAL */}
            {showAdvanceModal && (
                <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white dark:bg-[#0E121B] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Fuel className="w-6 h-6 text-cyan-500" />
                                <h3 className="font-black text-lg text-slate-900 dark:text-white">Custom Soroban Credit Advance</h3>
                            </div>
                            <button onClick={() => setShowAdvanceModal(false)} className="p-2 text-slate-400 hover:text-white rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl space-y-1 font-mono text-xs">
                            <div className="flex justify-between text-slate-500 dark:text-gray-400">
                                <span>Total Credit Ceiling:</span>
                                <strong className="text-slate-900 dark:text-white">{formatCurrency(safeBorrowLimit)}</strong>
                            </div>
                            <div className="flex justify-between text-slate-500 dark:text-gray-400">
                                <span>Available Credit Limit:</span>
                                <strong className="text-cyan-500 font-bold">{formatCurrency(availableXlm)}</strong>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-mono font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider block">
                                Type Desired Advance Amount (XLM)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max={availableXlm}
                                value={customAdvanceInput}
                                onChange={(e) => {
                                    setCustomAdvanceInput(e.target.value);
                                    setAdvanceError('');
                                }}
                                placeholder={`Max ${availableXlm} XLM`}
                                className="w-full px-4 py-3.5 bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded-2xl font-mono text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                            />
                            {advanceError && (
                                <p className="text-xs text-red-500 font-mono font-bold animate-pulse">{advanceError}</p>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                const parsed = parseFloat(customAdvanceInput);
                                if (isNaN(parsed) || parsed <= 0) {
                                    setAdvanceError('Please enter a valid positive XLM amount.');
                                    return;
                                }
                                if (parsed > availableXlm) {
                                    setAdvanceError(`Amount exceeds available credit ceiling of ${availableXlm} XLM.`);
                                    return;
                                }
                                handleRequestAdvance(parsed);
                                setShowAdvanceModal(false);
                            }}
                            disabled={isProcessing}
                            className={`w-full py-4 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 hover:scale-[1.02] ${ctaStyle}`}
                        >
                            <ArrowUpRight className="w-4 h-4" /> Submit XLM Advance Request
                        </button>
                    </div>
                </div>
            )}

            {/* ADMIN SUITE GRID SECTION */}
            {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column: Verification Queues (Col-span 8) */}
                    <div className="md:col-span-8 space-y-6 flex flex-col h-full justify-start">
                        
                        {/* COOPERATIVE ADMIN PENDING DRIVERS / SUPERADMIN COOPERATIVES QUEUE */}
                        <div className={`p-8 rounded-3xl bg-white dark:bg-[#0e121a] space-y-6 transition-colors duration-300 ${cardBorder}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900 dark:text-white">
                                            {isSuperAdmin ? 'Cooperative Verification Queue' : 'Cooperative Member Queue'}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">
                                            {isSuperAdmin ? 'Review & approve new cooperative registration requests' : `Review & approve driver registration requests for ${stellarData.coopName || 'Cooperative TODA'}`}
                                        </p>
                                    </div>
                                </div>
                                <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
                                    {pendingDrivers.length} Pending
                                </span>
                            </div>

                            <div className="space-y-4">
                                {loadingDrivers ? (
                                    <div className="p-6 bg-slate-50 dark:bg-black/40 rounded-2xl text-center text-xs text-slate-500 dark:text-gray-400 animate-pulse">
                                        {isSuperAdmin ? 'Loading pending cooperatives...' : 'Loading pending member drivers...'}
                                    </div>
                                ) : pendingDrivers.length > 0 ? (
                                    pendingDrivers.map((driver) => (
                                        <div
                                            key={driver.uid}
                                            className="p-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-400 flex items-center justify-center text-black font-black text-lg">
                                                    {((isSuperAdmin ? driver.coopName : driver.fullName) || 'Coop').charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                                                        {isSuperAdmin ? driver.coopName : driver.fullName}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">
                                                        {isSuperAdmin
                                                            ? `Reg #: ${driver.registrationNumber || 'N/A'} • Contact: ${driver.contactPerson || driver.fullName || 'N/A'}`
                                                            : `🛺 Plate: ${driver.plateNumber} • Phone: ${driver.phone}`
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleApproveDriver(driver.uid)}
                                                disabled={approvingUid === driver.uid}
                                                className={`w-full sm:w-auto px-6 py-3 disabled:opacity-50 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 ${ctaStyle}`}
                                            >
                                                <UserCheck className="w-4 h-4" />
                                                {approvingUid === driver.uid ? 'Approving...' : isSuperAdmin ? 'Approve Cooperative' : 'Approve Driver'}
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 text-center space-y-2">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto" />
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                            {isSuperAdmin ? 'All Cooperatives Approved' : 'All Driver Requests Approved'}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">
                                            {isSuperAdmin ? 'No pending cooperatives waiting for platform verification.' : 'No pending drivers waiting for verification in your cooperative queue.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* COOPERATIVE ADMIN VEHICLE TYPE CHANGE REQUESTS QUEUE */}
                        {vehicleChangeRequests.length > 0 && (
                            <div className={`p-8 rounded-3xl bg-white dark:bg-[#0e121a] space-y-6 transition-colors duration-300 ${cardBorder}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                                            <Truck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl text-slate-900 dark:text-white">Vehicle Change Approvals</h3>
                                            <p className="text-xs text-slate-500 dark:text-gray-400">Review & approve driver vehicle designation change requests</p>
                                        </div>
                                    </div>
                                    <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold border border-indigo-500/20">
                                        {vehicleChangeRequests.length} Pending
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {vehicleChangeRequests.map((driver) => (
                                        <div
                                            key={driver.uid}
                                            className="p-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-400 flex items-center justify-center text-white font-black text-lg">
                                                    {(driver.fullName || 'Driver').charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-base text-slate-900 dark:text-white">{driver.fullName}</h4>
                                                    <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">
                                                        Current: <span className="font-bold">{driver.vehicleType || 'Tricycle'}</span> ➔ Requested: <span className="font-black text-indigo-400">{driver.pendingVehicleType}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleApproveVehicleChange(driver.uid, driver.pendingVehicleType)}
                                                disabled={approvingVehicleUid === driver.uid}
                                                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                {approvingVehicleUid === driver.uid ? 'Approving...' : `Approve ${driver.pendingVehicleType}`}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Actions / Broadcast Tool (Col-span 4) */}
                    <div className="md:col-span-4 space-y-6">
                        
                        {/* ADMIN BROADCAST ANNOUNCEMENT CENTER CARD */}
                        <div className={`p-6 rounded-3xl bg-white dark:bg-[#0e121a] flex flex-col gap-4 text-left transition-colors duration-300 ${cardBorder}`}>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                                <Megaphone className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="font-black text-lg text-slate-900 dark:text-white">Broadcast Notification Center</h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                                    {isSuperAdmin
                                        ? 'Send targeted push alerts and dashboard updates to commuters, drivers, or cooperatives.'
                                        : `Send announcements to all drivers affiliated with ${stellarData.coopName || 'your TODA'}.`}
                                </p>
                            </div>

                            <button
                                onClick={() => setShowBroadcastModal(true)}
                                className={`w-full py-3.5 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 ${ctaStyle}`}
                            >
                                <BellRing className="w-4 h-4" /> Send Announcement
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* BROADCAST COMPOSER MODAL */}
            {showBroadcastModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-md bg-white dark:bg-[#0a0a14] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative text-slate-900 dark:text-white space-y-5">

                        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                                    <Megaphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg tracking-tight">Broadcast Announcement</h3>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">
                                        {isSuperAdmin ? 'Platform-Wide Targeting' : `To ${stellarData.coopName || 'Cooperative'} Drivers`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowBroadcastModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {broadcastSuccess ? (
                            <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                                <h4 className="font-black text-base text-emerald-600 dark:text-emerald-400">Broadcast Sent Successfully!</h4>
                                <p className="text-xs text-slate-500 dark:text-gray-300">All target members will receive the notification instantly.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSendBroadcast} className="space-y-4">
                                {isSuperAdmin && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                            Select Target Audience
                                        </label>
                                        <select
                                            value={targetAudience}
                                            onChange={(e) => setTargetAudience(e.target.value)}
                                            className="w-full p-4 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                                        >
                                            <option value="driver">🛺 All Transport Drivers</option>
                                            <option value="commuter">🚶 All Commuters</option>
                                            <option value="admin">🏢 All Cooperative Admins</option>
                                            <option value="all">🌍 Platform-Wide (Everyone)</option>
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                        Announcement Title
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. TODA General Assembly / Fuel Subsidy"
                                        value={broadcastTitle}
                                        onChange={(e) => setBroadcastTitle(e.target.value)}
                                        className="w-full p-4 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                        Notification Message
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="Enter full broadcast text for your targeted users..."
                                        value={broadcastMessage}
                                        onChange={(e) => setBroadcastMessage(e.target.value)}
                                        className="w-full p-4 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-cyan-500 resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={sendingBroadcast}
                                    className={`w-full py-4 disabled:opacity-50 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 ${ctaStyle}`}
                                >
                                    <Send className="w-4 h-4" />
                                    {sendingBroadcast ? 'Sending Broadcast...' : 'Broadcast Announcement Now'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HubTab;