import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
    ArrowRight,
    Radio,
    Cpu,
    Database,
    Layers,
    Sparkles,
    Volume2
} from 'lucide-react';
import { EarthCanvas, ShootingStar } from './EarthCanvas';
import MobilisLogo from './common/MobilisLogo';

// Animation configurations
const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    }
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

export default function Landing() {
    const [scrolled, setScrolled] = useState(false);
    const [activeTab, setActiveTab] = useState<'commuter' | 'driver' | 'coop'>('commuter');
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll);
        // Sync theme with document
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        return () => window.removeEventListener('scroll', onScroll);
    }, [theme]);

    return (
        <div className="relative min-h-screen text-slate-900 dark:text-gray-100 font-sans overflow-x-hidden bg-slate-50 dark:bg-[#07090e] transition-colors duration-500">
            
            {/* Ambient Lighting Layer */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[10%] w-[70vw] h-[60vh] bg-emerald-500/10 dark:bg-emerald-500/[0.07] blur-[140px] rounded-full" />
                <div className="absolute bottom-[20%] right-[-10%] w-[50vw] h-[55vh] bg-cyan-500/10 dark:bg-cyan-500/[0.08] blur-[150px] rounded-full" />
                <div className="absolute top-[40%] right-[15%] w-[40vw] h-[40vh] bg-indigo-500/5 dark:bg-indigo-500/[0.04] blur-[120px] rounded-full" />
                <ShootingStar delay={2} />
                <ShootingStar delay={5} />
                <ShootingStar delay={9} />
            </div>

            <div className="relative z-10">

                {/* Sticky Premium Navbar */}
                <motion.nav
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                        scrolled
                            ? 'bg-white/80 dark:bg-[#07090e]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 py-3.5 shadow-lg'
                            : 'bg-transparent py-6'
                    }`}
                >
                    <div className="flex items-center justify-between px-6 max-w-7xl mx-auto">
                        <MobilisLogo size={34} showText />

                        <div className="flex items-center gap-4">
                            {/* Theme Toggle */}
                            <button
                                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                                className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>

                            <Link
                                to="/login"
                                className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                Sign In
                            </Link>

                            <Link
                                to="/signup"
                                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-all shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:scale-[1.03]"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </motion.nav>

                {/* HERO SECTION */}
                <section className="relative pt-32 pb-16 lg:pt-44 lg:pb-28 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="space-y-6 text-left lg:col-span-6"
                    >
                        <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                            Live Stellar Transport Fintech
                        </motion.div>

                        <motion.h1 variants={fadeInUp} className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] text-slate-900 dark:text-white">
                            Decentralized <br />
                            <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent">
                                Transport Credit
                            </span> <br />
                            & Payments
                        </motion.h1>

                        <motion.p variants={fadeInUp} className="text-base sm:text-lg text-slate-600 dark:text-gray-400 max-w-lg leading-relaxed">
                            Empowering unbanked transport drivers and commuters in the Philippines with instant local currency fare payments, real-time vehicle discovery radar, and cooperative smart-credit treasuries.
                        </motion.p>

                        <motion.div variants={fadeInUp} className="flex flex-wrap gap-4 pt-2">
                            <Link
                                to="/signup"
                                className="px-7 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_25px_rgba(16,185,129,0.4)] hover:scale-[1.03]"
                            >
                                Enter Platform <ArrowRight className="w-4 h-4" />
                            </Link>
                            <a
                                href="#verified-stack"
                                className="px-7 py-4 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                Read Tech Stack
                            </a>
                        </motion.div>

                        {/* Direct Feature Highlights */}
                        <motion.div variants={fadeInUp} className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-200 dark:border-white/5">
                            <div>
                                <span className="block text-2xl font-black text-slate-900 dark:text-white font-mono">~3s</span>
                                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-gray-400">Ledger Settlement</span>
                            </div>
                            <div>
                                <span className="block text-2xl font-black text-slate-900 dark:text-white font-mono">0.002%</span>
                                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-gray-400">Platform Fee</span>
                            </div>
                            <div>
                                <span className="block text-2xl font-black text-slate-900 dark:text-white font-mono">100%</span>
                                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-gray-400">Non-Custodial</span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Interactive Earth Canvas (Right Column) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full h-[400px] sm:h-[500px] rounded-3xl overflow-hidden flex items-center justify-center lg:col-span-6 bg-slate-100 dark:bg-black/10 border border-slate-200 dark:border-white/5 shadow-2xl"
                    >
                        <EarthCanvas />
                        <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl bg-white/70 dark:bg-[#0c0f16]/75 backdrop-blur-md border border-slate-200/80 dark:border-white/10 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-pulse">
                                <Radio className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-mono font-black text-slate-900 dark:text-white uppercase tracking-wider">Philippine Ledger Active</p>
                                <p className="text-[10px] text-slate-500 dark:text-gray-400">Stellar Testnet node connections verified.</p>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* INTERACTIVE DOCK / MOCKUP SHOWCASE */}
                <section className="py-16 px-6 max-w-7xl mx-auto space-y-10 border-t border-slate-200 dark:border-white/5">
                    <div className="text-center space-y-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            Interactive Platform Preview
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            Explore Verified System Roles
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-gray-400 max-w-lg mx-auto">
                            Switch tabs below to view real functional mockups of what the Mobilis app executes natively.
                        </p>
                    </div>

                    {/* Tab Selectors */}
                    <div className="flex justify-center gap-2 max-w-lg mx-auto p-1.5 rounded-2xl bg-slate-200/60 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => setActiveTab('commuter')}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                                activeTab === 'commuter'
                                    ? 'bg-emerald-500 text-black shadow-md'
                                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Commuter View
                        </button>
                        <button
                            onClick={() => setActiveTab('driver')}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                                activeTab === 'driver'
                                    ? 'bg-emerald-500 text-black shadow-md'
                                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Driver Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('coop')}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                                activeTab === 'coop'
                                    ? 'bg-emerald-500 text-black shadow-md'
                                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Coop Treasury
                        </button>
                    </div>

                    {/* Display Mockup */}
                    <div className="max-w-4xl mx-auto rounded-3xl bg-white dark:bg-[#0c0f16] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden p-6 sm:p-8 transition-all">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
                            >
                                {/* Mockup Description */}
                                <div className="space-y-5 text-left">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold uppercase tracking-wider text-emerald-500">
                                        {activeTab === 'commuter' && '🚶 Commuter Interface'}
                                        {activeTab === 'driver' && '🛺 Driver Interface'}
                                        {activeTab === 'coop' && '🏢 Cooperative Dashboard'}
                                    </div>
                                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                                        {activeTab === 'commuter' && 'Discover & Settle Fares on a Vector Map'}
                                        {activeTab === 'driver' && 'Broadcast Location, Drive, & Earn Smart Credit'}
                                        {activeTab === 'coop' && 'Automated Soroban Smart Credit & Member Verification'}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 leading-relaxed">
                                        {activeTab === 'commuter' && 'Commuters discover drivers nearby within a custom radius. Upon tapping a marker, a clean vehicle info card displays the distance and ETA. Payments are pushed instantly over the Stellar network with instant receipts.'}
                                        {activeTab === 'driver' && 'Drivers toggle on-duty status to broadcast their real-time location. The system handles background GPS polling safely, showing current speeds in real time and alerting the driver using synthesized audio chimes when commuter fares arrive.'}
                                        {activeTab === 'coop' && 'Cooperatives maintain platform vaults and manage risk variables. They approve pending members and automatically generate Rust-based smart loans directly to member wallets, taking standard multisig protocols to Stellar ledger layers.'}
                                    </p>
                                    <div className="flex gap-3 text-xs font-mono">
                                        {activeTab === 'commuter' && (
                                            <>
                                                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400">MapLibre GL Map</span>
                                                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400">Stellar Transactions</span>
                                            </>
                                        )}
                                        {activeTab === 'driver' && (
                                            <>
                                                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400">navigator.geolocation</span>
                                                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400">Web Audio API</span>
                                            </>
                                        )}
                                        {activeTab === 'coop' && (
                                            <>
                                                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400">Soroban Smart Contracts</span>
                                                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400">Cooperative Queue</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Mockup GUI Preview */}
                                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-white/5 font-sans relative shadow-inner overflow-hidden">
                                    {activeTab === 'commuter' && (
                                        <div className="space-y-4 text-left">
                                            {/* Simulated Map */}
                                            <div className="h-44 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/[0.04] border border-emerald-500/20 relative flex items-center justify-center">
                                                <div className="absolute w-28 h-28 rounded-full border border-emerald-500/20 animate-ping pointer-events-none" />
                                                <div className="absolute w-12 h-12 rounded-full border border-emerald-500/40 animate-pulse pointer-events-none" />
                                                <div className="w-10 h-10 rounded-full bg-[#0c0f16] border-2 border-emerald-500 flex items-center justify-center shadow-lg">
                                                    <span className="text-lg">🧍‍♂️</span>
                                                </div>
                                                {/* Mini vehicle pins */}
                                                <div className="absolute top-8 left-16 w-3 h-3 rounded-full bg-cyan-400 border border-white" />
                                                <div className="absolute bottom-10 right-20 w-3 h-3 rounded-full bg-violet-400 border border-white" />
                                                <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">1.2 km Active Radius</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">Jeepney (Mitzi Koi)</span>
                                                </div>
                                                <span className="text-xs font-mono font-black text-emerald-500">₱15.00 (0.2472 XLM)</span>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'driver' && (
                                        <div className="space-y-4 text-left">
                                            <div className="p-4 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/[0.03] border border-cyan-500/20 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black uppercase tracking-wider text-cyan-400">Driver Duty Toggle</span>
                                                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-bold uppercase">On Duty</span>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl font-black text-slate-900 dark:text-white">25</span>
                                                    <span className="text-xs text-slate-500 dark:text-gray-400">km/h GPS Velocity</span>
                                                </div>
                                            </div>
                                            {/* Audio trigger preview */}
                                            <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                                                    <Volume2 className="w-4 h-4 text-cyan-400" /> Synthesized Payment Chime
                                                </span>
                                                <span className="text-[10px] font-mono text-cyan-400 uppercase font-black">Active</span>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'coop' && (
                                        <div className="space-y-4 text-left">
                                            <div className="p-4 rounded-xl bg-violet-500/10 dark:bg-violet-500/[0.03] border border-violet-500/20 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black uppercase tracking-wider text-violet-400">Platform Treasury</span>
                                                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">MalTODA Cooperative</span>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl font-black text-slate-900 dark:text-white">19,982.31</span>
                                                    <span className="text-xs text-slate-500 dark:text-gray-400">XLM Balance</span>
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-400 flex items-center justify-center font-bold text-white text-xs">JD</div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white">Jeepney Driver Request</p>
                                                        <p className="text-[9px] text-slate-500 dark:text-gray-400">Pending verification</p>
                                                    </div>
                                                </div>
                                                <span className="px-2.5 py-1.5 bg-violet-600 text-white rounded-lg text-[9px] font-black uppercase">Approve</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </section>

                {/* THE VERIFIED TECHNOLOGY MATRIX */}
                <section id="verified-stack" className="py-20 px-6 max-w-7xl mx-auto space-y-12 border-t border-slate-200 dark:border-white/5">
                    <div className="text-center space-y-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-500">
                            Technical Specifications
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                            Platform Architecture Stack
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 max-w-xl mx-auto">
                            Mobilis utilizes a fully decoupled modern web infrastructure to deliver real-time capabilities and decentralized smart-contract security.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Tech Block 1: Stellar */}
                        <div className="p-6 rounded-2xl bg-white dark:bg-[#0c0f16] border border-slate-200 dark:border-white/10 text-left space-y-4 shadow-md">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                                <Cpu className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Stellar & Soroban Core</h3>
                            <ul className="text-xs text-slate-600 dark:text-gray-400 space-y-2.5 font-mono">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400">✔</span>
                                    <span>**Stellar Horizon RPC**: Direct connection to Horizon testnet for balance checks and sub-second payment settlement.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400">✔</span>
                                    <span>**Soroban Contracts**: Rust-compiled WASM smart contracts maintaining debt balances on-chain securely.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400">✔</span>
                                    <span>**Custodial Keypair Auto-auth**: Local Stellar keypair generation ensuring immediate accessibility for unbanked users.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Tech Block 2: Realtime Presentation */}
                        <div className="p-6 rounded-2xl bg-white dark:bg-[#0c0f16] border border-slate-200 dark:border-white/10 text-left space-y-4 shadow-md">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                <Layers className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Presentation & Client Map</h3>
                            <ul className="text-xs text-slate-600 dark:text-gray-400 space-y-2.5 font-mono">
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400">✔</span>
                                    <span>**MapLibre GL Vector Map**: High-performance client-side rendering with customized dark/light layout maps.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400">✔</span>
                                    <span>**Tailwind CSS & tokens**: Styled strictly with consistent color tokens, responsive layouts, and scrollbar modifications.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-emerald-400">✔</span>
                                    <span>**Framer Motion**: Smooth 60 FPS transitions, spring physics layout shifts, and responsive drawer transitions.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Tech Block 3: Backend */}
                        <div className="p-6 rounded-2xl bg-white dark:bg-[#0c0f16] border border-slate-200 dark:border-white/10 text-left space-y-4 shadow-md">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                                <Database className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Decoupled Backend Services</h3>
                            <ul className="text-xs text-slate-600 dark:text-gray-400 space-y-2.5 font-mono">
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-400">✔</span>
                                    <span>**Firebase Firestore**: Sub-second real-time collection updates for vehicle coordinates and passenger beacons.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-400">✔</span>
                                    <span>**Web Audio API alerts**: Pure client-side synthetic chimes generated programmatically for alerts.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-400">✔</span>
                                    <span>**Targeted Broadcasts**: System alert logs matching active user roles instantly for notifications.</span>
                                </li>
                            </ul>
                        </div>

                    </div>
                </section>

                {/* CALL TO ACTION */}
                <section className="py-20 px-6 max-w-5xl mx-auto text-center relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0c0f16] to-[#07090e] border border-slate-200/20 dark:border-white/10 shadow-2xl my-10">
                    <div className="absolute inset-0 bg-emerald-500/[0.03] pointer-events-none" />
                    <div className="relative z-10 space-y-6">
                        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                            Empower Your Transport Route Today
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                            Join transport cooperatives, operators, commuters, and drivers across the Philippines using Stellar to eliminate predatory daily interest structures.
                        </p>
                        <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
                            <Link
                                to="/signup"
                                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-xl transition-all shadow-[0_4px_25px_rgba(16,185,129,0.4)] hover:scale-[1.03]"
                            >
                                Register Now
                            </Link>
                            <Link
                                to="/login"
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-sm rounded-xl transition-all"
                            >
                                Access Wallet Account
                            </Link>
                        </div>
                    </div>
                </section>

                {/* PREMIUM FOOTER */}
                <footer className="py-12 border-t border-slate-200 dark:border-white/5 text-center text-xs text-slate-500 dark:text-gray-500 font-mono space-y-2">
                    <MobilisLogo size={28} showText />
                    <p>© 2026 Mobilis Infrastructure Platform • Stellar Transport Fintech Ecosystem</p>
                </footer>

            </div>
        </div>
    );
}