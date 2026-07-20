import React from 'react';
import logoImg from '../../assets/logo.png';

interface MobilisLogoProps {
    className?: string;
    size?: number | string;
    variant?: 'navy' | 'emerald' | 'gradient' | 'white';
    showText?: boolean;
    textClassName?: string;
}

export const MobilisLogo: React.FC<MobilisLogoProps> = ({
    className = '',
    size = 36,
    variant = 'navy',
    showText = false,
    textClassName = '',
}) => {
    const numSize = typeof size === 'number' ? size : parseInt(size.toString(), 10) || 36;

    return (
        <div className={`inline-flex items-center gap-3 select-none ${className}`}>
            <div
                style={{ width: `${numSize}px`, height: `${numSize}px` }}
                className="relative flex items-center justify-center overflow-hidden flex-shrink-0"
            >
                <img
                    src={logoImg}
                    alt="Mobilis Logo"
                    className={`w-full h-full object-contain object-center scale-125 transition-transform duration-300 hover:scale-130 ${
                        variant === 'white'
                            ? 'brightness-0 invert'
                            : variant === 'emerald'
                            ? 'hue-rotate-[110deg] saturate-200'
                            : 'mix-blend-multiply dark:brightness-0 dark:invert'
                    }`}
                />
            </div>

            {showText && (
                <span className={`font-black tracking-widest text-slate-900 dark:text-white uppercase font-sans ${textClassName}`}>
                    MOBILIS
                </span>
            )}
        </div>
    );
};

export default MobilisLogo;
