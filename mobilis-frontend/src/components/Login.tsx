import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Key, Mail, Lock, ShieldCheck, Zap } from 'lucide-react';
import MobilisLogo from './common/MobilisLogo';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/dashboard');
        } catch (err: unknown) {
            console.error("Login catch block:", err);
            const msg = err instanceof Error ? err.message : "Invalid credentials. Please check your email and password.";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#090A0C] flex flex-col justify-between p-6 sm:p-10 font-sans text-white relative overflow-hidden">
            
            {/* Top Navigation Bar */}
            <div className="w-full max-w-md mx-auto flex items-center justify-between z-10">
                <Link
                    to="/"
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
                <MobilisLogo size={32} showText={false} />
            </div>

            {/* Main Form Container */}
            <div className="w-full max-w-md mx-auto my-auto z-10 bg-[#121418] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto border border-cyan-500/20">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-white">Welcome Back</h2>
                    <p className="text-xs text-gray-400">Sign in to your Mobilis transport wallet</p>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs text-center font-medium">
                        {error}
                    </div>
                )}

                {/* Primary Passkey CTA */}
                <button
                    type="button"
                    onClick={() => setError("Passkey authentication requires registered device hardware. Please sign in using your account email.")}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 text-xs flex items-center justify-center gap-2.5 transition-all"
                >
                    <Key className="w-4 h-4 text-cyan-400" /> Sign In with Passkey / Biometrics
                </button>

                <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                    <div className="h-px bg-white/10 flex-1" />
                    <span>OR EMAIL</span>
                    <div className="h-px bg-white/10 flex-1" />
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    
                    {/* Floating Label Email Input */}
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="email"
                            required
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>

                    {/* Floating Label Password Input */}
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="password"
                            required
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-black rounded-2xl text-sm transition-all shadow-[0_0_20px_rgba(0,210,255,0.3)] flex items-center justify-center gap-2 mt-2"
                    >
                        {isLoading ? (
                            <span className="animate-pulse">Authenticating...</span>
                        ) : (
                            <>
                                <Zap className="w-4 h-4" /> Sign In
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center pt-2">
                    <p className="text-xs text-gray-400">
                        New to Mobilis?{' '}
                        <Link to="/signup" className="text-cyan-400 font-bold hover:underline">
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>

            {/* Bottom Footer */}
            <div className="w-full text-center text-xs text-gray-600 font-mono z-10">
                Mobilis Transport Fintech • Sub-Second Stellar Settlement
            </div>
        </div>
    );
};

export default Login;