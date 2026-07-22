import React from 'react';
import { roleCtaBg, rolePill } from '../tabs/roleStyleTokens';

interface VehicleTypeSelectorProps {
    selectedType: string;
    onSelectType: (type: string) => void;
    role?: string;
}

export const vehicleTypes = [
    { id: 'all', label: 'All Transit', icon: '⚡' },
    { id: 'Tricycle', label: 'Tricycle', icon: '🛺' },
    { id: 'Jeepney', label: 'Traditional Jeepney', icon: '🛻' },
    { id: 'E-Jeepney', label: 'Modern E-Jeepney', icon: '⚡🚍' },
    { id: 'UV Express', label: 'UV Express', icon: '🚐' },
    { id: 'Bus', label: 'Bus', icon: '🚌' },
    { id: 'Taxi', label: 'Taxi', icon: '🚖' },
    { id: 'Motorcycle', label: 'Habal-Habal', icon: '🛵' },
] as const;

export const VehicleTypeSelector: React.FC<VehicleTypeSelectorProps> = ({
    selectedType,
    onSelectType,
    role = 'commuter',
}) => {
    return (
        <div className="w-full flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {vehicleTypes.map((vt) => {
                const isActive = selectedType.toLowerCase() === vt.id.toLowerCase();
                return (
                    <button
                        key={vt.id}
                        onClick={() => onSelectType(vt.id)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-mono font-bold transition-all flex-shrink-0 border shadow-sm ${
                            isActive
                                ? roleCtaBg(role) + ' scale-105 shadow-md'
                                : rolePill(role) + ' hover:scale-102 opacity-80 hover:opacity-100'
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
