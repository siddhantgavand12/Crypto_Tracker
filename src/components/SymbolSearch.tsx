import React, { useState, useEffect, useRef } from 'react';
import { CryptoIcon } from './CryptoIcon';

interface SymbolSearchProps {
  onSymbolSelect: (symbol: string) => void;
}

interface BinanceSymbol {
  symbol: string;
  status: string;
  quoteAsset: string;
}

export const SymbolSearch: React.FC<SymbolSearchProps> = ({ onSymbolSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
        if (!response.ok) throw new Error('Failed to fetch symbols');
        const data = await response.json();
        const usdtSymbols = data.symbols
          .filter((s: BinanceSymbol) => s.quoteAsset === 'USDT' && s.status === 'TRADING')
          .map((s: BinanceSymbol) => s.symbol)
          .sort();
        setAllSymbols(usdtSymbols);
      } catch (error) {
        console.error("Could not fetch symbol list from Binance:", error);
      }
    };
    fetchSymbols();
  }, []);

  useEffect(() => {
    if (query.length > 0) {
      setResults(
        allSymbols.filter(s => s.toLowerCase().startsWith(query.toLowerCase())).slice(0, 10)
      );
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, allSymbols]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (symbol: string) => {
    onSymbolSelect(symbol);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full sm:w-auto" ref={searchRef}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length > 0 && setIsOpen(true)}
        placeholder="Search (e.g. ETHUSDT)"
        className="bg-slate-700 border border-slate-600 rounded-md pl-10 pr-4 py-2 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
      />
      {isOpen && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map(symbol => (
            <li
              key={symbol}
              onClick={() => handleSelect(symbol)}
              className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer flex items-center gap-3"
            >
              <CryptoIcon symbol={symbol} className="h-5 w-5" />
              <span>{symbol}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};