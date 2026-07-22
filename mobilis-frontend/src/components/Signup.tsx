import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Keypair } from '@stellar/stellar-sdk';
import { requestAccess, isConnected } from '@stellar/freighter-api';
import { AlertTriangle, Copy, CheckCircle2, Wallet, UserCheck, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import type { UserData } from '../types';
import { trackWalletCreated } from '../services/analytics';
import MobilisLogo from './common/MobilisLogo';

declare global {
    interface Window {
        lobstr: unknown;
    }
}

const Signup: React.FC = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [role, setRole] = useState<'driver' | 'admin' | 'commuter'>('driver');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Shared Details
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    const [vehicleType, setVehicleType] = useState<'Jeepney' | 'Tricycle' | 'UV Express' | 'Bus' | 'E-Vehicle' | 'Motorcycle'>('Tricycle');

    // TODA / Cooperative Selection strictly from Firebase Firestore
    const [todaAffiliation, setTodaAffiliation] = useState('');
    const [approvedCoops, setApprovedCoops] = useState<string[]>([]);
    const [filteredCoops, setFilteredCoops] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // Cooperative Admin Specific
    const [coopName, setCoopName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [adminWalletMethod, setAdminWalletMethod] = useState<'freighter' | 'lobstr' | 'generate'>('generate');

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
    const navigate = useNavigate();

    // Fetch REAL Cooperative Admins strictly from Firebase Firestore
    useEffect(() => {
        const fetchRealFirebaseCoops = async () => {
            try {
                const q = query(
                    collection(db, 'users'),
                    where('role', '==', 'admin')
                );
                const snapshot = await getDocs(q);
                const realCoops = snapshot.docs
                    .map((docSnap) => docSnap.data().coopName as string)
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
                // Drivers and Commuters get custodial Stellar wallets
                const pair = Keypair.random();
                publicKey = pair.publicKey();
                secret = pair.secret();
                fetch(`https://friendbot.stellar.org?addr=${publicKey}`).catch(console.error);
            }

            // Create Firebase Auth User
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
                    todaAffiliation: todaAffiliation.trim(),
                    vehicleType: vehicleType
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

            // Store user doc in Firestore
            await setDoc(doc(db, 'users', user.uid), finalUserData);
            trackWalletCreated(role, publicKey);

            if (generatedKeyToDisplay) {
                setGeneratedSecret(generatedKeyToDisplay);
                setIsLoading(false);
                return;
            }

            navigate('/dashboard');
        } catch (err: unknown) {
            console.error("Signup Catch Block:", err);
            const errorMessage = err instanceof Error ? err.message : "An error occurred during account creation.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "w-full p-4 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 outline-none focus:border-cyan-500 transition-colors text-sm font-sans";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#090A0C] flex flex-col justify-between p-6 sm:p-10 font-sans text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-300">
            
            {/* Top Progress Bar */}
            <div className="fixed top-0 left-0 right-0 h-1.5 bg-slate-200 dark:bg-white/10 z-50">
                <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${(step / 3) * 100}%` }}
                />
            </div>

            {/* Header */}
            <div className="w-full max-w-lg mx-auto flex items-center justify-between z-10 pt-4">
                {step > 1 ? (
                    <button
                        onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                        className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all flex items-center gap-2 text-xs font-bold shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                ) : (
                    <Link to="/" className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-bold shadow-sm">
                        Home
                    </Link>
                )}
                <MobilisLogo size={32} showText={false} />
            </div>

            {/* Modal for Admin Secret Key */}
            {generatedSecret && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-4">
                        <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-2">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Save Treasury Key</h3>
                        <p className="text-slate-500 dark:text-gray-400 text-xs">
                            This key provides full control over your Cooperative Treasury wallet. Store it securely.
                        </p>
                        
                        <div className="p-4 bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-2xl font-mono text-xs text-amber-600 dark:text-amber-300 break-all">
                            {generatedSecret}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button onClick={() => navigator.clipboard.writeText(generatedSecret)} className="flex-1 py-4 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-xs transition-all">
                                <Copy className="w-4 h-4" /> Copy Key
                            </button>
                            <button onClick={() => navigate('/dashboard')} className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl flex items-center justify-center gap-2 text-xs transition-all shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                                <CheckCircle2 className="w-5 h-5" /> Saved & Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Wizard Card Container */}
            <motion.div
                key={step}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-lg mx-auto my-auto z-10 bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 transition-colors duration-300"
            >
                
                <div className="text-center space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                        Step {step} of 3
                    </span>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        {step === 1 ? 'Select Your Account Role' : step === 2 ? 'Account Credentials' : 'Role Specifications'}
                    </h2>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs text-center font-medium">
                        {error}
                    </div>
                )}

                {/* STEP 1: ROLE SELECTION CARDS */}
                {step === 1 && (
                    <div className="space-y-3">
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setRole('driver')}
                            className={`w-full p-5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                                role === 'driver'
                                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400 shadow-md font-bold'
                                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className="text-3xl">🛺</span>
                                <div>
                                    <h4 className="font-black text-base text-slate-900 dark:text-white">Transport Driver</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Receive fares & request micro-loans</p>
                                </div>
                            </div>
                            {role === 'driver' && <CheckCircle2 className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />}
                        </motion.button>

                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setRole('commuter')}
                            className={`w-full p-5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                                role === 'commuter'
                                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400 shadow-md font-bold'
                                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className="text-3xl">🚶</span>
                                <div>
                                    <h4 className="font-black text-base text-slate-900 dark:text-white">Commuter</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Pay transport fares via radar</p>
                                </div>
                            </div>
                            {role === 'commuter' && <CheckCircle2 className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />}
                        </motion.button>

                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setRole('admin')}
                            className={`w-full p-5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                                role === 'admin'
                                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400 shadow-md font-bold'
                                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className="text-3xl">🏢</span>
                                <div>
                                    <h4 className="font-black text-base text-slate-900 dark:text-white">Cooperative Admin</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Verify drivers & manage TODA fleet</p>
                                </div>
                            </div>
                            {role === 'admin' && <CheckCircle2 className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />}
                        </motion.button>

                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="w-full py-4 mt-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-2xl text-sm transition-all shadow-[0_0_20px_rgba(0,210,255,0.3)] flex items-center justify-center gap-2 hover:scale-[1.02]"
                        >
                            Continue <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* STEP 2: CREDENTIALS */}
                {step === 2 && (
                    <div className="space-y-4">
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={inputClasses}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={inputClasses}
                        />

                        <button
                            type="button"
                            onClick={() => {
                                if (!email || !password) {
                                    setError("Please enter your email and password.");
                                    return;
                                }
                                setError("");
                                setStep(3);
                            }}
                            className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-2xl text-sm transition-all shadow-[0_0_20px_rgba(0,210,255,0.3)] flex items-center justify-center gap-2 hover:scale-[1.02]"
                        >
                            Next Step <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* STEP 3: ROLE SPECIFICS & EXECUTION */}
                {step === 3 && (
                    <form onSubmit={handleSignup} className="space-y-4">
                        {role === 'driver' && (
                            <>
                                <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputClasses} />
                                <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputClasses} />
                                <input type="text" placeholder="Plate Number (e.g., ABC-1234)" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} required className={inputClasses} />
                                
                                <div>
                                    <label className="block text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider mb-1.5">
                                        Select Cooperative Transportation Vehicle Type
                                    </label>
                                    <select
                                        value={vehicleType}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        onChange={(e) => setVehicleType(e.target.value as any)}
                                        className={inputClasses}
                                    >
                                        <option value="Jeepney">🛻 Traditional Jeepney (JODA Cooperative)</option>
                                        <option value="E-Jeepney">⚡🚍 Modern E-Jeepney (Transport Cooperative)</option>
                                        <option value="Tricycle">🛺 Toda Tricycle (TODA Cooperative)</option>
                                        <option value="E-Trike">⚡🛺 Electric E-Trike (Eco Mobility)</option>
                                        <option value="UV Express">🚐 UV Express / Shuttle Van (UVODA)</option>
                                        <option value="Bus">🚌 Public Utility Bus (PUB Cooperative)</option>
                                        <option value="E-Vehicle">🚙 E-Vehicle (Electric Mobility)</option>
                                        <option value="Motorcycle">🛵 Motorcycle Taxi (Habal-Habal Coop)</option>
                                    </select>
                                </div>
                                
                                <div className="relative">
                                    <label className="block text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider mb-1.5">
                                        Select Firebase Registered Cooperative
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Search Cooperative Admin..."
                                        value={todaAffiliation}
                                        onChange={handleTodaSearch}
                                        onFocus={() => setShowDropdown(true)}
                                        required
                                        className={inputClasses}
                                    />
                                    {showDropdown && (
                                        <ul className="absolute top-[105%] left-0 w-full bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-2xl max-h-48 overflow-y-auto z-50 shadow-2xl custom-scrollbar text-slate-900 dark:text-white">
                                            {filteredCoops.length > 0 ? (
                                                filteredCoops.map((coop, idx) => (
                                                    <li
                                                        key={idx}
                                                        onClick={() => handleSelectCoop(coop)}
                                                        className="p-4 cursor-pointer hover:bg-cyan-500/20 font-semibold border-b border-slate-100 dark:border-white/5 last:border-none transition-colors flex items-center gap-2"
                                                    >
                                                        <Building2 className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                                                        <span>{coop}</span>
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="p-4 text-slate-500 dark:text-slate-400 text-xs italic">
                                                    No Cooperative Admin registered in Firebase yet. Your Cooperative Admin must register a Coop Admin account first.
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
                                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-3">
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
                                    <label className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">Treasury Key Provisioning</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button type="button" onClick={() => setAdminWalletMethod('generate')} className={`p-3 rounded-xl border text-xs font-bold transition-all ${adminWalletMethod === 'generate' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400'}`}>
                                            🔑 Auto Generate
                                        </button>
                                        <button type="button" onClick={() => setAdminWalletMethod('freighter')} className={`p-3 rounded-xl border text-xs font-bold transition-all ${adminWalletMethod === 'freighter' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400'}`}>
                                            🚀 Freighter
                                        </button>
                                        <button type="button" onClick={() => setAdminWalletMethod('lobstr')} className={`p-3 rounded-xl border text-xs font-bold transition-all ${adminWalletMethod === 'lobstr' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400'}`}>
                                            🦞 LOBSTR
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        <button type="submit" disabled={isLoading} className="w-full py-4 mt-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black rounded-2xl text-sm transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center justify-center gap-2 hover:scale-[1.02]">
                            {isLoading ? (
                                <span className="animate-pulse">Provisioning Custodial Wallet...</span>
                            ) : (
                                <>
                                    <Wallet className="w-4 h-4" /> Create Account & Provision Keys
                                </>
                            )}
                        </button>
                    </form>
                )}

                <div className="text-center pt-2">
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline">
                            Sign In
                        </Link>
                    </p>
                </div>
            </motion.div>

            {/* Bottom Footer */}
            <div className="w-full text-center text-xs text-slate-400 dark:text-gray-600 font-mono z-10">
                Mobilis Onboarding Wizard • Encrypted Key Provisioning
            </div>
        </div>
    );
};

export default Signup;