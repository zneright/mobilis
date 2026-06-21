// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import {
    Keypair,
    Networks,
    TransactionBuilder,
    Contract,
    rpc,
    nativeToScVal
} from '@stellar/stellar-sdk';
import { LogOut, CheckCircle2, Wallet, Zap, Clock } from 'lucide-react';
import type { UserData } from '../types';

const CONTRACT_ID = "CBISDWPNY3WIUJALZQOGTEOJWSGOI4TIUYWOLMPRMZ5FHVW57FHOV545";
const RPC_SERVER = "https://soroban-testnet.stellar.org";

const Dashboard: React.FC = () => {
    const { stellarData } = useAuth();

    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [debtState, setDebtState] = useState<number>(0);
    const [pendingUsers, setPendingUsers] = useState<UserData[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    useEffect(() => {
        const fetchPendingAccounts = async () => {
            if (!stellarData) return;
            if (stellarData.role === 'superadmin' || stellarData.role === 'admin') {
                setIsFetching(true);
                try {
                    let q = stellarData.role === 'superadmin'
                        ? query(collection(db, 'users'), where('role', '==', 'admin'), where('status', '==', 'pending'))
                        : query(collection(db, 'users'), where('role', '==', 'driver'), where('status', '==', 'pending'), where('todaAffiliation', '==', stellarData.coopName));

                    const querySnapshot = await getDocs(q);
                    const users: UserData[] = [];
                    querySnapshot.forEach((doc) => users.push(doc.data() as UserData));
                    setPendingUsers(users);
                } catch (error) {
                    console.error("Error fetching pending accounts:", error);
                } finally {
                    setIsFetching(false);
                }
            }
        };
        fetchPendingAccounts();
    }, [stellarData]);

    const handleApprove = async (uid: string) => {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, { status: 'approved' });
            setPendingUsers(prev => prev.filter(user => user.uid !== uid));
            alert("Account approved successfully!");
        } catch (error) {
            alert("Failed to approve account.");
        }
    };

    const handleRequestAdvance = async () => {
        if (!stellarData || !stellarData.secret) return;
        setIsProcessing(true);

        try {
            const server = new rpc.Server(RPC_SERVER);
            const sourceKeypair = Keypair.fromSecret(stellarData.secret);
            const account = await server.getAccount(sourceKeypair.publicKey());
            const contract = new Contract(CONTRACT_ID);
            const advanceAmount = 150000000;

            let tx = new TransactionBuilder(account, {
                fee: "10000",
                networkPassphrase: Networks.TESTNET,
            })
                .addOperation(
                    contract.call(
                        "request_advance",
                        nativeToScVal(sourceKeypair.publicKey(), { type: 'address' }),
                        nativeToScVal(advanceAmount, { type: 'i128' })
                    )
                )
                .setTimeout(30)
                .build();

            const preparedTx = await server.prepareTransaction(tx);
            preparedTx.sign(sourceKeypair);
            const response = await server.sendTransaction(preparedTx);

            if (response.status === "ERROR") throw new Error("Transaction submission failed");

            let txResult = await server.getTransaction(response.hash);
            while (txResult.status === "NOT_FOUND" || txResult.status === "PENDING") {
                await new Promise(resolve => setTimeout(resolve, 2000));
                txResult = await server.getTransaction(response.hash);
            }

            if (txResult.status === "SUCCESS") {
                setDebtState(15);
                alert("Success! 15 USDC fuel advance confirmed.");
            } else {
                throw new Error(`Transaction failed: ${txResult.status}`);
            }

        } catch (error) {
            console.error(error);
            alert("Failed to process advance. Ensure TODA Treasury has funds and you have no active loan.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!stellarData) {
        return (
            <div className="min-h-screen bg-[#060610] flex items-center justify-center text-white">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 tracking-widest text-sm uppercase font-bold">Syncing Node</p>
                </div>
            </div>
        );
    }

    if (stellarData.status === 'pending') {
        return (
            <div className="min-h-screen bg-[#060610] flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#0a0a14] border border-orange-500/20 rounded-[2rem] p-8 text-center shadow-[0_0_40px_rgba(249,115,22,0.1)]">
                    <Clock className="w-16 h-16 text-orange-400 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-white mb-2">Verification Pending</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">Your decentralized identity has been created. Awaiting TODA admin signature to activate your node.</p>
                    <button onClick={() => signOut(auth)} className="px-6 py-3 border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors text-sm font-bold">
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    // --- VIEW: ADMIN / SUPERADMIN ---
    if (stellarData.role === 'superadmin' || stellarData.role === 'admin') {
        const isAdmin = stellarData.role === 'admin';
        return (
            <div className="min-h-screen bg-[#060610] text-white p-4 sm:p-8 font-sans">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-6 border-b border-white/10">
                        <div>
                            <p className="text-xs font-bold tracking-widest text-emerald-400 uppercase mb-1">Command Center</p>
                            <h2 className="text-3xl font-black">{isAdmin ? stellarData.coopName : 'Global Network'}</h2>
                        </div>
                        <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all text-sm font-bold">
                            <LogOut className="w-4 h-4" /> Disconnect
                        </button>
                    </div>

                    {/* Pending Approvals Section */}
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                        {isAdmin ? 'Pending Driver Nodes' : 'Pending Cooperatives'}
                        <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono">{pendingUsers.length}</span>
                    </h3>

                    {isFetching ? (
                        <div className="text-gray-500 font-mono text-sm animate-pulse">Scanning ledger for requests...</div>
                    ) : pendingUsers.length === 0 ? (
                        <div className="w-full p-12 bg-white/5 border border-white/10 rounded-3xl text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">Network clear. No pending applications.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingUsers.map((user) => (
                                <div key={user.uid} className="bg-[#0a0a14] border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-white/20 transition-colors">
                                    <div className="mb-6">
                                        <h4 className="text-lg font-bold text-white mb-2">{isAdmin ? user.fullName : user.coopName}</h4>
                                        <div className="space-y-1 text-sm text-gray-400 font-mono">
                                            <p>{isAdmin ? `PLATE: ${user.plateNumber}` : `CONTACT: ${user.contactPerson}`}</p>
                                            <p>{isAdmin ? `TEL: ${user.phone}` : `REG: ${user.registrationNumber}`}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleApprove(user.uid)} className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors">
                                        Sign & Approve
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- VIEW: DRIVER ---
    return (
        <div className="min-h-screen bg-[#060610] text-white p-4 sm:p-8 font-sans flex flex-col items-center">

            {/* Header */}
            <div className="w-full max-w-lg flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center">
                        <Zap className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg leading-tight">Driver Hub</h2>
                        <p className="text-xs text-gray-500 font-mono uppercase">Online</p>
                    </div>
                </div>
                <button onClick={() => signOut(auth)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                    <LogOut className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            <div className="w-full max-w-lg flex flex-col gap-4 mb-32 md:mb-0">

                {/* Wallet Info Card */}
                <div className="bg-[#0a0a14] border border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none" />
                    <div className="flex items-center gap-3 mb-4">
                        <Wallet className="w-5 h-5 text-blue-400" />
                        <p className="text-sm font-bold text-gray-300">Decentralized Wallet</p>
                    </div>
                    <p className="font-mono text-xs sm:text-sm text-gray-400 break-all bg-black/40 p-4 rounded-xl border border-white/5">
                        {stellarData.publicKey}
                    </p>
                </div>

                {/* Status Card */}
                <div className={`border rounded-[2rem] p-8 text-center shadow-2xl transition-colors duration-500 ${debtState === 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <h3 className="text-sm font-bold tracking-widest uppercase mb-2 text-gray-400">Current Status</h3>
                    {debtState === 0 ? (
                        <div>
                            <div className="text-4xl sm:text-5xl font-black text-emerald-400 mb-2">Cleared</div>
                            <p className="text-emerald-500/80 font-medium">Eligible for Flash Advance</p>
                        </div>
                    ) : (
                        <div>
                            <div className="text-4xl sm:text-5xl font-black text-red-400 mb-2">{debtState} USDC</div>
                            <p className="text-red-500/80 font-medium">Active Debt Remaining</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Button - Sticky Bottom on Mobile, Flow on Desktop */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#060610] via-[#060610] to-transparent md:static md:p-0 md:bg-none w-full max-w-lg md:mt-4 z-50">
                <button
                    onClick={handleRequestAdvance}
                    disabled={isProcessing || debtState > 0}
                    className={`w-full py-5 rounded-2xl font-black text-lg tracking-wide shadow-2xl transition-all ${debtState > 0
                            ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                >
                    {isProcessing ? "Broadcasting to Ledger..." : "Request 15 USDC Advance"}
                </button>
            </div>

        </div>
    );
};

export default Dashboard;