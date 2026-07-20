import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
    Zap,
    ShieldCheck,
    ArrowRight,
    Radio,
    Building2,
    Cpu,
    Database,
    Layers,
    Lock,
    CheckCircle2,
    Receipt,
    Megaphone,
    Activity,
    Code,
    Sparkles
} from 'lucide-react';
import { EarthCanvas, ShootingStar } from './EarthCanvas';
import MobilisLogo from './common/MobilisLogo';

// Professional Motion Variants
const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 35 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
};

const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
    }
};

export default function Landing() {
    const [scrolled, setScrolled] = useState(false);
    const [mediaMode, setMediaMode] = useState<'3d' | 'static'>('3d');
    const [activeArchTab, setActiveArchTab] = useState<'frontend' | 'blockchain' | 'backend'>('frontend');

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="relative min-h-screen text-slate-900 dark:text-white font-sans overflow-x-hidden bg-slate-50 dark:bg-[#090A0C] transition-colors duration-300">
            
            {/* Ambient Background Glows & Shooting Stars */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[20%] w-[60vw] h-[60vh] bg-cyan-500/10 dark:bg-cyan-500/15 blur-[150px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[10%] right-[-10%] w-[50vw] h-[50vh] bg-emerald-500/10 dark:bg-emerald-500/15 blur-[130px] rounded-full pointer-events-none" />
                <ShootingStar delay={1} />
                <ShootingStar delay={4.5} />
                <ShootingStar delay={8} />
            </div>

            <div className="relative z-10">

                {/* Glass Header Navigation */}
                <motion.nav
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                        scrolled
                            ? 'bg-white/90 dark:bg-[#090A0C]/85 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10 py-3 shadow-md'
                            : 'bg-transparent py-5'
                    }`}
                >
                    <div className="flex items-center justify-between px-6 max-w-7xl mx-auto">
                        <MobilisLogo size={36} showText />

                        <div className="flex items-center gap-3">
                            <Link
                                to="/login"
                                className="px-5 py-2.5 text-xs font-bold tracking-wide text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/signup"
                                className="px-5 py-2.5 text-xs font-black tracking-wide bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:scale-105"
                            >
                                Join Mobilis
                            </Link>
                        </div>
                    </div>
                </motion.nav>

                {/* HERO SECTION */}
                <section className="relative pt-36 pb-20 lg:pt-44 lg:pb-32 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="space-y-6 text-left"
                    >
                        <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            Stellar Transport Fintech Ecosystem
                        </motion.div>

                        <motion.h1 variants={fadeInUp} className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-slate-900 dark:text-white">
                            Move Freely. <br />
                            <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent animate-pulse">
                                Earn Instantly.
                            </span>
                        </motion.h1>

                        <motion.p variants={fadeInUp} className="text-base sm:text-lg text-slate-600 dark:text-gray-400 max-w-lg leading-relaxed">
                            The Philippine transport fintech powered by Stellar Horizon RPC, 50-meter GPS Sonar Radar, Soroban Micro-Credit Advances, and real-time ₱ PHP fare settlements.
                        </motion.p>

                        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 pt-2">
                            <Link
                                to="/signup"
                                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_0_25px_rgba(52,211,153,0.4)] hover:scale-105"
                            >
                                Launch App Free <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                to="/login"
                                className="px-8 py-4 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105"
                            >
                                Open Web Wallet
                            </Link>
                        </motion.div>

                        {/* Interactive Display Mode Selector */}
                        <motion.div variants={fadeInUp} className="pt-4 flex items-center gap-3 text-xs text-slate-500 dark:text-gray-400 font-mono">
                            <span>Display Canvas:</span>
                            <button
                                onClick={() => setMediaMode('3d')}
                                className={`px-3 py-1 rounded-lg border transition-all ${
                                    mediaMode === '3d'
                                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold shadow-sm'
                                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400'
                                }`}
                            >
                                🌐 3D Globe Mode
                            </button>
                            <button
                                onClick={() => setMediaMode('static')}
                                className={`px-3 py-1 rounded-lg border transition-all ${
                                    mediaMode === 'static'
                                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold shadow-sm'
                                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400'
                                }`}
                            >
                                ⚡ Performance Radar
                            </button>
                        </motion.div>
                    </motion.div>

                    {/* Right Media Canvas */}
                    <motion.div
                        variants={scaleIn}
                        initial="hidden"
                        animate="visible"
                        className="relative w-full h-[380px] sm:h-[480px] rounded-[2.5rem] bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl flex items-center justify-center transition-colors duration-300"
                    >
                        {mediaMode === '3d' ? (
                            <EarthCanvas />
                        ) : (
                            <div className="p-8 text-center space-y-4">
                                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                                    <Radio className="w-10 h-10 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Live Transport Radar Active</h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400 max-w-xs mx-auto">
                                    50-meter GPS radar discovery with real-time PHP to Stellar XLM fare settlement.
                                </p>
                            </div>
                        )}
                    </motion.div>
                </section>

                {/* BENTO GRID VALUE PROPOSITIONS WITH HOVER SCALING */}
                <section className="py-20 px-6 max-w-7xl mx-auto space-y-12">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                        className="text-center space-y-3"
                    >
                        <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            Core Capabilities
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                            Built For Public Transport Ecosystems
                        </h2>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={staggerContainer}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                        
                        {/* Bento Card 1: Radar */}
                        <motion.div
                            variants={fadeInUp}
                            whileHover={{ y: -8, scale: 1.02 }}
                            className="p-8 rounded-[2rem] bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 space-y-4 hover:border-emerald-500/50 transition-all shadow-xl hover:shadow-2xl"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                                <Radio className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">50m Sonar Radar</h3>
                            <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
                                Commuters discover nearby active drivers broadcasting GPS within a 50-meter radius, paying instant fares with ₱ PHP real-time equivalency.
                            </p>
                        </motion.div>

                        {/* Bento Card 2: Stellar */}
                        <motion.div
                            variants={fadeInUp}
                            whileHover={{ y: -8, scale: 1.02 }}
                            className="p-8 rounded-[2rem] bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 space-y-4 hover:border-emerald-500/50 transition-all shadow-xl hover:shadow-2xl"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Stellar Blockchain</h3>
                            <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
                                Sub-second transaction settlement on the Stellar Testnet ledger with official digital payment receipt cards (`OR-XXXXX`).
                            </p>
                        </motion.div>

                        {/* Bento Card 3: Soroban Credit */}
                        <motion.div
                            variants={fadeInUp}
                            whileHover={{ y: -8, scale: 1.02 }}
                            className="p-8 rounded-[2rem] bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 space-y-4 hover:border-emerald-500/50 transition-all shadow-xl hover:shadow-2xl"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Cooperative Credit</h3>
                            <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
                                Cooperative Admins verify member drivers and issue automated Soroban smart contract micro-loan advances.
                            </p>
                        </motion.div>
                    </motion.div>
                </section>

                {/* ARCHITECTURE & TECHNICAL MATRIX SHOWCASE */}
                <section className="py-20 px-6 max-w-7xl mx-auto space-y-12 border-t border-slate-200 dark:border-white/10">
                    <div className="text-center space-y-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                            Technical Architecture
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                            System Technology Stack
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-gray-400 max-w-xl mx-auto font-mono">
                            Designed with native app performance, decentralized ledger security, and real-time state synchronization.
                        </p>
                    </div>

                    {/* Architecture Sub-Category Selector */}
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => setActiveArchTab('frontend')}
                            className={`px-5 py-2.5 rounded-2xl text-xs font-bold font-mono transition-all border ${
                                activeArchTab === 'frontend'
                                    ? 'bg-cyan-500 text-black border-cyan-400 font-black shadow-md'
                                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5 inline mr-1.5" /> Presentation & UI
                        </button>
                        <button
                            onClick={() => setActiveArchTab('blockchain')}
                            className={`px-5 py-2.5 rounded-2xl text-xs font-bold font-mono transition-all border ${
                                activeArchTab === 'blockchain'
                                    ? 'bg-cyan-500 text-black border-cyan-400 font-black shadow-md'
                                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400'
                            }`}
                        >
                            <Cpu className="w-3.5 h-3.5 inline mr-1.5" /> Stellar & Soroban
                        </button>
                        <button
                            onClick={() => setActiveArchTab('backend')}
                            className={`px-5 py-2.5 rounded-2xl text-xs font-bold font-mono transition-all border ${
                                activeArchTab === 'backend'
                                    ? 'bg-cyan-500 text-black border-cyan-400 font-black shadow-md'
                                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400'
                            }`}
                        >
                            <Database className="w-3.5 h-3.5 inline mr-1.5" /> Real-time Firebase
                        </button>
                    </div>

                    {/* Architecture Details Box */}
                    <motion.div
                        key={activeArchTab}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="p-8 rounded-[2.5rem] bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 shadow-2xl transition-colors duration-300"
                    >
                        {activeArchTab === 'frontend' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                                <div className="p-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl space-y-2">
                                    <Code className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">React 18 & TypeScript</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Strictly typed components with decoupled state hooks and zero hydration flashes.</p>
                                </div>
                                <div className="p-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl space-y-2">
                                    <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Framer Motion Animations</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">60 FPS spring physics for bottom sheet modals, tab indicators, and 360° sonar radar sweeps.</p>
                                </div>
                                <div className="p-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl space-y-2">
                                    <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Native Mobile Architecture</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Thumb-friendly bottom navigation docks (`BottomNav.tsx`) and responsive desktop sidebars (`Sidebar.tsx`).</p>
                                </div>
                            </div>
                        )}

                        {activeArchTab === 'blockchain' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                                <div className="p-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl space-y-2">
                                    <Cpu className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Stellar Horizon RPC</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Direct integration with Stellar Horizon Testnet nodes for native XLM transactions and asset balances.</p>
                                </div>
                                <div className="p-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl space-y-2">
                                    <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Soroban Smart Contracts</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Automated cooperative micro-credit contracts governing driver loan advances and repayment tracking.</p>
                                </div>
                                <div className="p-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl space-y-2">
                                    <Receipt className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Custodial Web3 Keypairs</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Automated keypair provisioning for commuters & drivers with optional Freighter & LOBSTR extension support for admins.</p>
                                </div>
                            </div>
                        )}

                        {activeArchTab === 'backend' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                                <div className="p-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl space-y-2">
                                    <Database className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Firebase Firestore</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Real-time listeners for driver location broadcasting (`driver_locations`), receipts (`fare_transactions`), and user roles.</p>
                                </div>
                                <div className="p-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl space-y-2">
                                    <Megaphone className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Targeted Broadcast System</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Targeted broadcast messaging for commuters, drivers, or cooperative members via `system_notifications`.</p>
                                </div>
                                <div className="p-5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl space-y-2">
                                    <Zap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Zero-Asset Web Audio API</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Synthesized dual-tone audio chime alerts for drivers upon receiving fare payments without external MP3 assets.</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </section>

                {/* ROLE ECOSYSTEM SUMMARY */}
                <section className="py-20 px-6 max-w-7xl mx-auto space-y-12">
                    <div className="text-center space-y-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            Role-Tailored UX
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                            Designed For Every Participant
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        <motion.div whileHover={{ y: -6, scale: 1.02 }} className="p-8 rounded-[2rem] bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 space-y-4 shadow-xl">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black text-2xl">
                                🚶
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Commuter Cockpit</h3>
                            <ul className="text-xs text-slate-600 dark:text-gray-400 space-y-2 font-medium">
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Apple Wallet balance hero</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 50m Sonar driver radar</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Printable digital receipts (`OR-XXXXX`)</li>
                            </ul>
                        </motion.div>

                        <motion.div whileHover={{ y: -6, scale: 1.02 }} className="p-8 rounded-[2rem] bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 space-y-4 shadow-xl">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-2xl">
                                🛺
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Driver Duty Cockpit</h3>
                            <ul className="text-xs text-slate-600 dark:text-gray-400 space-y-2 font-medium">
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 56px "Go On Transit" switch</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Web Audio payment chime sound</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Soroban credit loan advances</li>
                            </ul>
                        </motion.div>

                        <motion.div whileHover={{ y: -6, scale: 1.02 }} className="p-8 rounded-[2rem] bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 space-y-4 shadow-xl">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-2xl">
                                🏢
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Cooperative Admin SaaS</h3>
                            <ul className="text-xs text-slate-600 dark:text-gray-400 space-y-2 font-medium">
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Member verification queue</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Targeted broadcast notification center</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multisig treasury vault management</li>
                            </ul>
                        </motion.div>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="py-12 border-t border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-gray-500 font-mono space-y-2">
                    <MobilisLogo size={28} showText />
                    <p>© 2026 Mobilis Platform • Stellar Transport Fintech & Soroban Micro-Credit</p>
                </footer>

            </div>
        </div>
    );
}