import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import type { UserData } from '../types';

const Dashboard: React.FC = () => {
    const { stellarData } = useAuth();

    // States for Driver Actions
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [debtState, setDebtState] = useState<number>(0);

    // States for Super Admin Actions
    const [pendingCooperatives, setPendingCooperatives] = useState<UserData[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    // --- SUPER ADMIN LOGIC ---
    useEffect(() => {
        const fetchPendingCoops = async () => {
            if (stellarData?.role === 'superadmin') {
                setIsFetching(true);
                try {
                    const q = query(
                        collection(db, 'users'),
                        where('role', '==', 'admin'),
                        where('status', '==', 'pending')
                    );
                    const querySnapshot = await getDocs(q);
                    const coops: UserData[] = [];
                    querySnapshot.forEach((doc) => {
                        coops.push(doc.data() as UserData);
                    });
                    setPendingCooperatives(coops);
                } catch (error) {
                    console.error("Error fetching coops:", error);
                } finally {
                    setIsFetching(false);
                }
            }
        };

        fetchPendingCoops();
    }, [stellarData]);

    const handleApproveCoop = async (uid: string) => {
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, { status: 'approved' });
            // Remove the approved coop from the local screen
            setPendingCooperatives(prev => prev.filter(coop => coop.uid !== uid));
            alert("Cooperative approved successfully!");
        } catch (error) {
            console.error("Error approving coop:", error);
            alert("Failed to approve cooperative.");
        }
    };

    // --- DRIVER LOGIC ---
    const handleRequestAdvance = async () => {
        setIsProcessing(true);
        try {
            console.log(`Initiating Soroban contract for: ${stellarData?.publicKey}`);
            await new Promise(resolve => setTimeout(resolve, 2500));
            setDebtState(15);
            alert("Success! 15 USDC fuel advance confirmed on the Stellar network.");
        } catch (error) {
            console.error(error);
            alert("Failed to process advance.");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- UI RENDER BLOCKS ---

    if (!stellarData) {
        return <div style={{ textAlign: 'center', marginTop: '100px' }}><h2>Loading profile...</h2></div>;
    }

    if (stellarData.status === 'pending') {
        return (
            <div style={{ padding: '40px 20px', maxWidth: '400px', margin: '40px auto', fontFamily: 'sans-serif', textAlign: 'center', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
                <h2 style={{ color: '#d97706' }}>Account Pending Approval</h2>
                <p style={{ color: '#52525b', lineHeight: '1.6', marginBottom: '30px' }}>
                    Your application has been received. You will be granted access once your credentials are verified.
                </p>
                <button onClick={() => signOut(auth)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #000', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Log Out
                </button>
            </div>
        );
    }

    // --- VIEW: SUPER ADMIN ---
    if (stellarData.role === 'superadmin') {
        return (
            <div style={{ padding: '20px', maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h2>Mobilis Command Center</h2>
                    <button onClick={() => signOut(auth)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}>Log Out</button>
                </div>

                <h3>Pending TODA Cooperatives</h3>
                {isFetching ? <p>Loading pending applications...</p> : (
                    pendingCooperatives.length === 0 ? (
                        <p style={{ color: '#52525b', backgroundColor: '#f4f4f5', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>No pending cooperatives at this time.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {pendingCooperatives.map((coop) => (
                                <div key={coop.uid} style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0' }}>{coop.coopName}</h4>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#52525b' }}>Contact: {coop.contactPerson}</p>
                                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#a1a1aa' }}>Reg: {coop.registrationNumber}</p>
                                    </div>
                                    <button
                                        onClick={() => handleApproveCoop(coop.uid)}
                                        style={{ padding: '10px 20px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        Approve
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        );
    }

    // --- VIEW: DRIVER (OR APPROVED TODA ADMIN FOR NOW) ---
    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '40px auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
            <h2>Mobilis Driver Hub</h2>
            <div style={{ backgroundColor: '#f4f4f5', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#52525b' }}>Connected Wallet:</p>
                <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', wordBreak: 'break-all', fontSize: '12px' }}>{stellarData.publicKey}</p>
            </div>

            <div style={{ padding: '20px', border: `2px solid ${debtState === 0 ? '#22c55e' : '#ef4444'}`, borderRadius: '8px', marginBottom: '20px' }}>
                {debtState === 0 ? (
                    <p style={{ color: '#22c55e', margin: 0, fontWeight: 'bold' }}>Eligible for Fuel Advance</p>
                ) : (
                    <p style={{ color: '#ef4444', margin: 0, fontWeight: 'bold' }}>Active Debt: {debtState} USDC</p>
                )}
            </div>

            <button
                onClick={handleRequestAdvance}
                disabled={isProcessing || debtState > 0}
                style={{ width: '100%', padding: '16px', backgroundColor: debtState > 0 ? '#e4e4e7' : '#22c55e', color: debtState > 0 ? '#a1a1aa' : '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: (debtState > 0 || isProcessing) ? 'not-allowed' : 'pointer' }}
            >
                {isProcessing ? "Processing on Stellar..." : "Request 15 USDC Advance"}
            </button>

            <button onClick={() => signOut(auth)} style={{ marginTop: '40px', padding: '10px 20px', background: 'transparent', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}>Log Out</button>
        </div>
    );
};

export default Dashboard;