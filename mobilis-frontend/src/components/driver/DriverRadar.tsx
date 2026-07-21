import React from 'react';
import type { UserData } from '../../types';
import DriverOperationsMap from './DriverOperationsMap';

interface DriverRadarProps {
    driverData: UserData;
    currencyMode: 'XLM' | 'PHP';
    setCurrencyMode: React.Dispatch<React.SetStateAction<'XLM' | 'PHP'>>;
}

export const DriverRadar: React.FC<DriverRadarProps> = ({ driverData, currencyMode, setCurrencyMode }) => {
    return (
        <DriverOperationsMap
            driverData={driverData}
            currencyMode={currencyMode}
            setCurrencyMode={setCurrencyMode}
        />
    );
};

export default DriverRadar;
