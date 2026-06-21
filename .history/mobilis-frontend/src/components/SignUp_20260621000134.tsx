import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Keypair } from '@stellar/stellar-sdk';
import type { UserData } from '../types';

const Signup: React.FC = () => {
    // Core Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'driver' | 'admin'>('driver');

    // Driver Fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    const [todaAffiliation, setTodaAffiliation] = useState('');

    // Admin Fields
    const [coopName, setCoopName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // 1. Create Firebase Auth Account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Generate Stellar Wallet
            const pair = Keypair.random();
            const publicKey = pair.publicKey();
            const secret = pair.secret();

            // 3. Construct Database Payload based on Role
            const baseData = {
                uid: user.uid,
                email: user.email || email,
                role: role,
                status: 'pending', // IMPORTANT: Requires manual approval later!
                publicKey,
                secret
            };

            let finalUserData: UserData;

            if (role === 'driver') {
                finalUserData = {
                    ...baseData,
                    role: 'driver',
                    status: 'pending',
                    fullName,
                    phone,
                    plateNumber,
                    todaAffiliation
                };
                // Background task: Fund the driver's wallet via Friendbot
                fetch(`https://friendbot.stellar.org?addr=${publicKey}`).catch(console.error);
            } else {
                finalUserData = {
                    ...baseData,
                    role: 'admin',
                    status: 'pending',
                    coopName,
                    contactPerson: contactPerson,
                    phone,
                    registrationNumber
                };
            }

            // 4. Save to Firestore
            await setDoc(doc(db, 'users', user.uid), finalUserData);

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || "Failed to create account.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '500px', margin: '40px auto', fontFamily: 'sans-serif' }}>
            <h2 style={{ textAlign: 'center' }}>Create Mobilis Account</h2>
            {error && <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>{error}</div>}

            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                {/* Role Selector */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <label style={{ flex: 1, padding: '15px', border: `2px solid ${role === 'driver' ? '#000' : '#e4e4e7'}`, borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontWeight: role === 'driver' ? 'bold' : 'normal', backgroundColor: role === 'driver' ? '#f4f4f5' : '#fff' }}>
                        <input type="radio" value="driver" checked={role === 'driver'} onChange={() => setRole('driver')} style={{ display: 'none' }} />
                        🚙 Driver Registration
                    </label>
                    <label style={{ flex: 1, padding: '15px', border: `2px solid ${role === 'admin' ? '#000' : '#e4e4e7'}`, borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontWeight: role === 'admin' ? 'bold' : 'normal', backgroundColor: role === 'admin' ? '#f4f4f5' : '#fff' }}>
                        <input type="radio" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} style={{ display: 'none' }} />
                        🏢 TODA Cooperative
                    </label>
                </div>

                {/* Dynamic Fields based on Selection */}
                {role === 'driver' ? (
                    <>
                        <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} />
                        <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle} />
                        <input type="text" placeholder="Plate Number (e.g., ABC-1234)" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} required style={inputStyle} />
                        <input type="text" placeholder="TODA Affiliation (e.g., Obando TODA)" value={todaAffiliation} onChange={(e) => setTodaAffiliation(e.target.value)} required style={inputStyle} />
                    </>
                ) : (
                    <>
                        <input type="text" placeholder="Registered Cooperative Name" value={coopName} onChange={(e) => setCoopName(e.target.value)} required style={inputStyle} />
                        <input type="text" placeholder="Contact Person Full Name" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required style={inputStyle} />
                        <input type="tel" placeholder="Official Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle} />
                        <input type="text" placeholder="Gov Registration Number (e.g., CDA/SEC)" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} required style={inputStyle} />
                    </>
                )}

                <hr style={{ border: '1px solid #f4f4f5', margin: '10px 0' }} />

                {/* Core Auth Fields */}
                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                <input type="password" placeholder="Secure Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />

                <button type="submit" disabled={isLoading} style={{ padding: '16px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: isLoading ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
                    {isLoading ? 'Creating Account & Wallet...' : 'Submit Application'}
                </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '25px', color: '#52525b' }}>
                Already registered? <Link to="/login" style={{ color: '#000', fontWeight: 'bold' }}>Log In</Link>
            </p>
        </div>
    );
};

// Reusable styling object for cleaner code
const inputStyle: React.CSSProperties = {
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid #d4d4d8',
    fontSize: '15px',
    backgroundColor: '#fafafa'
};

export default Signup;