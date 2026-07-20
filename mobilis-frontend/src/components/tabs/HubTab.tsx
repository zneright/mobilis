import React from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Fuel, Building2, UserCheck, ArrowUpRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
    const [pendingDrivers, setPendingDrivers] = React.useState<any[]>([]);
    const [loadingDrivers, setLoadingDrivers] = React.useState<boolean>(false);
    const [approvingUid, setApprovingUid] = React.useState<string | null>(null);

    // Fetch Pending Drivers for Cooperative Admin
    React.useEffect(() => {
        if (!isAdmin) return;
        setLoadingDrivers(true);
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'driver'),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const drivers: any[] = [];
                snapshot.forEach((docSnap) => {
                    const d = docSnap.data();
                    if (d.todaAffiliation === stellarData.coopName || stellarData.role === 'superadmin') {
                        drivers.push({ uid: docSnap.id, ...d });
                    }
                });
                setPendingDrivers(drivers);
                setLoadingDrivers(false);
            },
            (err) => {
                console.warn("Error fetching pending drivers:", err);
                setLoadingDrivers(false);
            }
        );

        return () => unsubscribe();
    }, [isAdmin, stellarData]);

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

    const isDriver = stellarData.role === 'driver';
    const usedDebtPercentage = Math.min((debtState.debt / borrowLimit) * 100, 100);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 text-slate-900 dark:text-white font-sans">
            
            {/* DRIVER / MEMBER SOROBAN CREDIT HERO GAUGE CARD */}
            {isDriver && (
                <div className="p-8 rounded-[2.5rem] bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 shadow-2xl relative overflow-hidden space-y-6 transition-colors duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                                <Fuel className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-slate-900 dark:text-white">Soroban Micro-Credit Line</h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">Affiliated with {stellarData.todaAffiliation || 'Cooperative TODA'}</p>
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
                                <span className="text-xl font-black text-slate-900 dark:text-white block">{borrowLimit - debtState.debt}</span>
                                <span className="text-[9px] font-mono text-slate-500 dark:text-gray-400 uppercase tracking-widest block font-bold">Available XLM</span>
                            </div>
                        </div>

                        <div className="space-y-3 flex-1 text-center sm:text-left">
                            <div className="flex justify-between items-baseline text-sm">
                                <span className="text-slate-500 dark:text-gray-400 font-medium">Used Credit Debt:</span>
                                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatCurrency(debtState.debt)}</span>
                            </div>
                            <div className="flex justify-between items-baseline text-sm">
                                <span className="text-slate-500 dark:text-gray-400 font-medium">Total Credit Limit:</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(borrowLimit)}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-xs">
                                <span className="text-slate-400 dark:text-gray-500 font-mono">Smart Contract:</span>
                                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">Soroban Verified</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleRequestAdvance(15)}
                            disabled={isProcessing || debtState.isLocked}
                            className="py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-black text-xs rounded-2xl transition-all shadow-[0_0_20px_rgba(0,210,255,0.3)] flex items-center justify-center gap-2"
                        >
                            <ArrowUpRight className="w-4 h-4" /> Borrow 15 XLM Advance
                        </button>
                        <button
                            onClick={handleSettleLoan}
                            disabled={isProcessing || debtState.debt <= 0}
                            className="py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black text-xs rounded-2xl transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center justify-center gap-2"
                        >
                            <ShieldCheck className="w-4 h-4" /> Repay Soroban Credit Loan
                        </button>
                    </div>
                </div>
            )}

            {/* COOPERATIVE ADMIN PENDING DRIVERS QUEUE */}
            {isAdmin && (
                <div className="p-8 rounded-[2.5rem] bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 shadow-2xl space-y-6 transition-colors duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-slate-900 dark:text-white">Cooperative Member Queue</h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400">Review & approve driver registration requests for {stellarData.coopName || 'Cooperative TODA'}</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
                            {pendingDrivers.length} Pending
                        </span>
                    </div>

                    <div className="space-y-4">
                        {loadingDrivers ? (
                            <div className="p-6 bg-slate-50 dark:bg-black/40 rounded-2xl text-center text-xs text-slate-500 dark:text-gray-400 animate-pulse">
                                Loading pending member drivers...
                            </div>
                        ) : pendingDrivers.length > 0 ? (
                            pendingDrivers.map((driver) => (
                                <div
                                    key={driver.uid}
                                    className="p-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-400 flex items-center justify-center text-black font-black text-lg">
                                            {(driver.fullName || 'Driver').charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base text-slate-900 dark:text-white">{driver.fullName}</h4>
                                            <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">🛺 Plate: {driver.plateNumber} • Phone: {driver.phone}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleApproveDriver(driver.uid)}
                                        disabled={approvingUid === driver.uid}
                                        className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(52,211,153,0.4)] flex items-center justify-center gap-2"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                        {approvingUid === driver.uid ? 'Approving...' : 'Approve Driver'}
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 text-center space-y-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto" />
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">All Driver Requests Approved</h4>
                                <p className="text-xs text-slate-500 dark:text-gray-400">No pending drivers waiting for verification in your cooperative queue.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HubTab;