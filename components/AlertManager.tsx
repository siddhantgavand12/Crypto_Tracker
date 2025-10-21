// Fix: Removed extraneous file markers (e.g., '--- START OF FILE ...') that were causing parsing errors.
import React, { useState, useEffect, useMemo } from 'react';
import type { Alert } from '../types';
import { AlertDirection } from '../types';
import { CryptoIcon } from './CryptoIcon';

interface AlertManagerProps {
  alerts: Alert[];
  symbol: string;
  onAddAlert: (alert: Omit<Alert, 'id' | 'triggered' | 'symbol'>) => void;
  onRemoveAlert: (id: string) => void;
  onResetAlert: (id: string) => void;
  currentPrice: number;
  notificationPermission: NotificationPermission | 'default';
  onRequestNotificationPermission: () => void;
  onSubscribeToPush: () => void;
  isSubscribedToPush: boolean;
  clickedPrice: number | null;
  onClickedPriceConsumed: () => void;
}

const formatSymbol = (symbol: string) => symbol.replace(/USDT$/, '');
const formatSymbolPair = (symbol: string) => symbol.replace(/USDT$/, ' / USDT');


export const AlertManager: React.FC<AlertManagerProps> = ({
  alerts, symbol, onAddAlert, onRemoveAlert, onResetAlert, currentPrice, notificationPermission, onRequestNotificationPermission, onSubscribeToPush, isSubscribedToPush, clickedPrice, onClickedPriceConsumed
}) => {
  const [price, setPrice] = useState('');
  const [direction, setDirection] = useState<AlertDirection>(AlertDirection.Above);

  useEffect(() => {
    // Priority 1: Handle clicked price from chart
    if (clickedPrice !== null && clickedPrice > 0) {
      setPrice(clickedPrice.toFixed(2));
      onClickedPriceConsumed(); // Consume the click
      return; // Stop this effect from proceeding
    }

    // Priority 2: Handle live price updates, but don't overwrite user input
    const priceInput = document.getElementById('price-input');
    if (document.activeElement !== priceInput && currentPrice > 0) {
      setPrice(currentPrice.toFixed(2));
    } else if (price === '' && currentPrice > 0) {
      // Also set if the box is empty
      setPrice(currentPrice.toFixed(2));
    }
  }, [clickedPrice, currentPrice, onClickedPriceConsumed]);

  const priceDifference = useMemo(() => {
    const inputPrice = parseFloat(price);
    if (!price || isNaN(inputPrice) || currentPrice === 0 || inputPrice <= 0) return null;
    
    const diff = inputPrice - currentPrice;
    const percent = (diff / currentPrice) * 100;
    
    return { diff, percent };
  }, [price, currentPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceValue = parseFloat(price);
    if (!isNaN(priceValue) && priceValue > 0) {
      onAddAlert({ price: priceValue, direction });
    }
  };

  const DirectionButton: React.FC<{
    dir: AlertDirection;
    children: React.ReactNode;
  }> = ({ dir, children }) => {
    const isActive = direction === dir;
    const baseClasses = 'flex-1 py-2 px-2 text-sm rounded-md transition-colors duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800';
    
    let colorClasses = 'bg-slate-700 text-slate-300 hover:bg-slate-600 focus:ring-cyan-500';
  
    if (isActive) {
      if (dir === AlertDirection.Above) {
        colorClasses = 'bg-emerald-400 hover:bg-emerald-400/90 text-slate-900 font-semibold shadow-md focus:ring-emerald-400';
      } else {
        colorClasses = 'bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow-md focus:ring-rose-500';
      }
    }
  
    return (
      <button
        type="button"
        onClick={() => setDirection(dir)}
        className={`${baseClasses} ${colorClasses}`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="bg-slate-900 p-4 rounded-lg shadow-2xl flex flex-col h-full">
      <h2 className="text-lg font-bold text-white mb-4">Price Alerts</h2>

      {notificationPermission !== 'granted' ? (
        <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-md relative mb-4 text-sm" role="alert">
          <strong className="font-bold">Notifications Disabled! </strong>
          <span className="block sm:inline">Allow notifications to get alerts.</span>
          <button onClick={onRequestNotificationPermission} className="ml-2 underline font-semibold">Enable Now</button>
        </div>
      ) : !isSubscribedToPush ? (
        <div className="bg-slate-800/60 border border-slate-700 text-slate-300 px-4 py-3 rounded-md relative mb-4 text-sm">
            <strong className="font-bold">Stay Notified!</strong>
            <p>Get alerts even when the app is closed.</p>
            <button onClick={onSubscribeToPush} className="mt-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs py-1 px-3 rounded-md transition-colors">
                Enable Push Alerts
            </button>
        </div>
      ) : (
         <div >
        </div>
        //  <div className="bg-emerald-900/50 border border-emerald-700 text-emerald-300 px-4 py-3 rounded-md relative mb-4 text-sm">
        //     <strong className="font-bold">Push Alerts Enabled!</strong>
        //     <p>You'll receive notifications on this device.</p>
        // </div>
      )}
      
      <div className="bg-slate-800 p-4 rounded-lg mb-6">
        <div className="flex items-center gap-3 mb-3">
            <CryptoIcon symbol={symbol} className="h-6 w-6" />
            <h3 className="text-md font-semibold text-white">New Alert for {formatSymbol(symbol)}</h3>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="price-input" className="block text-sm font-medium text-slate-400 mb-1">Target Price (USDT)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">$</span>
              <input
                id="price-input"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-md pl-7 pr-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
              />
            </div>
            {priceDifference && (
              <p className={`text-xs text-center mt-1.5 font-medium ${priceDifference.diff >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {priceDifference.diff >= 0 ? '+' : ''}{priceDifference.diff.toFixed(2)} USD ({priceDifference.percent.toFixed(2)}%)
              </p>
            )}
          </div>
          <div className="flex gap-2">
              <DirectionButton dir={AlertDirection.Above}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" /></svg>
                  <span>Above</span>
              </DirectionButton>
              <DirectionButton dir={AlertDirection.Below}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-3.707-9.293l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414z" clipRule="evenodd" /></svg>
                  <span>Below</span>
              </DirectionButton>
          </div>
          <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 w-full disabled:bg-slate-600 disabled:cursor-not-allowed" disabled={!priceDifference}>
            Set Alert
          </button>
        </form>
      </div>

      <h3 className="text-md font-semibold text-white mb-3">Active Alerts</h3>
      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
        {alerts.length === 0 ? (
          <p className="text-slate-400 text-center mt-8 text-sm">No active alerts for {formatSymbol(symbol)}.</p>
        ) : (
          <ul className="space-y-3">
            {[...alerts].reverse().map(alert => (
              <li key={alert.id} className={`p-3 rounded-lg border flex flex-col ${alert.triggered ? 'bg-yellow-900/40 border-yellow-700/60' : 'bg-slate-800 border-slate-700'}`}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <CryptoIcon symbol={alert.symbol} className="h-8 w-8 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-white">{formatSymbolPair(alert.symbol)}</p>
                      <p className="text-sm text-slate-300">
                        Price
                        <span className={`font-bold mx-1 ${alert.direction === AlertDirection.Above ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {alert.direction === AlertDirection.Above ? '>' : '<'}
                        </span>
                        ${alert.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 self-start">
                    {alert.triggered && (
                       <button onClick={() => onResetAlert(alert.id)} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Reset Alert">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                       </button>
                    )}
                    <button onClick={() => onRemoveAlert(alert.id)} className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-slate-700 transition-colors" title="Delete Alert">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                </div>
                {alert.triggered && <div className="mt-2 pt-2 border-t border-yellow-700/50 text-center"><p className="text-xs font-bold text-yellow-400">TRIGGERED</p></div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};