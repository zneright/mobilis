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