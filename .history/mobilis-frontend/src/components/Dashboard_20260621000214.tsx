import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const Dashboard: React.FC = () => {
    const { stellarData } = useAuth();
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [debtState, setDebtState] = useState<number>(0);

    // ... (Keep your handleRequestAdvance function here) ...

    if (!stellarData) {
        return <div style={{ textAlign: 'center', marginTop: '100px' }}><h2>Provisioning secure wallet...</h2></div>;
    }

    // --- NEW SECURITY BLOCK ---
    if (stellarData.status === 'pending') {
        return (
            <div style={{ padding: '40px 20px', maxWidth: '400px', margin: '40px auto', fontFamily: 'sans-serif', textAlign: 'center', border: '1px solid #e4e4e7', borderRadius: '12px' }}>
                <h2 style={{ color: '#d97706' }}>Account Pending Approval</h2>
                <p style={{ color: '#52525b', lineHeight: '1.6', marginBottom: '30px' }}>
                    Your application has been received. You will be granted access to the Mobilis network once your TODA administrator verifies your credentials.
                </p>
                <div style={{ backgroundColor: '#fef3c7', padding: '15px', borderRadius: '8px', marginBottom: '30px' }}>
                    <strong>Your Public Wallet ID:</strong>
                    <br />
                    <span style={{ fontSize: '12px', wordBreak: 'break-all' }}>{stellarData.publicKey}</span>
                </div>
                <button onClick={() => signOut(auth)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #000', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Log Out Safely
                </button>
            </div>
        );
    }
    // --- END NEW SECURITY BLOCK ---

    // ... (Keep the rest of the Dashboard JSX exactly as it was) ...
    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '40px auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
            <h2>Mobilis Driver Hub</h2>

            <div style={{ backgroundColor: '#f4f4f5', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#52525b' }}>TODA Connected Wallet:</p>
                <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', wordBreak: 'break-all', fontSize: '12px' }}>
                    {stellarData.publicKey}
                </p>
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
                style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: debtState > 0 ? '#e4e4e7' : (isProcessing ? '#86efac' : '#22c55e'),
                    color: debtState > 0 ? '#a1a1aa' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    cursor: (debtState > 0 || isProcessing) ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s'
                }}
            >
                {isProcessing ? "Processing on Stellar..." : "Request 15 USDC Advance"}
            </button>

            <button
                onClick={() => signOut(auth)}
                style={{ marginTop: '40px', padding: '10px 20px', background: 'transparent', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}
            >
                Log Out
            </button>
        </div>
    );
};

export default Dashboard;