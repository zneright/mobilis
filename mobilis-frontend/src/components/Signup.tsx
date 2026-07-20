import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Keypair } from '@stellar/stellar-sdk';
import { requestAccess, isConnected } from '@stellar/freighter-api';
import { AlertTriangle, Copy, CheckCircle2, Wallet, UserCheck, Building2 } from 'lucide-react';
import type { UserData } from '../types';
import { trackWalletCreated } from '../services/analytics';
import MobilisLogo from './common/MobilisLogo';

declare global {
    interface Window {
        lobstr: unknown;
    }
}

const Signup: React.FC = () => {
    const [role, setRole] = useState<'driver' | 'admin' | 'commuter'>('driver');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Driver & Commuter Shared Fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [plateNumber, setPlateNumber] = useState('');

    // TODA / Cooperative Selection strictly from Firebase Firestore
    const [todaAffiliation, setTodaAffiliation] = useState('');
    const [approvedCoops, setApprovedCoops] = useState<string[]>([]);
    const [filteredCoops, setFilteredCoops] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // Cooperative Admin Specific Fields
    const [coopName, setCoopName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [adminWalletMethod, setAdminWalletMethod] = useState<'freighter' | 'lobstr' | 'generate'>('generate');

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
    const navigate = useNavigate();

    // Fetch REAL Cooperative Admins strictly from Firebase Firestore (Zero Mockups)
    useEffect(() => {
        const fetchRealFirebaseCoops = async () => {
            try {
                const q = query(
                    collection(db, 'users'),
                    where('role', '==', 'admin')
                );
                const snapshot = await getDocs(q);
                const realCoops = snapshot.docs
                    .map((doc) => doc.data().coopName as string)
                    .filter((name): name is string => Boolean(name && name.trim().length > 0));

                const uniqueCoops = Array.from(new Set(realCoops));
                setApprovedCoops(uniqueCoops);
                setFilteredCoops(uniqueCoops);
            } catch {
                setApprovedCoops([]);
                setFilteredCoops([]);
            }
        };
        fetchRealFirebaseCoops();
    }, []);

    const handleTodaSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setTodaAffiliation(value);
        const matches = approvedCoops.filter((coop) =>
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

        try {
            let publicKey = '';
            let secret = '';
            let generatedKeyToDisplay = null;

            if (role === 'admin') {
                if (adminWalletMethod === 'freighter') {
                    if (await isConnected()) {
                        const pk = await requestAccess();
                        publicKey = typeof pk === 'string' ? pk : (pk as { address: string }).address;
                    } else throw new Error("Freighter extension not found or access denied.");
                } else if (adminWalletMethod === 'lobstr') {
                    if (window.lobstr) {
                        publicKey = await (window.lobstr as { requestAccess: () => Promise<string> }).requestAccess();
                    } else throw new Error("LOBSTR extension not found.");
                } else if (adminWalletMethod === 'generate') {
                    const pair = Keypair.random();
                    publicKey = pair.publicKey();
                    secret = pair.secret();
                    generatedKeyToDisplay = secret;
                }
            } else {
                // Drivers and Commuters get auto-generated custodial Stellar wallets
                const pair = Keypair.random();
                publicKey = pair.publicKey();
                secret = pair.secret();
                fetch(`https://friendbot.stellar.org?addr=${publicKey}`).catch(console.error);
            }

            // Create Firebase Authentication User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const baseData = {
                uid: user.uid,
                email: user.email || email,
                role: role,
                status: role === 'commuter' ? 'approved' : 'pending',
                publicKey,
                secret
            };

            let finalUserData: UserData;

            if (role === 'driver') {
                finalUserData = {
                    ...baseData,
                    fullName: fullName.trim(),
                    phone: phone.trim(),
                    plateNumber: plateNumber.trim(),
                    todaAffiliation: todaAffiliation.trim()
                } as UserData;
            } else if (role === 'commuter') {
                finalUserData = {
                    ...baseData,
                    fullName: fullName.trim() || 'Commuter User'
                } as UserData;
            } else {
                finalUserData = {
                    ...baseData,
                    coopName: coopName.trim(),
                    contactPerson: contactPerson.trim(),
                    phone: phone.trim(),
                    registrationNumber: registrationNumber.trim()
                } as UserData;
            }

            // Store user document strictly in Firebase Firestore
            await setDoc(doc(db, 'users', user.uid), finalUserData);
            trackWalletCreated(role, publicKey);

            if (generatedKeyToDisplay) {
                setGeneratedSecret(generatedKeyToDisplay);
                setIsLoading(false);
                return;
            }

            navigate('/dashboard');
        } catch (err: unknown) {
            console.error("Signup Catch Block Triggered:", err);
            const errorMessage = err instanceof Error ? err.message : "An error occurred during account creation.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors text-sm font-sans";

    return (
        <div className="min-h-screen bg-[#060610] flex flex-col items-center justify-center p-4 sm:p-8 font-sans text-white relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-[10%] right-[30%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Key Storage Modal for Admin Key Generation */}
            {generatedSecret && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#0a0a14] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
                        <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mb-4">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Save Secret Key</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            This key provides full control over your Cooperative Treasury wallet. Store it securely.
                        </p>
                        
                        <div className="p-4 bg-black/50 border border-white/10 rounded-xl font-mono text-xs text-amber-300 break-all mb-6">
                            {generatedSecret}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={() => navigator.clipboard.writeText(generatedSecret)} className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                                <Copy className="w-4 h-4" /> Copy Key
                            </button>
                            <button onClick={() => navigate('/dashboard')} className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                                <CheckCircle2 className="w-5 h-5" /> I Saved It
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full max-w-lg bg-[#0a0a14]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 sm:p-10 shadow-2xl">
                <div className="flex justify-center mb-4">
                    <MobilisLogo size={48} showText />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-center mb-6 tracking-tight text-gray-300">Deploy Transport Account</h2>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="flex flex-col gap-4">
                    {/* Segmented Control for Role */}
                    <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl mb-2">
                        <button type="button" onClick={() => setRole('driver')} className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-lg transition-all ${role === 'driver' ? 'bg-emerald-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}>
                            🛺 Driver
                        </button>
                        <button type="button" onClick={() => setRole('commuter')} className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-lg transition-all ${role === 'commuter' ? 'bg-emerald-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}>
                            🚶 Commuter
                        </button>
                        <button type="button" onClick={() => setRole('admin')} className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-lg transition-all ${role === 'admin' ? 'bg-emerald-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}>
                            🏢 Coop Admin
                        </button>
                    </div>

                    <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClasses} />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClasses} />

                    {role === 'driver' && (
                        <>
                            <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputClasses} />
                            <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputClasses} />
                            <input type="text" placeholder="Plate Number (e.g., ABC-1234)" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} required className={inputClasses} />
                            
                            <div className="relative">
                                <label className="block text-xs text-gray-400 font-bold mb-1.5 uppercase tracking-wider">
                                    Select Registered Firebase Cooperative / TODA
                                </label>
                                <input
                                    type="text"
                                    placeholder="Search or Select Cooperative Admin Name..."
                                    value={todaAffiliation}
                                    onChange={handleTodaSearch}
                                    onFocus={() => setShowDropdown(true)}
                                    required
                                    className={inputClasses}
                                />
                                {showDropdown && (
                                    <ul className="absolute top-[105%] left-0 w-full bg-[#161622] border border-white/10 rounded-xl max-h-48 overflow-y-auto z-50 shadow-2xl custom-scrollbar">
                                        {filteredCoops.length > 0 ? (
                                            filteredCoops.map((coop, idx) => (
                                                <li
                                                    key={idx}
                                                    onClick={() => handleSelectCoop(coop)}
                                                    className="p-4 cursor-pointer hover:bg-emerald-500/20 text-white font-semibold border-b border-white/5 last:border-none transition-colors flex items-center gap-2"
                                                >
                                                    <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                    <span>{coop}</span>
                                                </li>
                                            ))
                                        ) : (
                                            <li className="p-4 text-slate-400 text-xs italic">
                                                No Cooperative Admin registered in Firebase yet. Your Cooperative Admin must register a Coop Admin account first to approve driver funding.
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}

                    {role === 'commuter' && (
                        <>
                            <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputClasses} />
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-3">
                                <UserCheck className="w-5 h-5 flex-shrink-0" />
                                <span>Instant Commuter Pass: Your Stellar transport wallet will be provisioned automatically.</span>
                            </div>
                        </>
                    )}

                    {role === 'admin' && (
                        <>
                            <input type="text" placeholder="Cooperative Name (e.g. Pasig Central TODA)" value={coopName} onChange={(e) => setCoopName(e.target.value)} required className={inputClasses} />
                            <input type="text" placeholder="Contact Person Name" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required className={inputClasses} />
                            <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputClasses} />
                            <input type="text" placeholder="CDA Registration / TODA License No." value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} required className={inputClasses} />

                            <div className="flex flex-col gap-2 mt-2">
                                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Treasury Key Provisioning</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button type="button" onClick={() => setAdminWalletMethod('generate')} className={`p-3 rounded-xl border text-xs font-bold transition-all ${adminWalletMethod === 'generate' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                                        🔑 Auto Generate
                                    </button>
                                    <button type="button" onClick={() => setAdminWalletMethod('freighter')} className={`p-3 rounded-xl border text-xs font-bold transition-all ${adminWalletMethod === 'freighter' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                                        🚀 Freighter
                                    </button>
                                    <button type="button" onClick={() => setAdminWalletMethod('lobstr')} className={`p-3 rounded-xl border text-xs font-bold transition-all ${adminWalletMethod === 'lobstr' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                                        🦞 LOBSTR
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <button type="submit" disabled={isLoading} className="w-full py-4 mt-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-black rounded-xl text-base transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center justify-center gap-2">
                        {isLoading ? (
                            <span className="animate-pulse">Provisioning Account...</span>
                        ) : (
                            <>
                                <Wallet className="w-5 h-5" /> Initialize Account
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-gray-400">
                    Already registered?{' '}
                    <Link to="/login" className="text-emerald-400 hover:underline font-bold">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;