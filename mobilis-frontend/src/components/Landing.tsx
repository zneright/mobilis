import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, ArrowRight, Radio, Building2 } from 'lucide-react';
import { EarthCanvas, ShootingStar } from './EarthCanvas';
import MobilisLogo from './common/MobilisLogo';

export default function Landing() {
    const [scrolled, setScrolled] = useState(false);
    const [mediaMode, setMediaMode] = useState<'3d' | 'static'>('3d');

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="relative min-h-screen text-white font-sans overflow-x-hidden bg-[#090A0C]">
            
            {/* Background Glows & Shooting Stars */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[20%] w-[60vw] h-[60vh] bg-cyan-600/10 blur-[140px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[10%] right-[-10%] w-[50vw] h-[50vh] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
                <ShootingStar delay={1} />
                <ShootingStar delay={5} />
            </div>

            <div className="relative z-10">

                {/* Glass Header Navigation */}
                <motion.nav
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                        scrolled
                            ? 'bg-[#090A0C]/80 backdrop-blur-2xl border-b border-white/10 py-3'
                            : 'bg-transparent py-5'
                    }`}
                >
                    <div className="flex items-center justify-between px-6 max-w-7xl mx-auto">
                        <MobilisLogo size={36} showText />

                        <div className="flex items-center gap-3">
                            <Link
                                to="/login"
                                className="px-5 py-2.5 text-xs font-bold tracking-wide text-gray-300 hover:text-white transition-colors"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/signup"
                                className="px-5 py-2.5 text-xs font-black tracking-wide bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                            >
                                Join Mobilis
                            </Link>
                        </div>
                    </div>
                </motion.nav>

                {/* HERO SECTION */}
                <section className="relative pt-36 pb-20 lg:pt-44 lg:pb-32 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7 }}
                        className="space-y-6 text-left"
                    >
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
                            <Zap className="w-3.5 h-3.5" />
                            Stellar Transport Fintech
                        </div>

                        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-white">
                            Move Freely. <br />
                            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                                Earn Instantly.
                            </span>
                        </h1>

                        <p className="text-base sm:text-lg text-gray-400 max-w-lg leading-relaxed">
                            Cashless fare payments, 50-meter transport radar, and Soroban micro-credit advances for drivers & commuters.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <Link
                                to="/signup"
                                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_0_25px_rgba(52,211,153,0.4)]"
                            >
                                Get Started Free <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                to="/login"
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all"
                            >
                                Open Web Wallet
                            </Link>
                        </div>

                        {/* Interactive Canvas Toggle Pill */}
                        <div className="pt-4 flex items-center gap-3 text-xs text-gray-400 font-mono">
                            <span>Display Mode:</span>
                            <button
                                onClick={() => setMediaMode('3d')}
                                className={`px-3 py-1 rounded-lg border transition-all ${
                                    mediaMode === '3d'
                                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold'
                                        : 'bg-white/5 border-white/10 text-gray-400'
                                }`}
                            >
                                🌐 3D Globe
                            </button>
                            <button
                                onClick={() => setMediaMode('static')}
                                className={`px-3 py-1 rounded-lg border transition-all ${
                                    mediaMode === 'static'
                                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold'
                                        : 'bg-white/5 border-white/10 text-gray-400'
                                }`}
                            >
                                ⚡ Performance Mode
                            </button>
                        </div>
                    </motion.div>

                    {/* Right Media Column */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="relative w-full h-[380px] sm:h-[480px] rounded-[2.5rem] bg-[#121418] border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center"
                    >
                        {mediaMode === '3d' ? (
                            <EarthCanvas />
                        ) : (
                            <div className="p-8 text-center space-y-4">
                                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                                    <Radio className="w-10 h-10 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-black text-white">Live Transport Radar Active</h3>
                                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                                    50-meter GPS radar discovery with real-time PHP to Stellar XLM fare settlement.
                                </p>
                            </div>
                        )}
                    </motion.div>
                </section>

                {/* BENTO GRID VALUE PROPOSITIONS */}
                <section className="py-20 px-6 max-w-7xl mx-auto">
                    <div className="text-center space-y-3 mb-12">
                        <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
                            Ecosystem Capabilities
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                            Built For Public Transport
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Bento Card 1: Radar */}
                        <div className="p-8 rounded-[2rem] bg-[#121418] border border-white/10 space-y-4 hover:border-emerald-500/40 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                                <Radio className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-white">50m Sonar Radar</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Commuters discover nearby active drivers within 50 meters and pay instant fares with real-time PHP equivalent conversion.
                            </p>
                        </div>

                        {/* Bento Card 2: Stellar */}
                        <div className="p-8 rounded-[2rem] bg-[#121418] border border-white/10 space-y-4 hover:border-emerald-500/40 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-white">Stellar Blockchain</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Sub-second transaction settlement with immutable proof receipts recorded on Stellar Testnet.
                            </p>
                        </div>

                        {/* Bento Card 3: Soroban Credit */}
                        <div className="p-8 rounded-[2rem] bg-[#121418] border border-white/10 space-y-4 hover:border-emerald-500/40 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-white">Cooperative Credit</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Cooperative Admins verify member drivers and issue smart contract loan advances via Soroban.
                            </p>
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="py-12 border-t border-white/10 text-center text-xs text-gray-500 font-mono">
                    <p>© 2026 Mobilis Platform • Stellar Transport Micro-Credit</p>
                </footer>

            </div>
        </div>
    );
}