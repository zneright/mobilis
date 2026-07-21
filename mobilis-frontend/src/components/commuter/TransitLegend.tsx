import React from 'react';

export const TransitLegend: React.FC = () => {
    return (
        <div className="flex items-center gap-4 px-4 py-2 rounded-2xl bg-[#0A0D14]/90 border border-white/10 backdrop-blur-md text-[10px] font-mono font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Available</span>
            </span>
            <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Nearly Full</span>
            </span>
            <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span>Full</span>
            </span>
        </div>
    );
};

export default TransitLegend;
