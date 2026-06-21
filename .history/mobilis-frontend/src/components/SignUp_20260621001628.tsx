import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Keypair } from '@stellar/stellar-sdk';
import type { UserData } from '../types';

const Signup: React.FC = () => {
    const [role, setRole] = useState<'driver' | 'admin'>('driver');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Driver Fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [plateNumber, setPlateNumber] = useState('');

    // Smart Autocomplete State for Drivers
    const [todaAffiliation, setTodaAffiliation] = useState('');
    const [approvedCoops, setApprovedCoops] = useState<string[]>([]);
    const [filteredCoops, setFilteredCoops] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // Admin Fields
    const [coopName, setCoopName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Fetch approved cooperatives on load
    useEffect(() => {
        const fetchCoops = async () => {
            try {
                const q = query(
                    collection(db, 'users'),
                    where('role', '==', 'admin'),
                    where('status', '==', 'approved')
                );
                const snapshot = await getDocs(q);
                const coops = snapshot.docs.map(doc => doc.data().coopName as string);
                setApprovedCoops(coops);
                setFilteredCoops(coops);
            } catch (err) {
                console.error("Failed to fetch coops", err);
            }
        };
        fetchCoops();
    }, []);

    // Handle typing in the TODA search box
    const handleTodaSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setTodaAffiliation(value);

        const matches = approvedCoops.filter(coop =>
            coop.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredCoops(matches);
        setShowDropdown(true);
    };

    const handleSelectCoop = (coop: string) => {
        setTodaAffiliation(coop);
        setShowDropdown(false);
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // --- NEW VALIDATION: Check if cooperative exists ---
        if (role === 'driver') {
            const isValidCoop = approvedCoops.some(
                coop => coop.toLowerCase() === todaAffiliation.toLowerCase().trim()
            );
            if (!isValidCoop) {
                setError("No such cooperative exists. Please select a valid organization from the list.");
                setIsLoading(false);
                return;
            }
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const pair = Keypair.random();
            const publicKey = pair.publicKey();
            const secret = pair.secret();

            const baseData = {
                uid: user.uid,
                email: user.email || email,
                role: role,
                status: 'pending',
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
                    todaAffiliation: todaAffiliation.trim() // Ensure exact spelling is saved
                };
                fetch(`https://friendbot.stellar.org?addr=${publicKey}`).catch(console.error);
            } else {
                finalUserData = {
                    ...baseData,
                    role: 'admin',
                    status: 'pending',
                    coopName: coopName.trim(),
                    contactPerson,
                    phone,
                    registrationNumber
                };
            }

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

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <label style={{ flex: 1, padding: '15px', border: `2px solid ${role === 'driver' ? '#000' : '#e4e4e7'}`, borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontWeight: role === 'driver' ? 'bold' : 'normal', backgroundColor: role === 'driver' ? '#f4f4f5' : '#fff' }}>
                        <input type="radio" value="driver" checked={role === 'driver'} onChange={() => setRole('driver')} style={{ display: 'none' }} />
                        🚙 Driver
                    </label>
                    <label style={{ flex: 1, padding: '15px', border: `2px solid ${role === 'admin' ? '#000' : '#e4e4e7'}`, borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontWeight: role === 'admin' ? 'bold' : 'normal', backgroundColor: role === 'admin' ? '#f4f4f5' : '#fff' }}>
                        <input type="radio" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} style={{ display: 'none' }} />
                        🏢 TODA Admin
                    </label>
                </div>

                {role === 'driver' ? (
                    <>
                        <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} />
                        <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle} />
                        <input type="text" placeholder="Plate Number (e.g., ABC-1234)" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} required style={inputStyle} />

                        {/* Custom Autocomplete Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search Cooperative Name..."
                                value={todaAffiliation}
                                onChange={handleTodaSearch}
                                onFocus={() => setShowDropdown(true)}
                                required
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                            />
                            {showDropdown && (
                                <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #d4d4d8', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto', margin: '5px 0 0 0', padding: 0, listStyle: 'none', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                    {filteredCoops.length > 0 ? (
                                        filteredCoops.map((coop, idx) => (
                                            <li key={idx} onClick={() => handleSelectCoop(coop)} style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #f4f4f5' }}>
                                                {coop}
                                            </li>
                                        ))
                                    ) : (
                                        <li style={{ padding: '10px 15px', color: '#a1a1aa' }}>No matching cooperatives</li>
                                    )}
                                </ul>
                            )}
                        </div>
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

                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                <input type="password" placeholder="Secure Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />

                <button type="submit" disabled={isLoading} style={{ padding: '16px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: isLoading ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
                    {isLoading ? 'Processing...' : 'Submit Application'}
                </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '25px', color: '#52525b' }}>
                Already registered? <Link to="/login" style={{ color: '#000', fontWeight: 'bold' }}>Log In</Link>
            </p>
        </div>
    );
};

const inputStyle: React.CSSProperties = { padding: '14px', borderRadius: '8px', border: '1px solid #d4d4d8', fontSize: '15px', backgroundColor: '#fafafa' };

export default Signup;