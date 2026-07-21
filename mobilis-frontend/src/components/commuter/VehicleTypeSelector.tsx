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
        <div className="w-full flex items-center gap-2 overflow-x-auto py-2 scrollbar-none px-4">
            {vehicleTypes.map((vt) => {
                const isActive = selectedType.toLowerCase() === vt.id.toLowerCase();
                return (
                    <button
                        key={vt.id}
                        onClick={() => onSelectType(vt.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all flex-shrink-0 border shadow-sm ${
                            isActive
                                ? 'bg-gray-900 text-white dark:bg-emerald-500 dark:text-black border-transparent scale-105 shadow-md'
                                : 'bg-white/90 dark:bg-[#07090E]/90 border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-white'
                        }`}
                    >
                        <span className="text-sm">{vt.icon}</span>
                        <span>{vt.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default VehicleTypeSelector;
