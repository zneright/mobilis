// src/components/Signup.tsx
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
                    todaAffiliation: todaAffiliation.trim()
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

    const inputClasses = "w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all";

    return (
        <div className="min-h-screen bg-[#060610] flex flex-col items-center justify-center p-4 sm:p-8 font-sans text-white">
            <div className="w-full max-w-lg bg-[#0a0a14]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 sm:p-10 shadow-2xl">

                <h2 className="text-2xl sm:text-3xl font-black text-center mb-8 tracking-tight">Deploy Node</h2>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="flex flex-col gap-4">

                    {/* Segmented Control for Role */}
                    <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl mb-2">
                        <button
                            type="button"
                            onClick={() => setRole('driver')}
                            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${role === 'driver' ? 'bg-emerald-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                        >
                            🚙 Driver
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('admin')}
                            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${role === 'admin' ? 'bg-emerald-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                        >
                            🏢 TODA Admin
                        </button>
                    </div>

                    {role === 'driver' ? (
                        <>
                            <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputClasses} />
                            <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputClasses} />
                            <input type="text" placeholder="Plate Number (e.g., ABC-1234)" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} required className={inputClasses} />

                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search Cooperative Name..."
                                    value={todaAffiliation}
                                    onChange={handleTodaSearch}
                                    onFocus={() => setShowDropdown(true)}
                                    required
                                    className={inputClasses}
                                />
                                {showDropdown && (
                                    <ul className="absolute top-[105%] left-0 w-full bg-[#161622] border border-white/10 rounded-xl max-h-40 overflow-y-auto z-50 shadow-2xl custom-scrollbar">
                                        {filteredCoops.length > 0 ? (
                                            filteredCoops.map((coop, idx) => (
                                                <li key={idx} onClick={() => handleSelectCoop(coop)} className="p-4 cursor-pointer hover:bg-white/5 border-b border-white/5 last:border-none transition-colors">
                                                    {coop}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="p-4 text-gray-500 text-sm">No matching cooperatives</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <input type="text" placeholder="Registered Cooperative Name" value={coopName} onChange={(e) => setCoopName(e.target.value)} required className={inputClasses} />
                            <input type="text" placeholder="Contact Person Full Name" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required className={inputClasses} />
                            <input type="tel" placeholder="Official Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputClasses} />
                            <input type="text" placeholder="Gov Registration Number (e.g., CDA/SEC)" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} required className={inputClasses} />
                        </>
                    )}

                    <div className="h-px w-full bg-white/10 my-2" />

                    <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClasses} />
                    <input type="password" placeholder="Secure Password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClasses} />

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-4 p-4 bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? 'Broadcasting...' : 'Submit Application'}
                    </button>
                </form>

                <p className="text-center mt-8 text-sm text-gray-400">
                    Already registered? <Link to="/login" className="text-emerald-400 font-bold hover:text-emerald-300 hover:underline">Log In</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;