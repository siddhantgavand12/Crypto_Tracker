import React from 'react';
import type { CandleData, TimeFrame } from '../types';
import { TimeFrame as TimeFrameEnum } from '../types';
import type { DataStatus } from '../hooks/useCryptoData';
import { SymbolSearch } from './SymbolSearch';
import { CryptoIcon } from './CryptoIcon';

interface HeaderProps {
  symbol: string;
  setSymbol: (symbol: string) => void;
  latestPrice: CandleData | null;
  timeFrame: TimeFrame;
  setTimeFrame: (tf: TimeFrame) => void;
  status: DataStatus;
}

const timeFrames: TimeFrame[] = Object.values(TimeFrameEnum);

const SelectorButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}> = ({ onClick, isActive, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 sm:py-1.5 text-sm rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-of
      fset-2 focus:ring-offset-slate-900 ${
      isActive
        ? 'bg-cyan-500 text-white font-semibold shadow-lg'
        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
    }`}
  >
    {children}
  </button>
);

const StatusIndicator: React.FC<{ status: DataStatus }> = ({ status }) => {
    if (status === 'offline') {
        return (
            <div className="flex items-center gap-1.5 text-xs text-yellow-400">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                </span>
                Offline
            </div>
        );
    }
    if (status === 'success') {
       return (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live
            </div>
       )
    }
    return null;
}


export const Header: React.FC<HeaderProps> = ({ symbol, setSymbol, latestPrice, timeFrame, setTimeFrame, status }) => {
  const price = latestPrice?.close ?? 0;
  const priceChange = latestPrice ? latestPrice.close - latestPrice.open : 0;
  const priceChangePercent = latestPrice && latestPrice.open !== 0 ? (priceChange / latestPrice.open) * 100 : 0;
  const isPositive = priceChange >= 0;
  const formattedSymbol = symbol.replace(/USDT$/, ' / USDT');

  return (
    <header className="bg-slate-900 p-4 rounded-lg shadow-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
      <div className="flex items-center gap-4">
        <CryptoIcon symbol={symbol} className="h-10 w-10 flex-shrink-0" />
        <div className="flex-grow">
          <div className="flex items-center gap-3 flex-wrap">
             <h1 className="text-xl font-bold text-white whitespace-nowrap">{formattedSymbol}</h1>
             <StatusIndicator status={status} />
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className={`text-2xl font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-500'}`}>
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-500'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-4 self-stretch sm:self-auto justify-end w-full sm:w-auto">
        <SymbolSearch onSymbolSelect={setSymbol} />
        <div className="flex items-center flex-wrap justify-start gap-3 bg-slate-800 p-2 rounded-lg w-full sm:w-auto">
          {timeFrames.map(tf => (
            <SelectorButton key={tf} onClick={() => setTimeFrame(tf)} isActive={timeFrame === tf}>
              {tf}
            </SelectorButton>
          ))}
        </div>
      </div>
    </header>
  );
};
