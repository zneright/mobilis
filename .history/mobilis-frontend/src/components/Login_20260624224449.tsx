// src/components/Login.tsx
import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Fuel, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/dashboard');
        } catch {
            setError("Failed to sign in. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#060610] flex flex-col items-center justify-center p-4 sm:p-8 font-sans text-white relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-emerald-600/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md bg-[#0a0a14]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 sm:p-10 shadow-2xl relative z-10">
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                        <Fuel className="w-6 h-6 text-white" />
                    </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-center mb-2 tracking-tight">Welcome Back</h2>
                <p className="text-gray-400 text-center text-sm mb-8">Sign in to access the Mobilis network.</p>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-2 p-4 bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? 'Decrypting...' : 'Log In'}
                        {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                </form>

                <p className="text-center mt-8 text-sm text-gray-400">
                    Need an account? <Link to="/signup" className="text-emerald-400 font-bold hover:text-emerald-300 hover:underline">Sign Up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;