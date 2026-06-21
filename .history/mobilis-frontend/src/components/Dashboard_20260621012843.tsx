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
import { LogOut, CheckCircle2, Wallet, Zap, Clock, Sun, Moon, Key, LayoutDashboard, Eye, EyeOff, Copy, Fuel, AlertTriangle } from 'lucide-react';
import type { UserData } from '../types';

const CONTRACT_ID = "CBISDWPNY3WIUJALZQOGTEOJWSGOI4TIUYWOLMPRMZ5FHVW57FHOV545";
const RPC_SERVER = "https://soroban-testnet.stellar.org";

const Dashboard: React.FC = () => {
    const { stellarData } = useAuth();

    // App State
    const [activeTab, setActiveTab] = useState<'hub' | 'vault'>('hub');
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    });
    const [showSecret, setShowSecret] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [debtState, setDebtState] = useState(0);

    // Admin State
    const [pendingUsers, setPendingUsers] = useState<UserData[]>([]);
    const [isFetching, setIsFetching] = useState(false);

    // Apply Theme to Document
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // Admin: Fetch Pending Users
    useEffect(() => {
        const fetchPendingAccounts = async () => {
            if (!stellarData || (stellarData.role !== 'superadmin' && stellarData.role !== 'admin')) return;
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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    if (!stellarData) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#060610] flex items-center justify-center transition-colors duration-300">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 dark:text-gray-400 tracking-widest text-sm uppercase font-bold">Syncing Node</p>
                </div>
            </div>
        );
    }

    if (stellarData.status === 'pending') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#060610] flex items-center justify-center p-4 transition-colors duration-300">
                <div className="w-full max-w-md bg-white dark:bg-[#0a0a14] border border-gray-200 dark:border-orange-500/20 rounded-[2rem] p-8 text-center shadow-xl dark:shadow-[0_0_40px_rgba(249,115,22,0.1)] transition-colors duration-300">
                    <Clock className="w-16 h-16 text-orange-400 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Verification Pending</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">Your decentralized identity has been created. Awaiting TODA admin signature to activate your node.</p>
                    <button onClick={() => signOut(auth)} className="px-6 py-3 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-sm font-bold">
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    // Determine if the user is an admin for rendering logic
    const isAdmin = stellarData.role === 'superadmin' || stellarData.role === 'admin';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#060610] text-gray-900 dark:text-white font-sans transition-colors duration-300 flex flex-col">

            {/* Top Navigation Bar */}
            <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#060610]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 transition-colors duration-300">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

                    {/* Brand */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center shadow-sm dark:shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                            <Fuel className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-black text-xl tracking-widest hidden sm:block">MOBILIS</span>
                    </div>

                    {/* Center Tabs */}
                    <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-white/10">
                        <button
                            onClick={() => setActiveTab('hub')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'hub' ? 'bg-white dark:bg-[#1a1a24] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span className="hidden sm:block">Control Hub</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('vault')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'vault' ? 'bg-white dark:bg-[#1a1a24] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <Key className="w-4 h-4" />
                            <span className="hidden sm:block">Vault</span>
                        </button>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button onClick={toggleTheme} className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/30 transition-all text-sm font-bold">
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:block">Disconnect</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-8 flex flex-col items-center">

                {activeTab === 'hub' ? (
                    // HUB TAB
                    <div className="w-full flex flex-col items-center">
                        {isAdmin ? (
                            /* Admin View */
                            <div className="w-full">
                                <div className="mb-8">
                                    <p className="text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-1">Administrative Node</p>
                                    <h2 className="text-3xl font-black text-gray-900 dark:text-white">{stellarData.role === 'admin' ? stellarData.coopName : 'Global Network'}</h2>
                                </div>
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-gray-900 dark:text-white">
                                    {stellarData.role === 'admin' ? 'Pending Driver Nodes' : 'Pending Cooperatives'}
                                    <span className="px-3 py-1 bg-gray-200 dark:bg-white/10 rounded-full text-xs font-mono text-gray-700 dark:text-white">{pendingUsers.length}</span>
                                </h3>

                                {isFetching ? (
                                    <div className="text-gray-500 dark:text-gray-400 font-mono text-sm animate-pulse">Scanning ledger for requests...</div>
                                ) : pendingUsers.length === 0 ? (
                                    <div className="w-full p-12 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl text-center shadow-sm">
                                        <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">Network clear. No pending applications.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {pendingUsers.map((user) => (
                                            <div key={user.uid} className="bg-white dark:bg-[#0a0a14] border border-gray-200 dark:border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-colors">
                                                <div className="mb-6">
                                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{stellarData.role === 'admin' ? user.fullName : user.coopName}</h4>
                                                    <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400 font-mono">
                                                        <p>{stellarData.role === 'admin' ? `PLATE: ${user.plateNumber}` : `CONTACT: ${user.contactPerson}`}</p>
                                                        <p>{stellarData.role === 'admin' ? `TEL: ${user.phone}` : `REG: ${user.registrationNumber}`}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleApprove(user.uid)} className="w-full py-3 bg-gray-900 text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-emerald-500 dark:hover:bg-emerald-400 transition-colors">
                                                    Sign & Approve
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Driver View */
                            <div className="w-full max-w-lg flex flex-col gap-4">
                                {/* Wallet Info Card */}
                                <div className="bg-white dark:bg-[#0a0a14] border border-gray-200 dark:border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden transition-colors duration-300">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none" />
                                    <div className="flex items-center gap-3 mb-4 relative z-10">
                                        <Wallet className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Connected Wallet</p>
                                    </div>
                                    <p className="font-mono text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-all bg-gray-100 dark:bg-black/40 p-4 rounded-xl border border-gray-200 dark:border-white/5 relative z-10">
                                        {stellarData.publicKey}
                                    </p>
                                </div>

                                {/* Status Card */}
                                <div className={`border rounded-[2rem] p-8 text-center shadow-lg transition-colors duration-500 ${debtState === 0 ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20'}`}>
                                    <h3 className="text-sm font-bold tracking-widest uppercase mb-2 text-gray-500 dark:text-gray-400">Current Status</h3>
                                    {debtState === 0 ? (
                                        <div>
                                            <div className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 mb-2">Cleared</div>
                                            <p className="text-emerald-700 dark:text-emerald-500/80 font-medium">Eligible for Flash Advance</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="text-4xl sm:text-5xl font-black text-red-600 dark:text-red-400 mb-2">{debtState} USDC</div>
                                            <p className="text-red-700 dark:text-red-500/80 font-medium">Active Debt Remaining</p>
                                        </div>
                                    )}
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={handleRequestAdvance}
                                    disabled={isProcessing || debtState > 0}
                                    className={`w-full py-5 mt-4 rounded-2xl font-black text-lg tracking-wide shadow-xl transition-all ${debtState > 0
                                        ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-white/5 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:scale-[1.02] active:scale-[0.98]'
                                        }`}
                                >
                                    {isProcessing ? "Broadcasting to Ledger..." : "Request 15 USDC Advance"}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    // VAULT TAB (Export Keys)
                    <div className="w-full max-w-2xl">
                        <div className="bg-white dark:bg-[#0a0a14] border border-gray-200 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-xl transition-colors duration-300">

                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Cryptographic Vault</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">Manage and export your decentralized identity.</p>

                            {/* Critical Warning */}
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-5 mb-8 flex gap-4 items-start">
                                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-red-700 dark:text-red-400 text-sm font-bold mb-1">Never share your Secret Key.</p>
                                    <p className="text-red-600/80 dark:text-red-400/80 text-xs leading-relaxed">
                                        Anyone with your secret key has full, unrestricted access to your funds. Mobilis administrators will <strong>never</strong> ask for this key.
                                    </p>
                                </div>
                            </div>

                            {/* Public Key Display */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-2">Public Key (Stellar Address)</label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-xs sm:text-sm text-gray-800 dark:text-gray-300 break-all">
                                        {stellarData.publicKey}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(stellarData.publicKey)}
                                        className="p-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                        title="Copy Public Key"
                                    >
                                        <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Secret Key Display */}
                            <div>
                                <label className="block text-xs font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase mb-2">Secret Key</label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-xs sm:text-sm text-gray-800 dark:text-gray-300 break-all select-none">
                                        {showSecret ? stellarData.secret : 'S•••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                                    </code>
                                    <button
                                        onClick={() => setShowSecret(!showSecret)}
                                        className="p-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                        title={showSecret ? "Hide Secret Key" : "Reveal Secret Key"}
                                    >
                                        {showSecret ? <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                                    </button>
                                    <button
                                        onClick={() => copyToClipboard(stellarData.secret)}
                                        className="p-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                        title="Copy Secret Key"
                                    >
                                        <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;