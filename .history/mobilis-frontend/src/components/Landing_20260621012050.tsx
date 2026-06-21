import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Fuel, Zap, ShieldCheck, ArrowRight, Wallet } from 'lucide-react';
// Assuming you placed EarthCanvas in your components folder
import { EarthCanvas } from './EarthCanvas';

// --- ANIMATION VARIANTS ---
const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 80, damping: 20 },
    },
};

const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

// --- STATIC STAR BACKGROUND ---
const StaticStar = ({ x, y, size = 1, opacity = 0.3 }: { x: string, y: string, size?: number, opacity?: number }) => (
    <div
        className="absolute rounded-full bg-white pointer-events-none"
        style={{ left: x, top: y, width: 2 * size, height: 2 * size, opacity }}
    />
);

export default function Landing() {
    const [activeNav, setActiveNav] = useState(false);

    useEffect(() => {
        const onScroll = () => setActiveNav(window.scrollY > 40);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const backgroundNodes = useMemo(() =>
        [...Array(60)].map(() => ({
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            size: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.5 + 0.1,
        })),
        []);

    return (
        <div className="relative min-h-screen text-white font-sans overflow-x-hidden bg-[#060610]">

            {/* --- BACKGROUND EFFECTS --- */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                {backgroundNodes.map((n, i) => (
                    <StaticStar key={i} x={n.x} y={n.y} size={n.size} opacity={n.opacity} />
                ))}
                {/* Core Nebula Glow */}
                <div className="absolute top-[-10%] left-[20%] w-[60vw] h-[60vh] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[10%] right-[-10%] w-[50vw] h-[50vh] bg-emerald-600/10 blur-[100px] rounded-full mix-blend-screen" />
            </div>

            <div className="relative z-10">

                {/* --- NAVIGATION --- */}
                <motion.nav
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
                    style={{
                        background: activeNav ? "rgba(6,6,16,0.85)" : "transparent",
                        backdropFilter: activeNav ? "blur(20px)" : "none",
                        borderBottom: activeNav ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}
                >
                    <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                                <Fuel className="w-5 h-5 text-white" />
                            </div>
                            <div className="font-black text-2xl text-white tracking-wide">MOBILIS</div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link to="/login" className="px-4 py-2 text-xs font-bold tracking-wide text-gray-300 hover:text-white transition-colors">
                                Log In
                            </Link>
                            <Link to="/signup" className="px-5 py-2.5 text-xs font-bold tracking-wide bg-white text-black hover:bg-gray-200 rounded-lg transition-all duration-300">
                                Create Account
                            </Link>
                        </div>
                    </div>
                </motion.nav>

                {/* --- HERO SECTION --- */}
                <motion.header className="relative flex flex-col items-center justify-center text-center px-4 pt-40 pb-32 max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="mb-8 px-4 py-1.5 rounded-full border border-emerald-400/20 text-[11px] font-semibold tracking-widest text-emerald-300 uppercase bg-emerald-500/10 backdrop-blur-md"
                    >
                        ✦ Powered by the Stellar Network ✦
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-8 leading-[1.05]"
                    >
                        Fuel your route.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-300 to-emerald-500 filter drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                            Zero friction.
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.7 }}
                        className="text-gray-400 text-lg md:text-xl mb-10 max-w-2xl font-medium leading-relaxed"
                    >
                        Instant, zero-interest fuel advances built specifically for TODA drivers. Process digital liquidity on-chain and keep your operations moving without the banking wait times.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.6 }}
                        className="flex flex-col sm:flex-row items-center gap-4"
                    >
                        <Link
                            to="/signup"
                            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-sm font-bold tracking-wide text-black transition-all duration-300 group bg-gradient-to-r from-emerald-400 to-cyan-400 hover:shadow-[0_0_40px_rgba(52,211,153,0.4)]"
                        >
                            Get Started Now
                            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                        <Link
                            to="/about"
                            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-sm font-bold tracking-wide text-white border border-white/10 hover:bg-white/5 transition-all duration-300 backdrop-blur-sm"
                        >
                            Read the Whitepaper
                        </Link>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 0.8 }}
                        className="mt-20 flex flex-wrap items-center justify-center gap-12 border-t border-white/5 pt-10 w-full"
                    >
                        {[
                            { label: "Interest Rate", value: "0%" },
                            { label: "Approval Time", value: "< 5s" },
                            { label: "Network Fees", value: "₱0.00" },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="text-3xl font-black mb-1 text-white">{stat.value}</div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </motion.header>

                {/* --- FEATURES GRID --- */}
                <motion.section
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={stagger}
                    className="max-w-7xl mx-auto px-4 sm:px-6 pb-32"
                >
                    <motion.div variants={fadeUp} className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black mb-4">Engineered for the road.</h2>
                        <p className="text-gray-400 max-w-xl mx-auto">Traditional finance slows you down. Mobilis uses blockchain infrastructure to provide capital exactly when your tank is empty.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Zap,
                                title: "Flash Funding",
                                desc: "Don't wait for multi-day bank clearances. Funds hit your digital wallet instantly via the Stellar network.",
                                glow: "rgba(59,130,246,0.15)",
                                border: "rgba(59,130,246,0.3)",
                                color: "text-blue-400"
                            },
                            {
                                icon: ShieldCheck,
                                title: "Zero Interest",
                                desc: "We don't punish you for needing fuel. Pay back exactly what you borrowed at the end of your shift. No hidden cuts.",
                                glow: "rgba(52,211,153,0.15)",
                                border: "rgba(52,211,153,0.3)",
                                color: "text-emerald-400"
                            },
                            {
                                icon: Wallet,
                                title: "Non-Custodial",
                                desc: "You own your private keys and your digital assets. Complete transparency on a public ledger, giving you full control.",
                                glow: "rgba(167,139,250,0.15)",
                                border: "rgba(167,139,250,0.3)",
                                color: "text-violet-400"
                            }
                        ].map((f, i) => (
                            <motion.div
                                key={i}
                                variants={fadeUp}
                                whileHover={{ y: -5 }}
                                className="relative rounded-2xl p-8 bg-[#0a0a14] border border-white/5 overflow-hidden group transition-all duration-300"
                                style={{ hover: { borderColor: f.border, boxShadow: `0 20px 40px ${f.glow}` } } as any}
                            >
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center border mb-6 transition-colors duration-300" style={{ background: f.glow, borderColor: f.border }}>
                                    <f.icon className={`w-6 h-6 ${f.color}`} />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-white">{f.title}</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* --- EARTH CANVAS & STELLAR INTEGRATION --- */}
                <motion.section
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={stagger}
                    className="max-w-7xl mx-auto px-4 sm:px-6 pb-32"
                >
                    <div className="flex flex-col lg:flex-row items-center gap-12 bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 md:p-12">
                        <motion.div variants={fadeUp} className="w-full lg:w-1/2">
                            <div className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase mb-4">Global Infrastructure</div>
                            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">Settlements verified at the speed of light.</h2>
                            <p className="text-gray-400 mb-8 text-lg">
                                By leveraging Stellar Horizon, Mobilis guarantees that every fuel advance and repayment is permanently logged, instantly verifiable, and immune to local banking downtime.
                            </p>
                            <ul className="space-y-4 mb-8">
                                {["Live On-Chain Auditing", "Micro-transaction Optimized", "100% Uptime SLA"].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-gray-300 font-medium">
                                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        <motion.div variants={fadeUp} className="w-full lg:w-1/2 flex justify-center">

                        </motion.div>
                    </div>
                </motion.section>

                {/* --- FOOTER --- */}
                <footer className="border-t border-white/10 py-10 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4 opacity-50 hover:opacity-100 transition-opacity">
                        <Fuel className="w-5 h-5 text-white" />
                        <span className="font-black text-xl tracking-widest text-white">MOBILIS</span>
                    </div>
                    <p className="text-xs text-gray-600 font-mono">
                        © {new Date().getFullYear()} Mobilis Protocol. Engineered for TODA.
                    </p>
                </footer>

            </div>
        </div>
    );
}