import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Keypair } from '@stellar/stellar-sdk';
import { ExternalLink, Fuel, Zap, CheckCircle2, Receipt, X, Printer, Copy, Check, Globe, ShieldCheck, Landmark, Coins, ArrowUpRight, ArrowDownLeft, Sparkles } from 'lucide-react';
import { cardRoleStyle, rolePill, roleAccentText, roleCtaBg } from './roleStyleTokens';
import { MobilisLogo } from '../common/MobilisLogo';

interface HistoryTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    txHistory: any[];
    appNetwork: 'TESTNET';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stellarData?: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTxAmount(t: any): { xlm: string; php: string } {
    let numXlm = 0;
    let numPhp = 0;

    const rawXlm = t.amount || t.amountSettled || t.amountXlm || t.borrowedAmount || t.debtState || t.val || t.value;
    if (rawXlm !== undefined && rawXlm !== null && rawXlm !== '') {
        const parsed = parseFloat(String(rawXlm));
        if (!isNaN(parsed) && parsed > 0) {
            numXlm = parsed;
        }
    }

    if (numXlm === 0 && t.amountPhp) {
        const parsedPhp = parseFloat(String(t.amountPhp));
        if (!isNaN(parsedPhp) && parsedPhp > 0) {
            numPhp = parsedPhp;
            numXlm = parsedPhp / 60.69;
        }
    }

    if (numXlm > 0 && numPhp === 0) {
        if (t.amountPhp) {
            numPhp = parseFloat(String(t.amountPhp)) || (numXlm * 60.69);
        } else {
            numPhp = numXlm * 60.69;
        }
    }

    return {
        xlm: numXlm.toFixed(4),
        php: numPhp.toFixed(2),
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isTxOutgoing(tx: any, role: string, activePubKey: string | null): boolean {
    const type = (tx.type || '').toUpperCase();

    // 1. External Stellar Transfers
    if (type === 'EXTERNAL_STELLAR') {
        if (tx.isIncoming !== undefined) return !tx.isIncoming;
        if (activePubKey && tx.fromAddr) return tx.fromAddr === activePubKey;
        return false;
    }

    // 2. Fare Payments
    if (type === 'FARE_PAYMENT' || type === 'FARE') {
        if (role === 'commuter') return true;
        return false;
    }

    // 3. Settle Loan / Loan Repayment
    if (type === 'SETTLE_LOAN' || type === 'LOAN_SETTLEMENT' || type === 'REPAYMENT' || type.includes('SETTLE')) {
        if (role === 'driver' || role === 'commuter') return true;
        return false;
    }

    // 4. Fuel Credit / Loan Advance
    if (type === 'AUTO_LOAN_ADVANCE' || type === 'FUEL_ADVANCE' || type === 'CREDIT_REQUEST' || type === 'GET_CREDIT' || type === 'CONTRACT_ADVANCE' || type.includes('ADVANCE')) {
        if (role === 'driver' || role === 'commuter') return false; // Driver receives advance (+)
        return true; // Admin disburses advance (-)
    }

    // 5. Treasury Liquidity Injection
    if (type === 'LIQUIDITY_INJECTION' || type === 'TREASURY_DEPOSIT') {
        if (role === 'admin' || role === 'cooperative' || role === 'superadmin') return false;
        return true;
    }

    return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTxTypeStyle(type: string, isIncoming?: boolean, item?: any) {
    const upper = (type || '').toUpperCase();
    if (upper === 'FARE_PAYMENT' || upper === 'FARE') {
        return {
            badge: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-black',
            accent: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-500/30 dark:border-emerald-500/30',
            label: '⚡ FARE PAYMENT',
            isContract: false,
            Icon: Zap,
        };
    }
    if (upper === 'SETTLE_LOAN' || upper === 'LOAN_SETTLEMENT' || upper === 'REPAYMENT' || upper.includes('SETTLE') || upper.includes('REPAY')) {
        return {
            badge: 'bg-lime-500/15 border-lime-500/40 text-lime-600 dark:text-lime-400 font-black',
            accent: 'text-lime-600 dark:text-lime-400',
            border: 'border-lime-500/30 dark:border-lime-500/30',
            label: '📜 SOROBAN SETTLE LOAN',
            isContract: true,
            Icon: ShieldCheck,
        };
    }
    if (upper === 'AUTO_LOAN_ADVANCE' || upper === 'FUEL_ADVANCE' || upper === 'CREDIT_REQUEST' || upper === 'GET_CREDIT' || upper === 'CONTRACT_ADVANCE' || upper.includes('ADVANCE') || upper.includes('BORROW') || upper.includes('LOAN')) {
        return {
            badge: 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-black',
            accent: 'text-amber-600 dark:text-amber-400',
            border: 'border-amber-500/30 dark:border-amber-500/30',
            label: '📜 SOROBAN FUEL ADVANCE',
            isContract: true,
            Icon: Fuel,
        };
    }
    if (upper === 'LIQUIDITY_INJECTION' || upper === 'TREASURY_DEPOSIT' || upper.includes('TREASURY') || upper.includes('INJECTION')) {
        return {
            badge: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-black',
            accent: 'text-indigo-600 dark:text-indigo-400',
            border: 'border-indigo-500/30 dark:border-indigo-500/30',
            label: '📜 SOROBAN TREASURY INJECTION',
            isContract: true,
            Icon: Landmark,
        };
    }
    if (upper === 'EXTERNAL_STELLAR') {
        if (isIncoming) {
            return {
                badge: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-400 font-black',
                accent: 'text-cyan-600 dark:text-cyan-400',
                border: 'border-cyan-500/30 dark:border-cyan-500/30',
                label: '📥 INCOMING STELLAR',
                isContract: false,
                Icon: ArrowDownLeft,
            };
        }
        return {
            badge: 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400 font-black',
            accent: 'text-purple-600 dark:text-purple-400',
            border: 'border-purple-500/30 dark:border-purple-500/30',
            label: '📤 OUTGOING STELLAR',
            isContract: false,
            Icon: ArrowUpRight,
        };
    }

    const isSoroban = item?.isContract || item?.contractId || upper.includes('CONTRACT') || upper.includes('SOROBAN');
    return {
        badge: isSoroban
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-black'
            : 'bg-slate-500/15 border-slate-500/40 text-slate-600 dark:text-slate-400 font-black',
        accent: isSoroban ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400',
        border: isSoroban ? 'border-amber-500/30 dark:border-amber-500/30' : 'border-slate-500/30 dark:border-slate-500/30',
        label: isSoroban ? '📜 SOROBAN SMART CONTRACT' : '🌐 STELLAR ON-CHAIN LEDGER',
        isContract: isSoroban,
        Icon: isSoroban ? Fuel : Coins,
    };
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ txHistory, appNetwork, stellarData }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [fareTxs, setFareTxs] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [contractTxs, setContractTxs] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [horizonPayments, setHorizonPayments] = useState<any[]>([]);
    const [loadingFares, setLoadingFares] = useState<boolean>(true);
    const [loadingHorizon, setLoadingHorizon] = useState<boolean>(true);
    const [filterCategory, setFilterCategory] = useState<'all' | 'fare' | 'fuel_advance' | 'settle_loan' | 'treasury' | 'external'>('all');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
    const [copiedHash, setCopiedHash] = useState<boolean>(false);

    // Resolve Active Wallet Public Key
    const activePubKey = React.useMemo(() => {
        if (stellarData?.publicKey) return stellarData.publicKey;
        if (stellarData?.secret) {
            try {
                return Keypair.fromSecret(stellarData.secret).publicKey();
            } catch {
                return null;
            }
        }
        return null;
    }, [stellarData]);

    // 1. Listen to Firestore Fare Transactions dynamically based on user role
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
                console.warn('Fare transactions listener warning:', err);
                setLoadingFares(false);
            }
        );

        return () => unsubscribe();
    }, [stellarData]);

    // 2. Listen to Firestore Soroban Smart Contract Transactions (Settle Loan, Get Fuel Credit, Treasury)
    useEffect(() => {
        if (!stellarData?.uid) return;

        const role = stellarData.role;
        let q;

        if (role === 'commuter' || role === 'driver') {
            q = query(collection(db, 'transactions'), where('senderUid', '==', stellarData.uid));
        } else if (role === 'cooperative' || role === 'admin') {
            q = query(collection(db, 'transactions'), where('coopName', '==', stellarData.coopName || ''));
        } else {
            q = query(collection(db, 'transactions'));
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const txs: any[] = [];
                snapshot.forEach((doc) => txs.push({ id: doc.id, ...doc.data() }));
                setContractTxs(txs);
            },
            (err) => console.warn('Contract transactions listener note:', err)
        );

        return () => unsubscribe();
    }, [stellarData]);

    // 3. Fetch Live Stellar Horizon On-Chain Payments for the active wallet
    useEffect(() => {
        if (!activePubKey) {
            setLoadingHorizon(false);
            return;
        }

        let isMounted = true;
        async function fetchHorizonLedger() {
            setLoadingHorizon(true);
            try {
                const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${activePubKey}/payments?limit=30&order=desc`);
                if (res.ok && isMounted) {
                    const data = await res.json();
                    const records = data._embedded?.records || [];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const parsed = records.map((p: any) => {
                        const isIncoming = p.to === activePubKey;
                        const { xlm, php } = extractTxAmount(p);
                        return {
                            id: p.id,
                            txHash: p.transaction_hash,
                            amount: xlm,
                            amountPhp: php,
                            asset: p.asset_type === 'native' ? 'XLM' : p.asset_code || 'XLM',
                            timestamp: p.created_at,
                            type: 'EXTERNAL_STELLAR',
                            senderName: isIncoming ? `Account (${p.from?.substring(0, 6)}...)` : 'My Wallet',
                            senderKey: p.from,
                            receiverName: isIncoming ? 'My Wallet' : `Account (${p.to?.substring(0, 6)}...)`,
                            receiverKey: p.to,
                            fromAddr: p.from,
                            toAddr: p.to,
                            plateNumber: 'N/A (On-Chain Direct)',
                            coopName: isIncoming ? 'Incoming Transfer' : 'Outgoing Transfer',
                            status: 'completed',
                            isIncoming,
                        };
                    });
                    setHorizonPayments(parsed);
                }
            } catch (err) {
                console.warn("Horizon ledger fetch note:", err);
            } finally {
                if (isMounted) setLoadingHorizon(false);
            }
        }

        fetchHorizonLedger();
        return () => {
            isMounted = false;
        };
    }, [activePubKey]);

    // 4. Dynamic Multi-Source Stream Merger & Deduplication
    const allMergedHistory = React.useMemo(() => {
        const hashSet = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const merged: any[] = [];

        // Firestore Fare Transactions
        fareTxs.forEach((f) => {
            if (f.txHash) hashSet.add(f.txHash);
            const { xlm, php } = extractTxAmount(f);
            merged.push({
                txHash: f.txHash,
                amount: xlm,
                amountPhp: php,
                asset: 'XLM',
                timestamp: f.timestamp || new Date().toISOString(),
                type: 'FARE_PAYMENT',
                senderName: f.commuterName || 'Commuter',
                senderKey: f.commuterId || f.commuterPubKey || f.senderPubKey || '',
                receiverName: f.driverName || 'Driver',
                receiverKey: f.driverId || f.driverPubKey || f.destination || '',
                plateNumber: f.plateNumber || f.driverPlateNumber || 'N/A',
                coopName: f.coopName || f.driverToda || 'Mobilis Fleet',
                status: f.status || 'completed',
            });
        });

        // Firestore Soroban Contract Transactions (Settle Loan, Fuel Advance, Treasury)
        const combinedContractSources = [...(txHistory || []), ...contractTxs];
        combinedContractSources.forEach((t) => {
            if (t.txHash) hashSet.add(t.txHash);
            const upperType = (t.type || 'AUTO_LOAN_ADVANCE').toUpperCase();
            const { xlm, php } = extractTxAmount(t);
            merged.push({
                ...t,
                amount: xlm,
                amountPhp: php,
                type: upperType,
                senderName: t.senderName || t.driverName || 'Soroban Smart Contract',
                senderKey: t.senderUid || t.senderPubKey || t.fromAddr || '',
                receiverName: t.receiverName || t.coopName || 'Fleet Treasury',
                receiverKey: t.destination || t.recipientPubKey || t.toAddr || '',
                plateNumber: t.plateNumber || 'N/A (Smart Contract)',
                coopName: t.coopName || 'Soroban WASM Contract',
                status: 'completed',
                isContract: true,
            });
        });

        // External On-Chain Stellar Horizon Payments
        horizonPayments.forEach((hp) => {
            if (!hashSet.has(hp.txHash)) {
                hashSet.add(hp.txHash);
                merged.push(hp);
            }
        });

        return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [fareTxs, contractTxs, txHistory, horizonPayments]);

    // Category Live Counts
    const counts = React.useMemo(() => {
        return {
            all: allMergedHistory.length,
            fare: allMergedHistory.filter((i) => i.type === 'FARE_PAYMENT' || i.type === 'FARE').length,
            fuel_advance: allMergedHistory.filter((i) => {
                const u = (i.type || '').toUpperCase();
                return ['AUTO_LOAN_ADVANCE', 'FUEL_ADVANCE', 'CREDIT_REQUEST', 'GET_CREDIT', 'CONTRACT_ADVANCE', 'ADVANCE', 'REQUEST_ADVANCE'].includes(u) || u.includes('ADVANCE');
            }).length,
            settle_loan: allMergedHistory.filter((i) => {
                const u = (i.type || '').toUpperCase();
                return ['SETTLE_LOAN', 'LOAN_SETTLEMENT', 'REPAYMENT', 'SETTLE'].includes(u) || u.includes('SETTLE');
            }).length,
            treasury: allMergedHistory.filter((i) => {
                const u = (i.type || '').toUpperCase();
                return ['LIQUIDITY_INJECTION', 'TREASURY_DEPOSIT', 'INJECTION'].includes(u) || u.includes('TREASURY');
            }).length,
            external: allMergedHistory.filter((i) => i.type === 'EXTERNAL_STELLAR').length,
        };
    }, [allMergedHistory]);

    // Filtered Display List
    const combinedHistory = React.useMemo(() => {
        return allMergedHistory.filter((item) => {
            const upper = (item.type || '').toUpperCase();
            if (filterCategory === 'fare') return upper === 'FARE_PAYMENT' || upper === 'FARE';
            if (filterCategory === 'fuel_advance') return ['AUTO_LOAN_ADVANCE', 'FUEL_ADVANCE', 'CREDIT_REQUEST', 'GET_CREDIT', 'CONTRACT_ADVANCE', 'ADVANCE', 'REQUEST_ADVANCE'].includes(upper) || upper.includes('ADVANCE');
            if (filterCategory === 'settle_loan') return ['SETTLE_LOAN', 'LOAN_SETTLEMENT', 'REPAYMENT', 'SETTLE'].includes(upper) || upper.includes('SETTLE');
            if (filterCategory === 'treasury') return ['LIQUIDITY_INJECTION', 'TREASURY_DEPOSIT', 'INJECTION'].includes(upper) || upper.includes('TREASURY');
            if (filterCategory === 'external') return upper === 'EXTERNAL_STELLAR';
            return true;
        });
    }, [allMergedHistory, filterCategory]);

    const handleCopyHash = (hash: string) => {
        if (!hash) return;
        navigator.clipboard.writeText(hash);
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
    };

    const role = stellarData?.role ?? 'commuter';
    const cardStyle = cardRoleStyle(role);
    const pillStyle = rolePill(role);
    const accentStyle = roleAccentText(role);
    const ctaStyle = roleCtaBg(role);

    return (
        <div className={`w-full max-w-4xl mx-auto rounded-3xl p-6 sm:p-8 transition-all duration-300 ${cardStyle}`}>
            <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-0.5 tracking-tight flex items-center gap-2.5">
                            <MobilisLogo size={26} showText={false} />
                            <span>Transit & Fleet Transactions</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold border ${pillStyle}`}>
                                {role.toUpperCase()} SCOPE
                            </span>
                        </h3>
                        <p className="text-slate-500 dark:text-gray-400 text-xs font-mono">
                            Real-time verified fare receipts, Soroban loan settlements, fuel credits & Stellar transfers.
                        </p>
                    </div>
                </div>

                {/* Ultra-Smooth Scrollable Filter Pill Bar */}
                <div className="relative group">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory py-1 px-0.5 scroll-smooth">
                        {[
                            { id: 'all', label: 'All Activity', icon: Sparkles, count: counts.all },
                            { id: 'fare', label: 'Fare Receipts', icon: Zap, count: counts.fare },
                            { id: 'fuel_advance', label: 'Fuel Credit', icon: Fuel, count: counts.fuel_advance },
                            { id: 'settle_loan', label: 'Settle Loan', icon: ShieldCheck, count: counts.settle_loan },
                            { id: 'treasury', label: 'Treasury', icon: Landmark, count: counts.treasury },
                            { id: 'external', label: 'Stellar On-Chain', icon: Globe, count: counts.external },
                        ].map((cat) => {
                            const Icon = cat.icon;
                            const isActive = filterCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    onClick={() => setFilterCategory(cat.id as any)}
                                    className={`snap-start px-3.5 py-2 rounded-2xl text-xs font-mono font-bold transition-all duration-200 border flex items-center gap-2 flex-shrink-0 active:scale-95 ${
                                        isActive
                                            ? `${ctaStyle} border-transparent shadow-md scale-[1.02]`
                                            : 'bg-white/80 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/10'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{cat.label}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                                        isActive ? 'bg-black/20 text-white' : 'bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-gray-300'
                                    }`}>
                                        {cat.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {loadingFares || loadingHorizon ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-5 bg-slate-50 dark:bg-white/[0.03] rounded-2xl animate-pulse h-28" />
                        ))}
                    </div>
                ) : combinedHistory.length > 0 ? (
                    combinedHistory.map((tx, idx) => {
                        const typeStyle = getTxTypeStyle(tx.type, tx.isIncoming, tx);
                        const { Icon } = typeStyle;

                        return (
                            <div
                                key={tx.txHash || idx}
                                className={`p-5 bg-white/70 dark:bg-[#07090E]/80 rounded-2xl border ${typeStyle.border} flex flex-col md:flex-row md:justify-between md:items-start gap-4 transition-all hover:shadow-lg relative overflow-hidden`}
                            >
                                {/* Background Watermark with Mobilis Logo */}
                                <div className="absolute right-4 bottom-2 pointer-events-none select-none opacity-[0.05] dark:opacity-[0.08] flex items-center gap-2 font-mono font-black text-3xl sm:text-4xl tracking-tighter uppercase text-slate-900 dark:text-white z-0">
                                    <MobilisLogo size={28} showText={false} />
                                    <span>MOBILIS</span>
                                </div>

                                <div className="flex-1 z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`p-1.5 px-2.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 border font-mono ${typeStyle.badge}`}>
                                                <Icon className="w-3.5 h-3.5" />
                                                {typeStyle.label}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 font-mono uppercase">
                                                {tx.status?.toUpperCase() || 'CONFIRMED'}
                                            </span>
                                        </div>
                                        <div className="text-right font-mono">
                                            {(() => {
                                                const cardAmt = extractTxAmount(tx);
                                                const outgoing = isTxOutgoing(tx, role, activePubKey);
                                                const sign = outgoing ? '-' : '+';
                                                const textColor = outgoing ? 'text-rose-600 dark:text-rose-400 font-bold' : typeStyle.accent;
                                                return (
                                                    <>
                                                        <p className={`font-black text-lg ${textColor}`}>
                                                            {sign}{cardAmt.xlm} {tx.asset || 'XLM'}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500">
                                                            {'\u2248'} {sign}{'\u20B1'}{cardAmt.php} PHP
                                                        </p>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <p className="text-slate-400 dark:text-gray-500 text-[10px] font-mono mb-3">
                                        {new Date(tx.timestamp).toLocaleString()}
                                    </p>

                                    {/* Rich Metadata Card */}
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50/80 dark:bg-white/[0.02] p-4 rounded-xl border border-slate-200/50 dark:border-white/[0.05] font-mono">
                                        <div className="col-span-2 sm:col-span-1 space-y-0.5">
                                            <p className="text-[9px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-widest">Sender / Payer</p>
                                            <p className="text-xs font-bold truncate text-slate-900 dark:text-white">{tx.senderName || 'Sender'}</p>
                                            {tx.senderKey && (
                                                <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono truncate font-semibold">
                                                    🔑 {tx.senderKey.length > 18 ? `${tx.senderKey.substring(0, 8)}...${tx.senderKey.substring(tx.senderKey.length - 6)}` : tx.senderKey}
                                                </p>
                                            )}
                                        </div>
                                        <div className="col-span-2 sm:col-span-1 space-y-0.5">
                                            <p className="text-[9px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-widest">Recipient / Payee</p>
                                            <p className="text-xs font-bold truncate text-slate-900 dark:text-white">{tx.receiverName || 'Recipient'}</p>
                                            {tx.receiverKey && (
                                                <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono truncate font-semibold">
                                                    🔑 {tx.receiverKey.length > 18 ? `${tx.receiverKey.substring(0, 8)}...${tx.receiverKey.substring(tx.receiverKey.length - 6)}` : tx.receiverKey}
                                                </p>
                                            )}
                                        </div>
                                        <div className="col-span-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.05] flex justify-between items-center text-xs">
                                            <span className="text-slate-400 dark:text-gray-500">Plate: {tx.plateNumber || 'N/A'}</span>
                                            <span className={`font-bold ${typeStyle.accent}`}>{tx.coopName || 'Mobilis Fleet'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 md:mt-0 mt-2 self-start md:self-center w-full md:w-auto font-mono z-10">
                                    <button
                                        onClick={() => setSelectedReceipt(tx)}
                                        className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 font-black rounded-xl text-xs transition-all ${ctaStyle}`}
                                    >
                                        <Receipt className="w-4 h-4" /> View Receipt
                                    </button>
                                    {tx.txHash && (
                                        <a
                                            href={`https://stellar.expert/explorer/${appNetwork.toLowerCase()}/tx/${tx.txHash}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold transition-colors border border-slate-200/60 dark:border-white/[0.06]"
                                        >
                                            Ledger Explorer <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-12 text-center text-slate-400 dark:text-gray-500 font-mono">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="font-bold text-sm">No recorded ledger activity for category: {filterCategory.toUpperCase()}</p>
                        <p className="text-xs mt-1">Completed fare payments, credit advances & external transfers will appear here.</p>
                    </div>
                )}
            </div>

            {/* DIGITAL RECEIPT MODAL */}
            {selectedReceipt && (
                <>
                    <style>{`
                        @media print {
                            body * {
                                visibility: hidden !important;
                            }
                            #mobilis-printable-receipt-card, #mobilis-printable-receipt-card * {
                                visibility: visible !important;
                            }
                            #mobilis-printable-receipt-card {
                                position: fixed !important;
                                left: 50% !important;
                                top: 50% !important;
                                transform: translate(-50%, -50%) !important;
                                width: 100% !important;
                                max-width: 480px !important;
                                margin: 0 !important;
                                padding: 24px !important;
                                background: white !important;
                                color: black !important;
                                box-shadow: none !important;
                                border: 2px solid #cbd5e1 !important;
                                border-radius: 24px !important;
                                z-index: 99999 !important;
                            }
                            .no-print {
                                display: none !important;
                            }
                        }
                    `}</style>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                        <div className="w-full max-w-md bg-white dark:bg-[#0e121a] border border-slate-200 dark:border-white/[0.08] rounded-3xl p-6 shadow-2xl relative text-slate-900 dark:text-white">

                            {/* Modal Header Bar - Hidden on Print */}
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-white/[0.06] no-print">
                                <div className="flex items-center gap-2">
                                    <Receipt className={`w-5 h-5 ${accentStyle}`} />
                                    <h4 className="text-lg font-black tracking-tight">Official Digital Receipt</h4>
                                </div>
                                <button onClick={() => setSelectedReceipt(null)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06]">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Print Receipt Card Container */}
                            <div
                                id="mobilis-printable-receipt-card"
                                className={`bg-white text-slate-900 rounded-3xl p-6 text-left shadow-lg relative border-2 mb-6 overflow-hidden ${
                                    role === 'superadmin' ? 'border-rose-400' :
                                    role === 'admin' || role === 'cooperative' ? 'border-violet-400' :
                                    role === 'driver' ? 'border-cyan-400' : 'border-emerald-400'
                                }`}
                            >
                                {/* Official Receipt Watermark Stamp with Mobilis Logo */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.06] rotate-[-22deg] z-0">
                                    <div className="text-center font-mono font-black border-4 border-slate-900 p-4 rounded-3xl flex flex-col items-center gap-1">
                                        <MobilisLogo size={42} showText={false} />
                                        <p className="text-3xl tracking-widest text-slate-900">MOBILIS VERIFIED</p>
                                        <p className="text-[10px] tracking-widest text-slate-800">STELLAR TESTNET LEDGER</p>
                                    </div>
                                </div>

                                {/* Official Receipt Top Header with Mobilis Logo */}
                                <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-200 z-10 relative">
                                    <div className="flex items-center gap-2">
                                        <MobilisLogo size={32} showText={true} textClassName="text-slate-900 font-black text-base tracking-tight" />
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-[10px] font-mono font-bold uppercase ${accentStyle}`}>OFFICIAL BLOCKCHAIN RECEIPT</p>
                                        <p className="text-[9px] text-slate-400 font-mono font-semibold">Stellar Soroban Proof</p>
                                    </div>
                                </div>

                                <div className="py-4 space-y-2 text-xs font-mono z-10 relative">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">Tx Hash:</span>
                                        <span className="font-mono font-bold text-slate-900 truncate max-w-[180px]">
                                            {selectedReceipt.txHash ? selectedReceipt.txHash.toUpperCase() : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">Date & Time:</span>
                                        <span className="font-mono text-slate-900">
                                            {new Date(selectedReceipt.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-slate-500 font-medium">Sender:</span>
                                        <div className="text-right">
                                            <span className="font-bold text-slate-900 block">{selectedReceipt.senderName}</span>
                                            {selectedReceipt.senderKey && (
                                                <span className="font-mono text-[9px] text-cyan-600 font-bold block truncate max-w-[180px]">
                                                    🔑 {selectedReceipt.senderKey}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-slate-500 font-medium">Recipient:</span>
                                        <div className="text-right">
                                            <span className="font-bold text-slate-900 block">{selectedReceipt.receiverName}</span>
                                            {selectedReceipt.receiverKey && (
                                                <span className="font-mono text-[9px] text-cyan-600 font-bold block truncate max-w-[180px]">
                                                    🔑 {selectedReceipt.receiverKey}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">Fleet / TODA:</span>
                                        <span className="font-mono text-slate-800">{selectedReceipt.plateNumber} ({selectedReceipt.coopName})</span>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-baseline">
                                        <span className="text-xs font-bold text-slate-700">TOTAL SETTLEMENT</span>
                                        <div className="text-right">
                                            {(() => {
                                                const rAmt = extractTxAmount(selectedReceipt);
                                                const outgoing = isTxOutgoing(selectedReceipt, role, activePubKey);
                                                const sign = outgoing ? '-' : '+';
                                                const textColor = outgoing ? 'text-rose-600 font-bold' : accentStyle;
                                                return (
                                                    <>
                                                        <span className={`text-2xl font-black block ${textColor}`}>
                                                            {sign}{'\u20B1'}{rAmt.php} PHP
                                                        </span>
                                                        <span className="text-[10px] font-mono text-slate-500 font-bold block">
                                                            ({sign}{rAmt.xlm} XLM)
                                                        </span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-dashed border-slate-300 text-center z-10 relative">
                                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                                        VERIFIED ON STELLAR TESTNET BLOCKCHAIN
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons - Hidden on Print */}
                            <div className="flex gap-2 font-mono no-print">
                                <button
                                    onClick={() => handleCopyHash(selectedReceipt.txHash)}
                                    className="flex-1 py-3.5 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-900 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-white/[0.06] transition-all"
                                >
                                    {copiedHash ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    {copiedHash ? 'Copied Hash!' : 'Copy Hash'}
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="py-3.5 px-5 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-900 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-white/[0.06] transition-all"
                                >
                                    <Printer className="w-4 h-4" /> Print
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default HistoryTab;