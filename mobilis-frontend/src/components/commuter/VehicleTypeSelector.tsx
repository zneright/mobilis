import React from 'react';

interface VehicleTypeSelectorProps {
    selectedType: string;
    onSelectType: (type: string) => void;
}

export const vehicleTypes = [
    { id: 'all', label: 'All Vehicles', icon: '🚗' },
    { id: 'Tricycle', label: 'Tricycle', icon: '🛺' },
    { id: 'Jeepney', label: 'Jeepney', icon: '🛻' },
    { id: 'UV Express', label: 'UV Express', icon: '🚐' },
    { id: 'Bus', label: 'Bus', icon: '🚌' },
    { id: 'Taxi', label: 'Taxi', icon: '🚖' },
    { id: 'Motorcycle', label: 'Motorcycle', icon: '🛵' },
] as const;

export const VehicleTypeSelector: React.FC<VehicleTypeSelectorProps> = ({
    selectedType,
    onSelectType,
}) => {
    return (
        <div className="w-full flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {vehicleTypes.map((vt) => {
                const isActive = selectedType.toLowerCase() === vt.id.toLowerCase();
                return (
                    <button
                        key={vt.id}
                        onClick={() => onSelectType(vt.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono font-black transition-all flex-shrink-0 border ${
                            isActive
                                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(0,210,255,0.4)] scale-105'
                                : 'bg-[#0B0F19]/90 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                    >
                        <span className="text-base">{vt.icon}</span>
                        <span>{vt.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default VehicleTypeSelector;
