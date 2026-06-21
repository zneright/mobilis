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
import type { UserData } from '../types';

// Your Deployed Soroban Contract ID
const CONTRACT_ID = "CBISDWPNY3WIUJALZQOGTEOJWSGOI4TIUYWOLMPRMZ5FHVW57FHOV545";
const RPC_SERVER = "https://soroban-testnet.stellar.org";

const Dashboard: React.FC = () => {
    const { stellarData } = useAuth();

    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [debtState, setDebtState] = useState<number>(0);
    const [pendingUsers, setPendingUsers] = useState<UserData[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    // --- ADMIN FETCHING LOGIC ---
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

    // --- 🚀 WEB3 LOGIC: SOROBAN SMART CONTRACT INVOCATION 🚀 ---
    const handleRequestAdvance = async () => {
        if (!stellarData || !stellarData.secret) return;
        setIsProcessing(true);

        try {
            console.log(`Initiating Soroban contract for: ${stellarData.publicKey}`);

            const server = new rpc.Server(RPC_SERVER);
            const sourceKeypair = Keypair.fromSecret(stellarData.secret);

            // 1. Fetch the driver's current account sequence number
            const account = await server.getAccount(sourceKeypair.publicKey());
            const contract = new Contract(CONTRACT_ID);

            // 15 USDC represented with 7 decimal places (15 * 10^7)
            const advanceAmount = 150000000;

            // 2. Build the initial transaction
            let tx = new TransactionBuilder(account, {
                fee: "10000", // Base fee, will be adjusted by prepareTransaction
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

            console.log("Simulating transaction for footprint...");

            // 3. Prepare the transaction (This simulates the contract execution to gather the required storage footprint)
            const preparedTx = await server.prepareTransaction(tx);

            // 4. Sign the transaction with the driver's secret key
            preparedTx.sign(sourceKeypair);

            console.log("Submitting to Stellar Testnet...");

            // 5. Submit to the network
            const response = await server.sendTransaction(preparedTx);

            if (response.status === "ERROR") {
                throw new Error("Transaction submission failed");
            }

            console.log(`Tx Hash: ${response.hash}`);
            console.log("Waiting for network confirmation (approx 5 seconds)...");

            // 6. Poll the network until the transaction confirms
            // Fix: We now check for both PENDING and NOT_FOUND states
            let txResult = await server.getTransaction(response.hash);

            while (txResult.status === "NOT_FOUND" || txResult.status === "PENDING") {
                await new Promise(resolve => setTimeout(resolve, 2000));
                txResult = await server.getTransaction(response.hash);
                console.log(`Current network status: ${txResult.status}`);
            }

            if (txResult.status === "SUCCESS") {
                setDebtState(15);
                alert("Success! 15 USDC fuel advance has been confirmed on the Stellar network and transferred to your wallet.");
            } else {
                console.error("Full Network Failure Details:", txResult);
                throw new Error(`Transaction failed on ledger with status: ${txResult.status}`);
            }

            // --- UI RENDERING ---
            if (!stellarData) return <div style={{ textAlign: 'center', marginTop: '100px' }}><h2>Loading profile...</h2></div>;

            if (stellarData.status === 'pending') {
                return (
                    <div style={{ padding: '40px 20px', maxWidth: '400px', margin: '40px auto', fontFamily: 'sans-serif', textAlign: 'center', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
                        <h2 style={{ color: '#d97706' }}>Account Pending</h2>
                        <p style={{ color: '#52525b', marginBottom: '30px' }}>Your application is under review by administration.</p>
                        <button onClick={() => signOut(auth)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #000', borderRadius: '6px', cursor: 'pointer' }}>Log Out</button>
                    </div>
                );
            }

            // --- VIEW: SUPER ADMIN OR TODA ADMIN ---
            if (stellarData.role === 'superadmin' || stellarData.role === 'admin') {
                const isAdmin = stellarData.role === 'admin';
                return (
                    <div style={{ padding: '20px', maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <h2>{isAdmin ? `${stellarData.coopName} Dashboard` : 'Mobilis Command Center'}</h2>
                            <button onClick={() => signOut(auth)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}>Log Out</button>
                        </div>

                        <h3>{isAdmin ? 'Pending Driver Applications' : 'Pending Cooperatives'}</h3>
                        {isFetching ? <p>Loading...</p> : (
                            pendingUsers.length === 0 ? (
                                <p style={{ backgroundColor: '#f4f4f5', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>No pending applications.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {pendingUsers.map((user) => (
                                        <div key={user.uid} style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 5px 0' }}>{isAdmin ? user.fullName : user.coopName}</h4>
                                                <p style={{ margin: 0, fontSize: '14px', color: '#52525b' }}>
                                                    {isAdmin ? `Plate: ${user.plateNumber} | Phone: ${user.phone}` : `Contact: ${user.contactPerson} | Reg: ${user.registrationNumber}`}
                                                </p>
                                            </div>
                                            <button onClick={() => handleApprove(user.uid)} style={{ padding: '10px 20px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Approve</button>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                );
            }

            // --- VIEW: DRIVER ---
            return (
                <div style={{ padding: '20px', maxWidth: '400px', margin: '40px auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
                    <h2>Mobilis Driver Hub</h2>
                    <div style={{ backgroundColor: '#f4f4f5', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
                        <p style={{ margin: 0, fontSize: '14px', color: '#52525b' }}>Connected Wallet:</p>
                        <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', wordBreak: 'break-all', fontSize: '12px' }}>{stellarData.publicKey}</p>
                    </div>

                    <div style={{ padding: '20px', border: `2px solid ${debtState === 0 ? '#22c55e' : '#ef4444'}`, borderRadius: '8px', marginBottom: '20px' }}>
                        {debtState === 0 ? <p style={{ color: '#22c55e', margin: 0, fontWeight: 'bold' }}>Eligible for Fuel Advance</p> : <p style={{ color: '#ef4444', margin: 0, fontWeight: 'bold' }}>Active Debt: {debtState} USDC</p>}
                    </div>

                    <button onClick={handleRequestAdvance} disabled={isProcessing || debtState > 0} style={{ width: '100%', padding: '16px', backgroundColor: debtState > 0 ? '#e4e4e7' : '#22c55e', color: debtState > 0 ? '#a1a1aa' : '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: (debtState > 0 || isProcessing) ? 'not-allowed' : 'pointer' }}>
                        {isProcessing ? "Processing on Stellar..." : "Request 15 USDC Advance"}
                    </button>

                    <button onClick={() => signOut(auth)} style={{ marginTop: '40px', padding: '10px 20px', background: 'transparent', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}>Log Out</button>
                </div>
            );
        };

        export default Dashboard;