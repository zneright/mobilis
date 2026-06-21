import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Keypair } from '@stellar/stellar-sdk';
import type { StellarData } from '../types';

const Signup: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'driver' | 'admin'>('driver');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // 1. Create the user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Generate a Stellar wallet
            const pair = Keypair.random();
            const publicKey = pair.publicKey();
            const secret = pair.secret();

            // 3. Save the Role and Wallet to Firestore immediately
            const newUserData: StellarData = {
                publicKey,
                secret,
                role: role
            };

            await setDoc(doc(db, 'users', user.uid), newUserData);

            // (Optional MVP step) Fund the wallet via Friendbot if it's a driver
            if (role === 'driver') {
                fetch(`https://friendbot.stellar.org?addr=${publicKey}`).catch(console.error);
            }

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || "Failed to create account.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '40px auto', fontFamily: 'sans-serif' }}>
            <h2>Create Mobilis Account</h2>
            {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                {/* Role Selector */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <label style={{ flex: 1, padding: '10px', border: `2px solid ${role === 'driver' ? '#000' : '#ccc'}`, borderRadius: '6px', textAlign: 'center', cursor: 'pointer' }}>
                        <input type="radio" name="role" value="driver" checked={role === 'driver'} onChange={() => setRole('driver')} style={{ display: 'none' }} />
                        🚙 Driver
                    </label>
                    <label style={{ flex: 1, padding: '10px', border: `2px solid ${role === 'admin' ? '#000' : '#ccc'}`, borderRadius: '6px', textAlign: 'center', cursor: 'pointer' }}>
                        <input type="radio" name="role" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} style={{ display: 'none' }} />
                        🏢 TODA Admin
                    </label>
                </div>

                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />

                <button type="submit" disabled={isLoading} style={{ padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                    {isLoading ? 'Creating...' : 'Sign Up'}
                </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '20px' }}>
                Already have an account? <Link to="/login" style={{ color: '#000', fontWeight: 'bold' }}>Log In</Link>
            </p>
        </div>
    );
};

export default Signup;