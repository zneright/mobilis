import React, { useState, useEffect } from 'react';
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
import { Copy, ArrowUpRight, X, Wallet, Zap, Bell, Radio, ShieldCheck, Megaphone } from 'lucide-react';
import Header from './Header';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { motion } from 'framer-motion';

import HubTab from './tabs/HubTab';
import VaultTab from './tabs/VaultTab';
import HistoryTab from './tabs/HistoryTab';
import ProfileTab from './tabs/ProfileTab';

import { CommuterRadar } from './commuter/CommuterRadar';
import { DriverDutyToggle } from './driver/DriverDutyToggle';
import { DriverRadar } from './driver/DriverRadar';
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

    const [paymentToast, setPaymentToast] = useState<{ amount: string; commuterName: string } | null>(null);

    // REAL-TIME DRIVER FARE PAYMENT NOTIFICATION LISTENER
    useEffect(() => {
        if (!stellarData?.uid || stellarData.role !== 'driver') return;

        // Register FCM Push Token
        setupFcmNotifications(stellarData.uid);

        let isInitial = true;
        const q = query(
            collection(db, 'fare_transactions'),
            where('driverId', '==', stellarData.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (isInitial) {
                isInitial = false;
                return;
            }

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const amount = data.amount || '0.00';
                    const commuterName = data.commuterName || 'Commuter';

                    // 1. Play Web Audio API double chime (no mp3 asset needed)
                    playDoubleChime();

                    // 2. Animated in-app toast notification banner
                    setPaymentToast({ amount, commuterName });
                    setTimeout(() => setPaymentToast(null), 6000);

                    // 3. Native Browser Notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('⚡ New Fare Received!', {
                            body: `Received ${amount} XLM from ${commuterName}`,
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
                        timestamp: data.timestamp || new Date().toISOString()
                    });
                }
            });

            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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

    const isDriverRole = stellarData?.role === 'driver';
    const isSuperAdminRole = stellarData?.role === 'superadmin';
    const isCoopAdminRole = (stellarData?.role as string) === 'admin' || (stellarData?.role as string) === 'cooperative';

    const rootRoleBgClass = isSuperAdminRole
        ? 'bg-[#fff1f2] dark:bg-[#120408]'
        : isCoopAdminRole
        ? 'bg-[#eef2ff] dark:bg-[#060618]'
        : isDriverRole
        ? 'bg-[#f0fdfa] dark:bg-[#030914]'
        : 'bg-[#ecfdf5] dark:bg-[#02120a]';

    return (
        <div className={`h-screen w-full overflow-hidden relative flex text-slate-900 dark:text-white font-sans transition-colors duration-500 ${rootRoleBgClass}`}>
            
            {/* RICH ROLE-BASED MESH GRADIENT OVERLAY */}
            <div className={`pointer-events-none fixed inset-0 z-0 opacity-70 transition-all duration-700 ${
                isSuperAdminRole
                    ? 'bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-rose-500/25 via-orange-500/10 to-transparent'
                    : isCoopAdminRole
                    ? 'bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-500/25 via-purple-500/10 to-transparent'
                    : isDriverRole
                    ? 'bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-500/25 via-amber-500/10 to-transparent'
                    : 'bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-500/25 via-teal-500/10 to-transparent'
            }`} />

            {/* CLEAN GEOMETRIC BACKGROUND DOT GRID PATTERN */}
            <div className="pointer-events-none fixed inset-0 z-0 opacity-20 dark:opacity-15 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px]" />

            {/* ANIMATED FLOATING ROLE-BASED AURA SPHERES */}
            <motion.div
                className={`pointer-events-none fixed -top-32 -left-32 w-[36rem] h-[36rem] rounded-full blur-[140px] z-0 opacity-60 ${
                    isDriverRole
                        ? 'bg-cyan-500/25 dark:bg-cyan-500/20'
                        : isCoopAdminRole
                        ? 'bg-indigo-600/30 dark:bg-indigo-600/25'
                        : isSuperAdminRole
                        ? 'bg-rose-500/30 dark:bg-rose-500/25'
                        : 'bg-emerald-500/25 dark:bg-emerald-500/20'
                }`}
                animate={{
                    x: [0, 40, 0],
                    y: [0, 30, 0],
                    scale: [1, 1.15, 1],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            <motion.div
                className={`pointer-events-none fixed -bottom-32 -right-32 w-[36rem] h-[36rem] rounded-full blur-[140px] z-0 opacity-60 ${
                    isDriverRole
                        ? 'bg-amber-500/25 dark:bg-amber-500/15'
                        : isCoopAdminRole
                        ? 'bg-purple-600/25 dark:bg-purple-600/20'
                        : isSuperAdminRole
                        ? 'bg-orange-500/25 dark:bg-orange-500/20'
                        : 'bg-teal-500/25 dark:bg-teal-500/15'
                }`}
                animate={{
                    x: [0, -40, 0],
                    y: [0, -30, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 14,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
            
            {/* IN-APP REALTIME DRIVER PAYMENT TOAST ALERT */}
            {paymentToast && (
                <div className="fixed top-5 right-5 z-[100] max-w-sm w-full bg-emerald-500 text-black p-4 rounded-2xl shadow-[0_0_30px_rgba(52,211,153,0.6)] border border-emerald-400 flex items-center gap-3 animate-bounce">
                    <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-6 h-6 text-black" />
                    </div>
                    <div className="flex-1">
                        <p className="font-black text-xs uppercase tracking-wider">New Fare Received!</p>
                        <p className="font-extrabold text-sm">+{paymentToast.amount} XLM from {paymentToast.commuterName}</p>
                    </div>
                    <button onClick={() => setPaymentToast(null)} className="p-1 hover:bg-black/10 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* IN-APP REALTIME BROADCAST ANNOUNCEMENT TOAST */}
            {broadcastToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] max-w-md w-full bg-cyan-500 text-black p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-bounce">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold">
                        <Megaphone className="w-4 h-4 flex-shrink-0" />
                        <span>📢 {broadcastToast.title}: {broadcastToast.message}</span>
                    </div>
                    <button onClick={() => setBroadcastToast(null)} className="p-1 hover:bg-black/10 rounded-lg">
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
                    onOpenNotifications={() => setShowNotificationModal(true)}
                    role={stellarData.role}
                />

                <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 flex flex-col items-center">

                    {activeTab === 'hub' && (
                        stellarData.role === 'commuter' ? (
                            <div className="w-full max-w-4xl mx-auto py-2">
                                <CommuterRadar
                                    commuterData={stellarData}
                                    currencyMode={currencyMode}
                                    setCurrencyMode={setCurrencyMode}
                                />
                            </div>
                        ) : stellarData.role === 'driver' ? (
                            <div className="w-full max-w-4xl mx-auto space-y-8 py-2">
                                <DriverDutyToggle userData={stellarData} />
                                <DriverRadar
                                    driverData={stellarData}
                                    currencyMode={currencyMode}
                                    setCurrencyMode={setCurrencyMode}
                                />
                            </div>
                        ) : (
                            <div className="w-full max-w-4xl mx-auto py-2">
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
                            </div>
                        )
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
                    <div className={`w-full max-w-md bg-white dark:bg-[#0c121e] rounded-[2rem] p-6 shadow-2xl relative transition-all ${
                        stellarData.role === 'driver'
                            ? 'border-t-4 border-t-cyan-500 border-x border-b border-cyan-500/30'
                            : (stellarData.role as string) === 'admin' || (stellarData.role as string) === 'cooperative'
                            ? 'border-t-4 border-t-indigo-500 border-x border-b border-indigo-500/30'
                            : stellarData.role === 'superadmin'
                            ? 'border-t-4 border-t-rose-500 border-x border-b border-rose-500/30'
                            : 'border-t-4 border-t-emerald-500 border-x border-b border-emerald-500/30'
                    }`}>
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
                            <button type="submit" disabled={isProcessing} className={`w-full py-4 mt-2 font-black text-sm rounded-xl transition-all disabled:opacity-50 ${
                                stellarData.role === 'driver'
                                    ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                                    : (stellarData.role as string) === 'admin' || (stellarData.role as string) === 'cooperative'
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                                    : stellarData.role === 'superadmin'
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                            }`}>
                                {isProcessing ? "Signing Transaction..." : `Confirm & Send on ${appNetwork}`}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* RECEIVE MODAL */}
            {showReceiveModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className={`w-full max-w-sm bg-white dark:bg-[#0c121e] rounded-[2rem] p-8 shadow-2xl relative text-center transition-all ${
                        stellarData.role === 'driver'
                            ? 'border-t-4 border-t-cyan-500 border-x border-b border-cyan-500/30'
                            : (stellarData.role as string) === 'admin' || (stellarData.role as string) === 'cooperative'
                            ? 'border-t-4 border-t-indigo-500 border-x border-b border-indigo-500/30'
                            : stellarData.role === 'superadmin'
                            ? 'border-t-4 border-t-rose-500 border-x border-b border-rose-500/30'
                            : 'border-t-4 border-t-emerald-500 border-x border-b border-emerald-500/30'
                    }`}>
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
                                <button onClick={() => navigator.clipboard.writeText(activePubKey!)} className={`p-4 rounded-xl font-bold transition-colors ${
                                    stellarData.role === 'driver'
                                        ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                                        : (stellarData.role as string) === 'admin' || (stellarData.role as string) === 'cooperative'
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                                        : stellarData.role === 'superadmin'
                                        ? 'bg-rose-600 text-white hover:bg-rose-500'
                                        : 'bg-emerald-500 text-black hover:bg-emerald-400'
                                }`}><Copy className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WALLET SELECTION MODAL */}
            {showWalletModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className={`w-full max-w-sm bg-white dark:bg-[#0c121e] rounded-[2rem] p-8 shadow-2xl relative text-center transition-all ${
                        stellarData.role === 'driver'
                            ? 'border-t-4 border-t-cyan-500 border-x border-b border-cyan-500/30'
                            : (stellarData.role as string) === 'admin' || (stellarData.role as string) === 'cooperative'
                            ? 'border-t-4 border-t-indigo-500 border-x border-b border-indigo-500/30'
                            : stellarData.role === 'superadmin'
                            ? 'border-t-4 border-t-rose-500 border-x border-b border-rose-500/30'
                            : 'border-t-4 border-t-emerald-500 border-x border-b border-emerald-500/30'
                    }`}>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className={`w-full max-w-md bg-white dark:bg-[#0c121e] rounded-[2.5rem] p-6 shadow-2xl relative text-slate-900 dark:text-white space-y-5 transition-all ${
                        stellarData.role === 'driver'
                            ? 'border-t-4 border-t-cyan-500 border-x border-b border-cyan-500/30'
                            : (stellarData.role as string) === 'admin' || (stellarData.role as string) === 'cooperative'
                            ? 'border-t-4 border-t-indigo-500 border-x border-b border-indigo-500/30'
                            : stellarData.role === 'superadmin'
                            ? 'border-t-4 border-t-rose-500 border-x border-b border-rose-500/30'
                            : 'border-t-4 border-t-emerald-500 border-x border-b border-emerald-500/30'
                    }`}>
                        
                        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 flex items-center justify-center">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg tracking-tight">Notification Center</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">Real-Time Transit Alerts</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowNotificationModal(false)}
                                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Notifications List */}
                        <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
                            {/* Real Broadcast Announcements */}
                            {broadcasts.length > 0 && broadcasts.map((b) => (
                                <div key={b.id} className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                                            <Megaphone className="w-3.5 h-3.5" /> {b.title}
                                        </span>
                                        <span className="text-[9px] font-mono text-cyan-500">{b.senderName}</span>
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-gray-300 font-medium">
                                        {b.message}
                                    </p>
                                    <span className="text-[9px] font-mono text-slate-400 block pt-1">
                                        {new Date(b.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            ))}

                            <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                        <Zap className="w-3.5 h-3.5" /> Stellar Testnet Connected
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-400">Live</span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                    Your Web3 transport wallet is synchronized on the Stellar Testnet ledger.
                                </p>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                                        <Radio className="w-3.5 h-3.5" /> 50m Radar Active
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-400">Active</span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                    GPS radar location broadcasts automatically when active drivers are ON TRANSIT.
                                </p>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5" /> Account Verified
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-400">Secured</span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                    Cryptographic keypairs signed and ready for instant fare clearing.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowNotificationModal(false)}
                            className="w-full py-4 bg-gray-900 text-white dark:bg-emerald-500 dark:text-black font-black text-xs rounded-2xl transition-all shadow-md"
                        >
                            Done & Dismiss
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;