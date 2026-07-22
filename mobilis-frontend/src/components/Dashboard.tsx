import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import {
    Keypair,
    Networks,
    TransactionBuilder,
    Contract,
    rpc,
    nativeToScVal,
    scValToNative,
    Operation,
    Asset,
    xdr,
    Transaction
} from '@stellar/stellar-sdk';
import { requestAccess, signTransaction, isConnected, isAllowed } from '@stellar/freighter-api';
import { Copy, ArrowUpRight, X, Wallet, Zap, Bell, Radio, ShieldCheck, Megaphone, Navigation, CheckCircle2 } from 'lucide-react';
import { cardRoleStyle, roleCtaBg, rolePill, roleAccentText, roleShellBg } from './tabs/roleStyleTokens';
import Header from './Header';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';

import HubTab from './tabs/HubTab';
import VaultTab from './tabs/VaultTab';
import HistoryTab from './tabs/HistoryTab';
import ProfileTab from './tabs/ProfileTab';

import { CommuterRadar } from './commuter/CommuterRadar';
import { DriverDutyToggle } from './driver/DriverDutyToggle';
import { DriverOperationsMap } from './driver/DriverOperationsMap';
import MobilisLoader from './common/MobilisLoader';
import { playDoubleChime } from '../utils/webAudio';
import { setupFcmNotifications } from '../services/fcm';

declare global {
    interface Window {
        lobstr: unknown;
    }
}

type LobstrExtension = {
    requestAccess: () => Promise<string>;
    signTransaction: (xdr: string, network: string) => Promise<string>;
};

interface AssetBalance {
    asset_type: string;
    asset_code?: string;
    balance: string;
}

interface FirebaseTx {
    id: string;
    timestamp: string;
    [key: string]: unknown;
}

type AppUserData = {
    uid?: string;
    role?: string;
    secret?: string;
    fullName?: string;
    plateNumber?: string;
    coopName?: string;
    todaAffiliation?: string;
    status?: string;
    [key: string]: unknown;
};

// PUT YOUR CONTRACT ID HERE
const CONTRACT_ID = "CAVFLXBG4MXGTGECI6WAZXMDNX2H3UWFTMNY4DHK2MR4YUYEEU5STBID";
const PHP_EXCHANGE_RATE = 60.69;

const Dashboard: React.FC = () => {
    const { stellarData } = useAuth();

    const [activeTab, setActiveTab] = useState<'hub' | 'vault' | 'history' | 'profile'>('hub');
    const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark');

    // SYNCHRONIZE LIGHT MODE / DARK MODE WITH HTML ROOT CLASS & LOCAL STORAGE
    useEffect(() => {
        localStorage.setItem('theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);
    const [currencyMode, setCurrencyMode] = useState<'XLM' | 'PHP'>('XLM');

    const appNetwork = 'TESTNET';
    const HORIZON_SERVER = "https://horizon-testnet.stellar.org";
    const RPC_SERVER = "https://soroban-testnet.stellar.org";
    const NETWORK_PASSPHRASE = Networks.TESTNET;

    const [externalWallet, setExternalWallet] = useState<string | null>(null);
    const activePubKey = externalWallet || stellarData?.publicKey;

    const [isProcessing, setIsProcessing] = useState(false);
    const [debtState, setDebtState] = useState<number>(0);
    const [xlmBalance, setXlmBalance] = useState<string>('0.00');
    const [assetBalances, setAssetBalances] = useState<AssetBalance[]>([]);
    const [firebaseHistory, setFirebaseTxHistory] = useState<FirebaseTx[]>([]);
    const [treasuryBalance, setTreasuryBalance] = useState<string>('0.00');
    const [borrowLimit, setBorrowLimit] = useState<number>(15);

    const [showSendModal, setShowSendModal] = useState(false);
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [sendDest, setSendDest] = useState('');
    const [sendAmt, setSendAmt] = useState('');

    const [paymentToast, setPaymentToast] = useState<{
        title: string;
        message: string;
        amountXlm: string;
        amountPhp: string;
        isIncoming: boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tx: any;
    } | null>(null);

    // REAL-TIME BOTH-PARTY FARE PAYMENT NOTIFICATION LISTENER
    useEffect(() => {
        if (!stellarData?.uid) return;

        // Register FCM Push Token
        setupFcmNotifications(stellarData.uid);

        let isInitial = true;
        const role = stellarData.role;

        let q;
        if (role === 'commuter') {
            q = query(collection(db, 'fare_transactions'), where('commuterId', '==', stellarData.uid));
        } else if (role === 'driver') {
            q = query(collection(db, 'fare_transactions'), where('driverId', '==', stellarData.uid));
        } else {
            q = query(collection(db, 'fare_transactions'));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (isInitial) {
                isInitial = false;
                return;
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const numXlm = parseFloat(data.amount || '0').toFixed(4);
                    const numPhp = data.amountPhp || (parseFloat(data.amount || '0') * 60.69).toFixed(2);
                    const isIncoming = role === 'driver' || data.driverId === stellarData.uid;

                    // 1. Play Web Audio API double chime (GCash sound ping)
                    playDoubleChime();

                    // 2. Animated GCash-style in-app toast notification banner
                    setPaymentToast({
                        title: isIncoming ? '⚡ Payment Received!' : '⚡ Fare Payment Sent!',
                        message: isIncoming
                            ? `Received from ${data.commuterName || 'Commuter'}`
                            : `Paid to ${data.driverName || 'Driver'} (${data.plateNumber || 'Mobilis Fleet'})`,
                        amountXlm: numXlm,
                        amountPhp: numPhp,
                        isIncoming,
                        tx: data,
                    });
                    setTimeout(() => setPaymentToast(null), 8000);

                    // 3. Native Browser Notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification(isIncoming ? '⚡ Payment Received!' : '⚡ Fare Sent!', {
                            body: isIncoming
                                ? `Received ₱${numPhp} PHP (${numXlm} XLM) from ${data.commuterName || 'Commuter'}`
                                : `Sent ₱${numPhp} PHP (${numXlm} XLM) to ${data.driverName || 'Driver'}`,
                            icon: '/favicon.svg',
                        });
                    }
                }
            });
        }, (err) => {
            console.warn('Firestore fare notification listener error:', err);
        });

        return () => unsubscribe();
    }, [stellarData]);

    const [broadcasts, setBroadcasts] = useState<{ id: string; title: string; message: string; senderName: string; timestamp: string }[]>([]);
    const [broadcastToast, setBroadcastToast] = useState<{ title: string; message: string; senderName: string } | null>(null);

    // Helper: Safely convert any Firestore field (Timestamp object, number, string, null) to ISO String
    const toIsoString = (ts: any): string => {
        if (!ts) return new Date().toISOString();
        if (typeof ts === 'string') return ts;
        if (typeof ts === 'number') return new Date(ts).toISOString();
        if (typeof ts === 'object') {
            if (typeof ts.toDate === 'function') {
                try {
                    return ts.toDate().toISOString();
                } catch {
                    return new Date().toISOString();
                }
            }
            if (typeof ts.seconds === 'number') {
                return new Date(ts.seconds * 1000).toISOString();
            }
        }
        return new Date().toISOString();
    };

    const formatNotifDate = (ts?: any) => {
        const iso = toIsoString(ts);
        try {
            const d = new Date(iso);
            return isNaN(d.getTime()) ? new Date().toLocaleString() : d.toLocaleString();
        } catch {
            return new Date().toLocaleString();
        }
    };

    // REAL-TIME RIDE & TRANSIT STATUS NOTIFICATION LISTENER
    const [rideNotifications, setRideNotifications] = useState<{
        id: string;
        type: 'ride';
        title: string;
        message: string;
        timestamp: string;
    }[]>([]);

    useEffect(() => {
        if (!stellarData?.uid) return;

        const role = stellarData.role;
        if (role !== 'commuter' && role !== 'driver') return;

        let isInitial = true;

        const q1 = query(collection(db, 'active_pickups'), where(role === 'commuter' ? 'commuterId' : 'driverId', '==', stellarData.uid));
        const q2 = query(collection(db, 'active_pickup_sessions'), where(role === 'commuter' ? 'commuterUid' : 'driverUid', '==', stellarData.uid));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleDocs = (snapshot: any) => {
            const list: {
                id: string;
                type: 'ride';
                title: string;
                message: string;
                timestamp: string;
            }[] = [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            snapshot.forEach((docSnap: any) => {
                const data = docSnap.data();
                if (!data) return;

                const status = data.status || 'waiting';
                const driverName = data.driverName || 'Driver';
                const commuterName = data.commuterName || 'Commuter';
                const plateNumber = data.plateNumber || 'Mobilis Fleet';
                const isoTime = toIsoString(data.updatedAt || data.timestamp || data.acceptedAt);

                if (status === 'approaching' || status === 'assigned' || status === 'accepted') {
                    list.push({
                        id: `ride-${docSnap.id}-approaching`,
                        type: 'ride',
                        title: '🚗 Driver Approaching',
                        message: role === 'commuter' ? `${driverName} (${plateNumber}) is approaching your pickup spot!` : `Approaching ${commuterName}...`,
                        timestamp: isoTime,
                    });
                } else if (status === 'arrived') {
                    list.push({
                        id: `ride-${docSnap.id}-arrived`,
                        type: 'ride',
                        title: '📍 Driver Arrived',
                        message: role === 'commuter' ? `${driverName} has arrived at your pickup location!` : `You arrived at ${commuterName}'s location.`,
                        timestamp: isoTime,
                    });
                } else if (status === 'picked_up' || status === 'on_transit') {
                    list.push({
                        id: `ride-${docSnap.id}-transit`,
                        type: 'ride',
                        title: '🛺 Commuter Picked Up',
                        message: `Trip in progress with ${role === 'commuter' ? driverName : commuterName}. En route!`,
                        timestamp: isoTime,
                    });
                } else if (status === 'completed') {
                    list.push({
                        id: `ride-${docSnap.id}-completed`,
                        type: 'ride',
                        title: '🏁 Trip Completed',
                        message: `Trip successfully completed with ${role === 'commuter' ? driverName : commuterName}.`,
                        timestamp: isoTime,
                    });
                }
            });

            setRideNotifications(list);

            if (!isInitial && snapshot.docChanges().some((c: { type: string }) => c.type === 'added' || c.type === 'modified')) {
                playDoubleChime();
            }
            isInitial = false;
        };

        const unsub1 = onSnapshot(q1, handleDocs, (err) => console.warn("active_pickups listener note:", err));
        const unsub2 = onSnapshot(q2, handleDocs, (err) => console.warn("active_pickup_sessions listener note:", err));

        return () => {
            unsub1();
            unsub2();
        };
    }, [stellarData]);

    // REAL-TIME SYSTEM BROADCAST NOTIFICATION LISTENER
    useEffect(() => {
        if (!stellarData?.uid) return;

        let isInitial = true;
        const q = query(collection(db, 'system_notifications'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: { id: string; title: string; message: string; senderName: string; timestamp: string }[] = [];
            
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const targetRole = data.targetRole;
                const targetCoop = data.targetCoop;
                const userRole = stellarData.role;
                const userCoop = stellarData.todaAffiliation || stellarData.coopName;

                const isTarget = 
                    targetRole === 'all' ||
                    targetRole === userRole ||
                    (targetCoop && targetCoop === userCoop) ||
                    data.targetUid === stellarData.uid;

                if (isTarget) {
                    list.push({
                        id: docSnap.id,
                        title: data.title || 'Announcement',
                        message: data.message || '',
                        senderName: data.senderName || 'Admin',
                        timestamp: toIsoString(data.timestamp)
                    });
                }
            });

            list.sort((a, b) => new Date(toIsoString(b.timestamp)).getTime() - new Date(toIsoString(a.timestamp)).getTime());
            setBroadcasts(list);

            if (!isInitial && list.length > 0) {
                const newest = list[0];
                playDoubleChime();
                setBroadcastToast({ title: newest.title, message: newest.message, senderName: newest.senderName });
                setTimeout(() => setBroadcastToast(null), 7000);
            }
            isInitial = false;
        }, (err) => {
            console.warn("System notifications listener warning:", err);
        });

        return () => unsubscribe();
    }, [stellarData]);

    // REAL-TIME FIRESTORE PERSISTENT NOTIFICATIONS LISTENER
    const [firestoreNotifications, setFirestoreNotifications] = useState<{
        id: string;
        type: 'fare' | 'broadcast' | 'ride' | 'system';
        title: string;
        message: string;
        timestamp: string;
        amountPhp?: string;
        amountXlm?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        txData?: any;
    }[]>([]);

    useEffect(() => {
        if (!stellarData?.uid) return;

        const q = query(
            collection(db, 'notifications'),
            where('recipientUid', '==', stellarData.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: {
                id: string;
                type: 'fare' | 'broadcast' | 'ride' | 'system';
                title: string;
                message: string;
                timestamp: string;
                amountPhp?: string;
                amountXlm?: string;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                txData?: any;
            }[] = [];

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                list.push({
                    id: docSnap.id,
                    type: data.type || 'system',
                    title: data.title || 'Notification',
                    message: data.message || '',
                    timestamp: toIsoString(data.timestamp),
                    amountPhp: data.amountPhp,
                    amountXlm: data.amountXlm,
                    txData: data.txData,
                });
            });

            setFirestoreNotifications(list);
        }, (err) => {
            console.warn("Firestore notifications collection note:", err);
        });

        return () => unsubscribe();
    }, [stellarData]);

    // Notification Read State & Auto-Clear Unread Dot
    const [readIds, setReadIds] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('mobilis_read_notifs');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch {
            return new Set();
        }
    });

    const [notifCategory, setNotifCategory] = useState<'all' | 'fare' | 'broadcast' | 'ride' | 'system'>('all');

    // Consolidated Dynamic Notification Feed (STRICTLY RECENT AT TOP)
    const allNotifications = useMemo(() => {
        const notifMap = new Map<string, {
            id: string;
            type: 'fare' | 'broadcast' | 'ride' | 'system';
            title: string;
            message: string;
            timestamp: string;
            amountPhp?: string;
            amountXlm?: string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            txData?: any;
        }>();

        // 1. Direct Firestore Notifications (Persistent)
        firestoreNotifications.forEach((fn) => {
            notifMap.set(fn.id, fn);
        });

        // 2. System Broadcasts (Admin Announcements)
        broadcasts.forEach((b) => {
            if (!notifMap.has(b.id)) {
                notifMap.set(b.id, {
                    id: b.id,
                    type: 'broadcast',
                    title: b.title || '📢 System Broadcast',
                    message: b.message || '',
                    timestamp: toIsoString(b.timestamp),
                });
            }
        });

        // 3. Live Ride Status Events (Approaching, Arrived, Picked Up, Completed)
        rideNotifications.forEach((r) => {
            if (!notifMap.has(r.id)) {
                notifMap.set(r.id, r);
            }
        });

        // 4. Fare Payments & Soroban Contract Transactions (from History)
        firebaseHistory.forEach((f) => {
            const id = f.id || f.txHash || `tx-${f.timestamp}`;
            if (!notifMap.has(id)) {
                const numXlm = parseFloat(f.amount || f.amountSettled || '0').toFixed(4);
                const numPhp = f.amountPhp || (parseFloat(f.amount || f.amountSettled || '0') * 60.69).toFixed(2);
                const isIncoming = stellarData?.role === 'driver' || f.driverId === stellarData?.uid;

                notifMap.set(id, {
                    id,
                    type: 'fare',
                    title: isIncoming ? '⚡ Payment Received' : '⚡ Fare Payment Sent',
                    message: isIncoming
                        ? `Received from ${f.commuterName || f.senderName || 'Commuter'}`
                        : `Paid to ${f.driverName || f.receiverName || 'Driver'}`,
                    timestamp: toIsoString(f.timestamp),
                    amountPhp: numPhp,
                    amountXlm: numXlm,
                    txData: f,
                });
            }
        });

        // 5. System Default Badges
        if (!notifMap.has('sys-stellar-conn')) {
            notifMap.set('sys-stellar-conn', {
                id: 'sys-stellar-conn',
                type: 'system',
                title: '⚡ Stellar Testnet Synchronized',
                message: 'Web3 Keypair connected to Stellar Horizon RPC.',
                timestamp: new Date().toISOString(),
            });
        }

        // Convert Map to Array and SORT STRICTLY BY TIMESTAMP DESCENDING (Most Recent at Top!)
        const list = Array.from(notifMap.values());
        return list.sort((a, b) => {
            const timeA = new Date(toIsoString(a.timestamp)).getTime();
            const timeB = new Date(toIsoString(b.timestamp)).getTime();
            const validA = isNaN(timeA) ? 0 : timeA;
            const validB = isNaN(timeB) ? 0 : timeB;
            return validB - validA;
        });
    }, [firestoreNotifications, broadcasts, rideNotifications, firebaseHistory, stellarData]);

    // Filtered Notifications based on category tab
    const filteredNotifications = useMemo(() => {
        return allNotifications.filter((n) => {
            if (notifCategory === 'fare') return n.type === 'fare';
            if (notifCategory === 'broadcast' || notifCategory === 'system') return n.type === 'broadcast' || n.type === 'system';
            if (notifCategory === 'ride') return n.type === 'ride';
            return true;
        });
    }, [allNotifications, notifCategory]);

    // Unread Count for Red Dot Badge
    const unreadNotificationCount = useMemo(() => {
        return allNotifications.filter((n) => !readIds.has(n.id)).length;
    }, [allNotifications, readIds]);

    const markAllNotificationsAsRead = () => {
        const newSet = new Set(readIds);
        allNotifications.forEach((n) => newSet.add(n.id));
        setReadIds(newSet);
        try {
            localStorage.setItem('mobilis_read_notifs', JSON.stringify(Array.from(newSet)));
        } catch (e) {
            console.warn("LocalStorage save note:", e);
        }
    };

    const handleOpenNotifications = () => {
        markAllNotificationsAsRead();
        setShowNotificationModal(true);
    };

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const checkAutoConnect = async () => {
            const connectedWallet = localStorage.getItem('externalWalletConnected');
            try {
                if (connectedWallet === 'Freighter' && await isConnected() && await isAllowed()) {
                    const pubKey = await requestAccess();
                    setExternalWallet(typeof pubKey === 'string' ? pubKey : (pubKey as { address: string }).address);
                } else if (connectedWallet === 'LOBSTR' && window.lobstr) {
                    const lobstrExt = window.lobstr as LobstrExtension;
                    const pubKey = await lobstrExt.requestAccess();
                    setExternalWallet(pubKey);
                }
            } catch (e) {
                console.error("[Dashboard] Auto-connect failed.", e);
            }
        };
        checkAutoConnect();
    }, []);

    const fetchLedgerData = async () => {
        if (!activePubKey) return;

        try {
            const res = await fetch(`${HORIZON_SERVER}/accounts/${activePubKey}`);
            if (res.ok) {
                const data = await res.json();
                if (data.balances) {
                    setAssetBalances(data.balances);
                    const native = data.balances.find((b: { asset_type: string, balance: string }) => b.asset_type === 'native');
                    if (native) {
                        setXlmBalance(parseFloat(native.balance).toFixed(2));
                        // Since physical funds live in the Admin wallet, 
                        // the Admin's balance IS the treasury balance
                        if (stellarData?.role === 'admin' || stellarData?.role === 'superadmin') {
                            setTreasuryBalance(parseFloat(native.balance).toFixed(2));
                        }
                    }
                }
            }
        } catch (err) {
            console.error("[Dashboard] Fetch balances failed:", err);
        }

        if (stellarData?.role === 'driver') {
            try {
                const server = new rpc.Server(RPC_SERVER);
                const contract = new Contract(CONTRACT_ID);

                const account = await server.getAccount(activePubKey);
                const tx = new TransactionBuilder(account, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
                    .addOperation(contract.call("get_debt", nativeToScVal(activePubKey, { type: 'address' })))
                    .setTimeout(30).build();

                const simulation = await server.simulateTransaction(tx);
                if (rpc.Api.isSimulationSuccess(simulation)) {
                    if (simulation.result && simulation.result.retval) {
                        const rawDebt = scValToNative(simulation.result.retval);
                        setDebtState(Number(rawDebt) / 10000000);
                    } else {
                        setDebtState(0);
                    }
                }
            } catch (error) {
                console.error("[Dashboard] Smart Contract Debt Simulation Error:", error);
            }
        }
    };

    const fetchFirebaseHistory = async () => {
        if (!stellarData) return;
        try {
            let q;
            if (stellarData.role === 'superadmin') {
                q = query(collection(db, 'transactions'));
            } else if (stellarData.role === 'admin') {
                q = query(collection(db, 'transactions'), where('coopName', '==', stellarData.coopName));
            } else {
                q = query(collection(db, 'transactions'), where('senderUid', '==', stellarData.uid));
            }
            const snapshot = await getDocs(q);
            const history: FirebaseTx[] = [];
            snapshot.forEach(docSnap => history.push({ id: docSnap.id, ...docSnap.data() } as FirebaseTx));
            history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setFirebaseTxHistory(history);
        } catch {
            setFirebaseTxHistory([]);
        }
    };

    const fetchCoopSettings = async () => {
        if (!stellarData) return;
        try {
            const coopName = stellarData.role === 'driver' ? stellarData.todaAffiliation : stellarData.coopName;
            if (!coopName) return;
            const q = query(collection(db, 'coop_settings'), where('coopName', '==', coopName));
            const snap = await getDocs(q);
            if (!snap.empty) {
                setBorrowLimit(snap.docs[0].data().borrowLimit || 15);
            }
        } catch {
            setBorrowLimit(15);
        }
    };

    useEffect(() => {
        const initData = async () => {
            await fetchLedgerData();
            await fetchFirebaseHistory();
            await fetchCoopSettings();
        };
        initData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePubKey, isProcessing, stellarData?.role]);

    const handleSetBorrowLimit = async (newLimit: number) => {
        if (!stellarData?.coopName) return;
        setIsProcessing(true);
        try {
            const q = query(collection(db, 'coop_settings'), where('coopName', '==', stellarData.coopName));
            const snap = await getDocs(q);
            if (snap.empty) {
                await addDoc(collection(db, 'coop_settings'), { coopName: stellarData.coopName, borrowLimit: newLimit });
            } else {
                await updateDoc(doc(db, 'coop_settings', snap.docs[0].id), { borrowLimit: newLimit });
            }
            setBorrowLimit(newLimit);
            alert(`Driver borrow limit successfully set to ${newLimit} XLM`);
        } catch {
            alert("Failed to update borrow limit in database.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFullSignOut = async () => {
        try {
            setExternalWallet(null);
            localStorage.removeItem('externalWalletConnected');
            await signOut(auth);
            window.location.reload();
        } catch {
            alert("An error occurred while logging out.");
        }
    };

    const executeWalletConnection = async (walletName: 'Freighter' | 'LOBSTR') => {
        setShowWalletModal(false);
        try {
            if (walletName === 'Freighter') {
                if (await isConnected()) {
                    const pubKey = await requestAccess();
                    setExternalWallet(typeof pubKey === 'string' ? pubKey : (pubKey as { address: string }).address);
                    localStorage.setItem('externalWalletConnected', 'Freighter');
                } else alert("Freighter extension is not installed or enabled.");
            } else if (walletName === 'LOBSTR') {
                if (window.lobstr) {
                    const lobstrExt = window.lobstr as LobstrExtension;
                    const pubKey = await lobstrExt.requestAccess();
                    setExternalWallet(pubKey);
                    localStorage.setItem('externalWalletConnected', 'LOBSTR');
                } else alert("LOBSTR extension is not installed.");
            }
        } catch {
            alert(`Connection to ${walletName} rejected or failed.`);
        }
    };

    const handleDisconnectWallet = () => {
        setExternalWallet(null);
        localStorage.removeItem('externalWalletConnected');
    };

    const signAndSubmitTx = async (server: rpc.Server, preparedTx: Transaction) => {
        const walletType = localStorage.getItem('externalWalletConnected');
        if (externalWallet && walletType === 'Freighter') {
            // @ts-expect-error network does not exist in type
            const { signedTxXdr, error } = await signTransaction(preparedTx.toXDR(), { network: appNetwork });
            if (error) throw new Error(`Freighter Signing Error: ${error}`);
            const txToSubmit = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
            return await server.sendTransaction(txToSubmit as Transaction);
        } else if (externalWallet && walletType === 'LOBSTR') {
            if (!window.lobstr) throw new Error("LOBSTR extension not found.");
            const lobstrExt = window.lobstr as LobstrExtension;
            const signedXdr = await lobstrExt.signTransaction(preparedTx.toXDR(), appNetwork);
            const txToSubmit = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
            return await server.sendTransaction(txToSubmit as Transaction);
        } else {
            const sourceKeypair = Keypair.fromSecret((stellarData as unknown as AppUserData).secret!);
            preparedTx.sign(sourceKeypair);
            return await server.sendTransaction(preparedTx);
        }
    };

    const executeContractCall = async (functionName: string, args: xdr.ScVal[]) => {
        if (!activePubKey) return;
        const server = new rpc.Server(RPC_SERVER);
        const account = await server.getAccount(activePubKey);
        const contract = new Contract(CONTRACT_ID);

        const tx = new TransactionBuilder(account, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE })
            .addOperation(contract.call(functionName, ...args))
            .setTimeout(30).build();

        const preparedTx = await server.prepareTransaction(tx);
        const response = await signAndSubmitTx(server, preparedTx as Transaction);

        if (response.status === "ERROR") throw new Error(`Transaction submission failed: ${JSON.stringify(response.errorResult)}`);

        let txResult = await server.getTransaction(response.hash);
        while (txResult.status === "NOT_FOUND" || txResult.status === ("PENDING" as string)) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            txResult = await server.getTransaction(response.hash);
        }

        if (txResult.status === "SUCCESS") return true;
        throw new Error(`On-chain execution reverted: ${txResult.status}`);
    };

    const handleSendXLM = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activePubKey) return;
        if (parseFloat(sendAmt) > parseFloat(xlmBalance)) {
            alert(`Transaction Blocked: Insufficient XLM.`);
            return;
        }
        setIsProcessing(true);
        try {
            const server = new rpc.Server(RPC_SERVER);
            const account = await server.getAccount(activePubKey);
            const tx = new TransactionBuilder(account, { fee: "1000", networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(Operation.payment({ destination: sendDest, asset: Asset.native(), amount: sendAmt }))
                .setTimeout(30).build();

            // Native payments do not need prepareTransaction
            const response = await signAndSubmitTx(server, tx as Transaction);
            if (response.status === "ERROR") throw new Error(`Submission failed: ${JSON.stringify(response.errorResult)}`);

            let txResult = await server.getTransaction(response.hash);
            while (txResult.status === "NOT_FOUND" || txResult.status === ("PENDING" as string)) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                txResult = await server.getTransaction(response.hash);
            }

            if (txResult.status === "SUCCESS") {
                await addDoc(collection(db, 'transactions'), {
                    txHash: response.hash,
                    senderUid: stellarData?.uid,
                    senderName: (stellarData as unknown as AppUserData)?.fullName || 'Node Operator',
                    plateNumber: (stellarData as unknown as AppUserData)?.plateNumber || 'N/A',
                    coopName: (stellarData as unknown as AppUserData)?.coopName || (stellarData as unknown as AppUserData)?.todaAffiliation || 'SuperAdmin HQ',
                    amount: sendAmt,
                    asset: 'XLM',
                    destination: sendDest,
                    network: appNetwork,
                    timestamp: new Date().toISOString()
                });
                alert(`Success! Sent ${sendAmt} XLM.`);
                setShowSendModal(false);
                setSendDest('');
                setSendAmt('');
                setTimeout(() => fetchLedgerData(), 3000);
            } else throw new Error("Execution failed on ledger.");
        } catch {
            alert(`Failed to send funds. Ensure your wallet extension is set to ${appNetwork}.`);
        } finally { setIsProcessing(false); }
    };

    // --- DRIVER: PHYSICAL XLM TRANSFER (FROM ADMIN) + SMART CONTRACT LOGGING ---
    const handleRequestAdvance = async (amount: number) => {
        if (!activePubKey) return;

        if (debtState > 0 && stellarData?.role === 'driver') {
            alert(`Request Blocked: You currently have a pending debt of ${debtState} XLM. Settle this before borrowing again.`);
            return;
        }
        if (amount > borrowLimit) {
            alert(`Request Blocked: The cooperative limit is ${borrowLimit} XLM.`);
            return;
        }

        setIsProcessing(true);

        try {
            const server = new rpc.Server(RPC_SERVER);

            console.log("Fetching Cooperative Secret Key from Database...");
            const coopName = (stellarData as unknown as AppUserData).todaAffiliation;
            const coopQuery = query(collection(db, 'users'), where('role', '==', 'admin'), where('coopName', '==', coopName));
            const coopSnap = await getDocs(coopQuery);

            if (coopSnap.empty) throw new Error("Cooperative admin account not found.");
            const coopData = coopSnap.docs[0].data();
            const coopSecret = coopData.secret;

            if (!coopSecret) throw new Error("Cooperative Secret Key is missing in Firestore.");

            console.log("Transferring physical XLM from Cooperative Wallet...");

            // 1. Physically transfer the funds from the Admin to the Driver
            const coopKeypair = Keypair.fromSecret(coopSecret);
            const coopAccount = await server.getAccount(coopKeypair.publicKey());

            const fundTxBuilder = new TransactionBuilder(coopAccount, { fee: "1000", networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(Operation.payment({
                    destination: activePubKey,
                    asset: Asset.native(),
                    amount: amount.toString()
                }))
                .setTimeout(30)
                .build();

            fundTxBuilder.sign(coopKeypair);
            const fundResponse = await server.sendTransaction(fundTxBuilder);
            if (fundResponse.status === "ERROR") throw new Error("Failed to transfer funds from Coop wallet.");

            let fundTxResult = await server.getTransaction(fundResponse.hash);
            while (fundTxResult.status === "NOT_FOUND" || fundTxResult.status === ("PENDING" as string)) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                fundTxResult = await server.getTransaction(fundResponse.hash);
            }

            console.log("Recording debt in Smart Contract Ledger...");

            // 2. Call the smart contract to update the Immutable Ledger
            await executeContractCall("request_advance", [
                nativeToScVal(activePubKey, { type: 'address' }),
                nativeToScVal(Math.floor(amount * 10000000).toString(), { type: 'i128' })
            ]);

            setDebtState(amount);

            // 3. Save History to Firebase
            await addDoc(collection(db, 'transactions'), {
                txHash: fundResponse.hash,
                senderUid: coopData.uid,
                senderName: coopData.coopName,
                coopName: coopData.coopName,
                plateNumber: (stellarData as unknown as AppUserData)?.plateNumber || 'N/A',
                amount: amount.toString(),
                asset: 'XLM',
                type: 'AUTO_LOAN_ADVANCE',
                destination: activePubKey,
                network: appNetwork,
                timestamp: new Date().toISOString()
            });

            alert(`Success! ${amount} XLM advance deposited directly from the Cooperative Wallet.`);
            setTimeout(() => fetchLedgerData(), 3000);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            console.error("Advance Failed:", e);
            alert(`Advance Failed: ${e.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- DRIVER: RETURN FUNDS DIRECTLY TO ADMIN + UPDATE LEDGER ---
    const handleSettleLoan = async () => {
        if (!activePubKey || debtState <= 0) return;
        setIsProcessing(true);

        try {
            const server = new rpc.Server(RPC_SERVER);

            // 1. Fetch Dynamic Keys for Routing
            const superadminQuery = query(collection(db, 'users'), where('role', '==', 'superadmin'));
            const superadminSnap = await getDocs(superadminQuery);
            if (superadminSnap.empty) throw new Error("Superadmin account not found.");
            const superadminPubKey = superadminSnap.docs[0].data().publicKey;

            const userAffiliation = (stellarData as unknown as AppUserData).todaAffiliation;
            const coopQuery = query(collection(db, 'users'), where('role', '==', 'admin'), where('coopName', '==', userAffiliation));
            const coopSnap = await getDocs(coopQuery);
            if (coopSnap.empty) throw new Error(`Cooperative account not found.`);
            const coopPubKey = coopSnap.docs[0].data().publicKey;

            // 2. Calculate Fees
            const totalToCoopAmount = (debtState * 1.003).toFixed(7).toString();
            const superadminFeeAmount = (debtState * 0.002).toFixed(7).toString();
            const totalFee = debtState * 0.005;

            console.log("Routing Principal & Fees back to Cooperative...");

            // 3. Physically send the XLM back to the Admin and Superadmin (NATIVE TRANSACTION)
            const account = await server.getAccount(activePubKey);
            const paymentTxBuilder = new TransactionBuilder(account, { fee: "1000", networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(Operation.payment({ destination: coopPubKey, asset: Asset.native(), amount: totalToCoopAmount }))
                .addOperation(Operation.payment({ destination: superadminPubKey, asset: Asset.native(), amount: superadminFeeAmount }))
                .setTimeout(30).build();

            // Native payments DO NOT need server.prepareTransaction()
            const paymentResponse = await signAndSubmitTx(server, paymentTxBuilder as Transaction);

            if (paymentResponse.status === "ERROR") throw new Error(`Payment failed. Ensure you have enough XLM to cover the 0.5% fee.`);

            let paymentTxResult = await server.getTransaction(paymentResponse.hash);
            while (paymentTxResult.status === "NOT_FOUND" || paymentTxResult.status === ("PENDING" as string)) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                paymentTxResult = await server.getTransaction(paymentResponse.hash);
            }

            console.log("Clearing Smart Contract Debt Ledger...");

            // 4. Update the Smart Contract to wipe the debt
            await executeContractCall("settle_loan", [
                nativeToScVal(activePubKey, { type: 'address' })
            ]);

            setDebtState(0);

            // 5. Update Firebase History
            await addDoc(collection(db, 'transactions'), {
                txHash: paymentResponse.hash,
                senderUid: stellarData?.uid,
                senderName: (stellarData as unknown as AppUserData)?.fullName || 'Node Operator',
                amountSettled: debtState.toString(),
                feePaid: totalFee.toString(),
                asset: 'XLM',
                type: 'SETTLEMENT_WITH_ROUTED_FEES',
                network: appNetwork,
                timestamp: new Date().toISOString()
            });

            alert(`Settlement Complete! Principal and fees routed directly back to the Cooperative Wallet.`);
            setTimeout(() => fetchLedgerData(), 3000);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            console.error("Settlement Failed:", e);
            alert(`Transaction Failed: ${e.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const formatCurrency = (amount: number | string) => {
        if (amount === undefined || amount === null || amount === '') return currencyMode === 'PHP' ? '₱ 0.00' : '0.00 XLM';
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return currencyMode === 'PHP' ? '₱ 0.00' : '0.00 XLM';
        if (currencyMode === 'PHP') return `₱ ${(num * PHP_EXCHANGE_RATE).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM`;
    };

    if (!stellarData) return <MobilisLoader message="Loading Node Profile..." />;

    if (stellarData.status === 'pending') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#060610] flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="w-full max-w-md bg-white dark:bg-[#0a0a14] border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-2xl">
                    <div className="w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">⏳</span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Node Pending Approval</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                        Your cryptographic keys have been generated, but your network access requires verification.
                        Please wait for {stellarData.role === 'admin' ? 'a Super Admin' : 'your Cooperative Admin'} to approve your registration.
                    </p>
                    <button
                        onClick={handleFullSignOut}
                        className="w-full py-4 bg-gray-900 text-white dark:bg-white dark:text-black font-black text-sm rounded-xl transition-all hover:bg-gray-800 dark:hover:bg-gray-200"
                    >
                        Sign Out Safely
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-screen w-full overflow-hidden relative flex font-sans ${roleShellBg(stellarData.role)}`}>
            
            {/* IN-APP REALTIME GCASH-STYLE PAYMENT TOAST ALERT */}
            {paymentToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-11/12 max-w-md animate-bounce font-mono">
                    <div className="p-4 bg-gradient-to-r from-[#0052FF] via-[#0066FF] to-[#00A3FF] text-white rounded-3xl shadow-2xl border-2 border-white/30 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl flex-shrink-0 border border-white/30">
                                ⚡
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-sm tracking-tight">{paymentToast.title}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-widest ${paymentToast.isIncoming ? 'bg-emerald-400 text-slate-950' : 'bg-rose-400 text-slate-950'}`}>
                                        {paymentToast.isIncoming ? '+RECEIVE' : '-SENT'}
                                    </span>
                                </div>
                                <p className="text-xs font-black text-white/90">
                                    {paymentToast.isIncoming ? '+' : '-'}{'\u20B1'}{paymentToast.amountPhp} PHP ({paymentToast.amountXlm} XLM)
                                </p>
                                <p className="text-[10px] text-white/70 truncate max-w-[190px]">{paymentToast.message}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                                onClick={() => {
                                    setActiveTab('history');
                                    setPaymentToast(null);
                                }}
                                className="px-3.5 py-2 bg-white text-[#0052FF] font-black text-xs rounded-2xl shadow-lg hover:bg-white/90 transition-all active:scale-95"
                            >
                                Receipt
                            </button>
                            <button onClick={() => setPaymentToast(null)} className="p-1 text-white/70 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* IN-APP REALTIME BROADCAST ANNOUNCEMENT TOAST */}
            {broadcastToast && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[90] max-w-md w-full p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-bounce ${cardRoleStyle(stellarData.role)}`}>
                    <div className={`flex items-center gap-2 text-xs font-mono font-bold ${roleAccentText(stellarData.role)}`}>
                        <Megaphone className="w-4 h-4 flex-shrink-0" />
                        <span>{broadcastToast.title}: {broadcastToast.message}</span>
                    </div>
                    <button onClick={() => setBroadcastToast(null)} className="p-1 hover:bg-black/10 rounded-lg text-slate-500 dark:text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role={stellarData.role} />
            <div className="flex-1 flex flex-col h-full overflow-y-auto relative pt-20 pb-28 sm:pb-32">
                <Header
                    theme={theme}
                    toggleTheme={() => setTheme(p => p === 'dark' ? 'light' : 'dark')}
                    onSignOut={handleFullSignOut}
                    onOpenNotifications={handleOpenNotifications}
                    unreadCount={unreadNotificationCount}
                    role={stellarData.role}
                />

                <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 flex flex-col items-center">

                    {activeTab === 'hub' && (
                        <div className="w-full max-w-4xl mx-auto space-y-6 py-2">
                            {stellarData.role === 'commuter' ? (
                                <CommuterRadar
                                    commuterData={stellarData}
                                    currencyMode={currencyMode}
                                    setCurrencyMode={setCurrencyMode}
                                    theme={theme}
                                />
                            ) : (
                                <>
                                    <HubTab
                                        stellarData={stellarData}
                                        isAdmin={stellarData.role === 'superadmin' || (stellarData.role as string) === 'admin' || (stellarData.role as string) === 'cooperative'}
                                        currencyMode={currencyMode}
                                        setCurrencyMode={setCurrencyMode}
                                        formatCurrency={formatCurrency}
                                        debtState={debtState}
                                        isProcessing={isProcessing}
                                        handleRequestAdvance={handleRequestAdvance}
                                        handleInjectLiquidity={async () => { }}
                                        handleSettleLoan={handleSettleLoan}
                                        appNetwork={appNetwork}
                                        treasuryBalance={treasuryBalance}
                                        borrowLimit={borrowLimit}
                                        handleSetBorrowLimit={handleSetBorrowLimit}
                                    />
                                    {stellarData.role === 'driver' && (
                                        <>
                                            <DriverDutyToggle userData={stellarData} />
                                            <DriverOperationsMap
                                                driverData={stellarData}
                                                currencyMode={currencyMode}
                                                setCurrencyMode={setCurrencyMode}
                                                theme={theme}
                                            />
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'vault' && (
                        <div className="w-full max-w-4xl mx-auto py-2">
                            <VaultTab stellarData={stellarData} externalWallet={externalWallet} activePubKey={activePubKey || null} xlmBalance={xlmBalance} assetBalances={assetBalances} currencyMode={currencyMode} setCurrencyMode={setCurrencyMode} formatCurrency={formatCurrency} setShowWalletModal={setShowWalletModal} handleDisconnectWallet={handleDisconnectWallet} setShowReceiveModal={setShowReceiveModal} setShowSendModal={setShowSendModal} appNetwork={appNetwork} refreshData={fetchLedgerData} />
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="w-full max-w-4xl mx-auto py-2">
                            <HistoryTab txHistory={firebaseHistory} appNetwork={appNetwork} stellarData={stellarData} />
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="w-full max-w-4xl mx-auto py-2">
                            <ProfileTab stellarData={stellarData} isSuperAdmin={stellarData.role === 'superadmin'} />
                        </div>
                    )}

                </main>
            </div>

            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} role={stellarData.role} />

            {/* SEND MODAL */}
            {showSendModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl relative transition-all ${cardRoleStyle(stellarData.role)}`}>
                        <button onClick={() => setShowSendModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
                        <h3 className="text-xl font-black mb-6 text-slate-900 dark:text-white">Send XLM</h3>
                        <form onSubmit={handleSendXLM} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-2">Destination Public Key</label>
                                <input required type="text" value={sendDest} onChange={(e) => setSendDest(e.target.value)} placeholder="G..." className="w-full p-4 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none font-mono text-slate-900 dark:text-white focus:border-cyan-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-2">Amount (XLM)</label>
                                <input required type="number" step="0.0000001" value={sendAmt} onChange={(e) => setSendAmt(e.target.value)} placeholder="0.00" className="w-full p-4 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none text-slate-900 dark:text-white focus:border-cyan-500" />
                            </div>
                            <button type="submit" disabled={isProcessing} className={`w-full py-4 mt-2 font-black text-sm rounded-xl transition-all disabled:opacity-50 ${roleCtaBg(stellarData.role)}`}>
                                {isProcessing ? "Signing Transaction..." : `Confirm & Send on ${appNetwork}`}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* RECEIVE MODAL */}
            {showReceiveModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className={`w-full max-w-sm rounded-3xl p-8 shadow-2xl relative text-center transition-all ${cardRoleStyle(stellarData.role)}`}>
                        <button onClick={() => setShowReceiveModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
                        <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">Receive Assets</h3>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mb-8">Scan to transfer funds to your wallet.</p>
                        <div className="bg-white p-4 rounded-2xl mx-auto w-fit mb-8 shadow-md">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${activePubKey}`} alt="QR Code" className="w-48 h-48" />
                        </div>
                        <div className="text-left">
                            <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-2">Your Address</label>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-slate-50 dark:bg-black/50 p-4 rounded-xl text-[10px] break-all border border-slate-200 dark:border-white/10 font-mono text-slate-900 dark:text-white">{activePubKey}</code>
                                <button onClick={() => navigator.clipboard.writeText(activePubKey!)} className={`p-4 rounded-xl font-bold transition-colors ${roleCtaBg(stellarData.role)}`}><Copy className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WALLET SELECTION MODAL */}
            {showWalletModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className={`w-full max-w-sm rounded-3xl p-8 shadow-2xl relative text-center transition-all ${cardRoleStyle(stellarData.role)}`}>
                        <button onClick={() => setShowWalletModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
                        <Wallet className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
                        <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">Connect Wallet</h3>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">Select your preferred Stellar Network provider to continue.</p>

                        <div className="flex flex-col gap-3">
                            <button onClick={() => executeWalletConnection('LOBSTR')} className="w-full py-4 px-6 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between transition-colors">
                                LOBSTR Extension <ArrowUpRight className="w-4 h-4 opacity-50" />
                            </button>
                            <button onClick={() => executeWalletConnection('Freighter')} className="w-full py-4 px-6 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between transition-colors">
                                Freighter <ArrowUpRight className="w-4 h-4 opacity-50" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INTERACTIVE NOTIFICATION CENTER MODAL */}
            {showNotificationModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in font-sans">
                    <div className={`w-full max-w-xl rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative text-slate-900 dark:text-white space-y-5 transition-all ${cardRoleStyle(stellarData.role)}`}>
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10">
                            <div className="flex items-center gap-3.5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${rolePill(stellarData.role)}`}>
                                    <Bell className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-xl tracking-tight">Notification Center</h3>
                                        {unreadNotificationCount > 0 && (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white font-mono animate-pulse shadow-md">
                                                {unreadNotificationCount} NEW
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 font-mono flex items-center gap-1.5 pt-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                        Verified Mobilis Network Feed
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={markAllNotificationsAsRead}
                                    className={`text-xs font-mono font-bold hover:underline px-2.5 py-1 transition-all ${roleAccentText(stellarData.role)}`}
                                >
                                    Mark Read
                                </button>
                                <button
                                    onClick={() => setShowNotificationModal(false)}
                                    className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Notification Filter Category Bar */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-mono font-bold">
                            {[
                                { id: 'all', label: `All (${allNotifications.length})` },
                                { id: 'fare', label: '⚡ Fares & Loans' },
                                { id: 'broadcast', label: '📢 System' },
                                { id: 'ride', label: '🛺 Ride Status' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    onClick={() => setNotifCategory(tab.id as any)}
                                    className={`px-3.5 py-2 rounded-2xl font-bold transition-all border whitespace-nowrap ${
                                        notifCategory === tab.id
                                            ? `${roleCtaBg(stellarData.role)} border-transparent shadow-md scale-102 text-white`
                                            : 'bg-slate-100 dark:bg-white/[0.05] border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:scale-102'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Notifications Feed */}
                        <div className="space-y-3 max-h-84 overflow-y-auto custom-scrollbar font-mono">
                            {filteredNotifications.length > 0 ? (
                                filteredNotifications.map((notif) => {
                                    if (!notif) return null;
                                    try {
                                        const notifId = notif.id || `notif-${Math.random()}`;
                                        const isUnread = !readIds.has(notifId);
                                        const notifType = notif.type || 'system';
                                        const notifTitle = notif.title || 'Notification';
                                        const notifMessage = notif.message || '';
                                        const formattedTime = formatNotifDate(notif.timestamp);

                                        return (
                                            <div
                                                key={notifId}
                                                className={`p-4.5 rounded-2xl border transition-all duration-200 relative ${
                                                    isUnread
                                                        ? 'bg-white dark:bg-[#0f1420] border-cyan-500/50 shadow-md'
                                                        : 'bg-slate-50/80 dark:bg-white/[0.03] border-slate-200/60 dark:border-white/[0.06] opacity-90'
                                                }`}
                                            >
                                                {isUnread && (
                                                    <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shadow-sm" />
                                                )}
                                                <div className="flex items-start justify-between gap-3.5">
                                                    <div className="flex items-start gap-3.5">
                                                        <div className={`p-3 rounded-2xl border flex-shrink-0 mt-0.5 shadow-sm ${rolePill(stellarData.role)}`}>
                                                            {notifType === 'fare' ? <Zap className="w-5 h-5 text-emerald-500" /> :
                                                             notifType === 'broadcast' || notifType === 'system' ? <Megaphone className="w-5 h-5 text-cyan-500" /> :
                                                             notifType === 'ride' ? <Navigation className="w-5 h-5 text-amber-500" /> :
                                                             <ShieldCheck className="w-5 h-5 text-indigo-500" />}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight">{notifTitle}</p>
                                                            </div>

                                                            <p className="text-xs text-slate-600 dark:text-gray-300 font-medium leading-relaxed">{notifMessage}</p>

                                                            {/* Prominent Amount Display if Available */}
                                                            {notif.amountPhp && (
                                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-black text-xs mt-1.5 border border-emerald-500/25 shadow-xs">
                                                                    <span>₱{notif.amountPhp} PHP</span>
                                                                    {notif.amountXlm && <span className="opacity-75">({notif.amountXlm} XLM)</span>}
                                                                </div>
                                                            )}

                                                            <p className="text-[9px] text-slate-400 font-mono pt-1">
                                                                {formattedTime}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        {notifType === 'fare' && (
                                                            <button
                                                                onClick={() => {
                                                                    setShowNotificationModal(false);
                                                                    setActiveTab('history');
                                                                }}
                                                                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm ${roleCtaBg(stellarData.role)}`}
                                                            >
                                                                Receipt
                                                            </button>
                                                        )}
                                                        {notifType === 'ride' && (
                                                            <button
                                                                onClick={() => {
                                                                    setShowNotificationModal(false);
                                                                    setActiveTab('hub');
                                                                }}
                                                                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm ${roleCtaBg(stellarData.role)}`}
                                                            >
                                                                View Map
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } catch (err) {
                                        console.warn("Notification item render note:", err);
                                        return null;
                                    }
                                })
                            ) : (
                                <div className="py-12 text-center text-slate-400 font-mono space-y-2.5">
                                    <CheckCircle2 className="w-10 h-10 mx-auto opacity-30 text-emerald-500" />
                                    <p className="text-xs font-bold">All clear! No notifications in this category.</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                markAllNotificationsAsRead();
                                setShowNotificationModal(false);
                            }}
                            className={`w-full py-4 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl hover:opacity-90 active:scale-98 ${roleCtaBg(stellarData.role)}`}
                        >
                            Done & Dismiss All
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;