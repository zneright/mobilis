import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Keypair } from '@stellar/stellar-sdk';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Lock, ShieldCheck, Zap, Eye, EyeOff, UserCheck, Navigation, Building2, Fingerprint, Sparkles } from 'lucide-react';
import MobilisLogo from './common/MobilisLogo';
import { useAuth } from '../context/AuthContext';
import { getFriendbotUrl } from '../services/networkConfig';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
    
    const navigate = useNavigate();
    const { isPasskeySupported, loginWithPasskey } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/dashboard');
        } catch (err: unknown) {
            console.warn("Standard login failed, evaluating demo auto-provisioning fallback:", err);
            
            // If this is a demo environment and account doesn't exist yet, auto-provision it for immediate evaluator access
            if (import.meta.env.VITE_DEMO_MODE === 'true' && email.endsWith('@mobilis.ph')) {
                try {
                    const cred = await createUserWithEmailAndPassword(auth, email, password);
                    const user = cred.user;
                    const pair = Keypair.random();
                    const role = email.includes('driver') ? 'driver' : email.includes('admin') ? 'admin' : 'commuter';

                    const secret = pair.secret();
                    localStorage.setItem(`mobilis_wallet_secret_${user.uid}`, secret);

                    const demoDoc = {
                        uid: user.uid,
                        email: user.email || email,
                        role,
                        status: 'approved',
                        publicKey: pair.publicKey(),
                        fullName: role === 'driver' ? 'Juan Driver Demo' : role === 'admin' ? 'Bacoor TODA Admin' : 'Maria Commuter Demo',
                        phone: '09171234567',
                        plateNumber: role === 'driver' ? 'TODA-888' : undefined,
                        todaAffiliation: 'Bacoor TODA Association',
                        vehicleType: 'Tricycle',
                        coopName: role === 'admin' ? 'Bacoor TODA Association' : undefined,
                    };

                    await setDoc(doc(db, 'users', user.uid), demoDoc);
                    const friendbot = getFriendbotUrl();
                    if (friendbot) {
                        fetch(`${friendbot}?addr=${pair.publicKey()}`).catch(() => {});
                    }
                    navigate('/dashboard');
                    return;
                } catch (autoErr) {
                    console.error("Demo auto-provisioning error:", autoErr);
                }
            }

            const msg = err instanceof Error ? err.message : "Invalid credentials. Please check your email and password.";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasskeyLogin = async () => {
        setIsPasskeyLoading(true);
        setError('');
        try {
            await loginWithPasskey();
            navigate('/dashboard');
        } catch (err: unknown) {
            console.error("Passkey login failed:", err);
            setError(err instanceof Error ? err.message : "Passkey authentication failed. Please try password login.");
        } finally {
            setIsPasskeyLoading(false);
        }
    };

    const fillDemoRole = (role: 'driver' | 'commuter' | 'admin') => {
        if (role === 'driver') {
            setEmail('driver.demo@mobilis.ph');
            setPassword('Password123!');
        } else if (role === 'commuter') {
            setEmail('commuter.demo@mobilis.ph');
            setPassword('Password123!');
        } else {
            setEmail('admin.demo@mobilis.ph');
            setPassword('Password123!');
        }
        setError('');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#090A0C] flex flex-col justify-between p-6 sm:p-10 font-sans text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-300">
            
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[10%] left-[30%] w-[40vw] h-[40vh] bg-cyan-500/10 blur-[120px] rounded-full" />
            </div>

            {/* Top Navigation Bar */}
            <div className="w-full max-w-md mx-auto flex items-center justify-between z-10">
                <Link
                    to="/"
                    className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all flex items-center gap-2 text-xs font-bold shadow-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
                <MobilisLogo size={32} showText={false} />
            </div>

            {/* Main Form Container */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-md mx-auto my-auto z-10 bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 transition-colors duration-300"
            >
                
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center mx-auto border border-cyan-500/20 shadow-sm">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Welcome Back</h2>
                    <p className="text-xs text-slate-500 dark:text-gray-400">Sign in to your Mobilis smart wallet</p>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs text-center font-medium">
                        {error}
                    </div>
                )}

                {/* 1-TAP WEBAUTHN PASSKEY BIOMETRIC LOGIN */}
                {isPasskeySupported && (
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={handlePasskeyLogin}
                            disabled={isPasskeyLoading}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 hover:opacity-95 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2.5 active:scale-98 font-mono"
                        >
                            <Fingerprint className="w-5 h-5" />
                            <span>{isPasskeyLoading ? 'Authenticating Biometrics...' : '1-Tap Passkey Sign-In (FaceID / TouchID)'}</span>
                        </button>
                        
                        <div className="relative flex py-1 items-center">
                            <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
                            <span className="flex-shrink mx-3 text-[10px] uppercase font-mono tracking-widest text-slate-400">or sign in with password</span>
                            <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
                        </div>
                    </div>
                )}

                {/* Evaluator Demo Switcher */}
                <div className="p-3 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-2xl space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block text-center flex items-center justify-center gap-1">
                        <Sparkles className="w-3 h-3" /> Quick Demo Autofill
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                        <button
                            type="button"
                            onClick={() => fillDemoRole('commuter')}
                            className="p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-cyan-500/10 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-700 dark:text-gray-300 flex items-center justify-center gap-1 transition-all"
                        >
                            <UserCheck className="w-3 h-3 text-emerald-500" /> Commuter
                        </button>
                        <button
                            type="button"
                            onClick={() => fillDemoRole('driver')}
                            className="p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-cyan-500/10 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-700 dark:text-gray-300 flex items-center justify-center gap-1 transition-all"
                        >
                            <Navigation className="w-3 h-3 text-cyan-500" /> Driver
                        </button>
                        <button
                            type="button"
                            onClick={() => fillDemoRole('admin')}
                            className="p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-cyan-500/10 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-700 dark:text-gray-300 flex items-center justify-center gap-1 transition-all"
                        >
                            <Building2 className="w-3 h-3 text-violet-500" /> Coop Admin
                        </button>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    
                    {/* Floating Label Email Input */}
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-gray-500" />
                        <input
                            type="email"
                            required
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 outline-none focus:border-cyan-500 transition-colors font-sans"
                        />
                    </div>

                    {/* Floating Label Password Input with Show/Hide */}
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-gray-500" />
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 outline-none focus:border-cyan-500 transition-colors font-sans"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-black rounded-2xl text-sm transition-all shadow-[0_0_20px_rgba(0,210,255,0.3)] flex items-center justify-center gap-2 mt-2 hover:scale-[1.02] active:scale-98"
                    >
                        {isLoading ? (
                            <span className="animate-pulse">Authenticating...</span>
                        ) : (
                            <>
                                <Zap className="w-4 h-4" /> Sign In with Email
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center pt-2">
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                        New to Mobilis?{' '}
                        <Link to="/signup" className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline">
                            Create Smart Wallet
                        </Link>
                    </p>
                </div>
            </motion.div>

            {/* Bottom Footer */}
            <div className="w-full text-center text-xs text-slate-400 dark:text-gray-600 font-mono z-10">
                Mobilis Transport Fintech • Sub-Second Stellar Settlement & WebAuthn Security
            </div>
        </div>
    );
};

export default Login;