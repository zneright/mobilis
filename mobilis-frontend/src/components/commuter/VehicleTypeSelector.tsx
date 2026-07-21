import React from 'react';

interface VehicleTypeSelectorProps {
    selectedType: string;
    onSelectType: (type: string) => void;
}

export const vehicleTypes = [
    { id: 'all', label: 'All Vehicles', icon: '🚗', color: 'from-cyan-500 to-emerald-400 text-cyan-400 border-cyan-400/40' },
    { id: 'Tricycle', label: 'Tricycle', icon: '🛺', color: 'from-emerald-500 to-teal-400 text-emerald-400 border-emerald-400/40' },
    { id: 'Jeepney', label: 'Jeepney', icon: '🛻', color: 'from-blue-600 to-cyan-500 text-blue-400 border-blue-400/40' },
    { id: 'UV Express', label: 'UV Express', icon: '🚐', color: 'from-amber-500 to-yellow-400 text-amber-400 border-amber-400/40' },
    { id: 'Bus', label: 'Bus', icon: '🚌', color: 'from-purple-600 to-indigo-500 text-purple-400 border-purple-400/40' },
    { id: 'Taxi', label: 'Taxi', icon: '🚖', color: 'from-yellow-400 to-amber-300 text-yellow-400 border-yellow-400/40' },
    { id: 'Motorcycle', label: 'Motorcycle', icon: '🛵', color: 'from-rose-500 to-red-400 text-rose-400 border-rose-400/40' },
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
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-mono font-black transition-all flex-shrink-0 border shadow-md ${
                            isActive
                                ? `bg-gradient-to-r ${vt.color.split(' ')[0]} ${vt.color.split(' ')[1]} text-black border-white scale-105 shadow-lg`
                                : `bg-white/90 dark:bg-[#0B0F19]/90 ${vt.color.split(' ')[2]} ${vt.color.split(' ')[3]} hover:scale-102`
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
