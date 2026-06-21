import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const Dashboard: React.FC = () => {
    const { stellarData } = useAuth();
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [debtState, setDebtState] = useState<number>(0);

    const handleRequestAdvance = async () => {
        setIsProcessing(true);
        try {
            console.log(`Initiating Soroban contract for: ${stellarData?.publicKey}`);

            // Simulated network delay for the Soroban invocation
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

    if (!stellarData) {
        return (
            <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
                <h2>Provisioning secure wallet...</h2>
                <p>This only happens once.</p>
            </div>
        );
    }

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