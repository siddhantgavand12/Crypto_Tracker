// Fix: Import useEffect from React.
import React, { useState, useEffect } from 'react';

interface CryptoIconProps {
  symbol: string;
  className?: string;
}

const getBaseAsset = (symbol: string) => symbol.replace(/USDT$/, '').toLowerCase();

const GenericIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
);


export const CryptoIcon: React.FC<CryptoIconProps> = ({ symbol, className }) => {
    const [hasError, setHasError] = useState(false);
    const baseAsset = getBaseAsset(symbol);
    const iconUrl = `https://assets.coincap.io/assets/icons/${baseAsset}@2x.png`;

    const handleError = () => {
        setHasError(true);
    };
    
    // Reset error state when symbol changes
    useEffect(() => {
      setHasError(false);
    }, [symbol]);


    if (hasError) {
        return <GenericIcon className={className} />;
    }

    return (
        <img
            src={iconUrl}
            alt={`${symbol} icon`}
            className={className}
            onError={handleError}
        />
    );
};