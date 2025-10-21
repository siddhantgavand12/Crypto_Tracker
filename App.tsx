import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CryptoChart } from './components/CryptoChart';
import { AlertManager } from './components/AlertManager';
import { useCryptoData } from './hooks/useCryptoData';
import { useNotifications } from './hooks/useNotifications';
import type { Alert, TimeFrame } from './types';
import { AlertDirection, TimeFrame as TimeFrameEnum } from './types';

const App: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(TimeFrameEnum.FifteenMinutes);
  const { data, latestPrice, status } = useCryptoData(symbol, timeFrame, 15000);
  const { requestPermission, sendNotification, permission, subscribeToPush, isSubscribed } = useNotifications();
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [clickedPrice, setClickedPrice] = useState<number | null>(null);

  useEffect(() => {
    // Save alerts to localStorage whenever they change, specific to the current symbol
    localStorage.setItem(`cryptoAlerts_${symbol}`, JSON.stringify(alerts));
  }, [alerts, symbol]);

  useEffect(() => {
    // Load alerts from localStorage when the symbol changes
    try {
      const savedAlerts = localStorage.getItem(`cryptoAlerts_${symbol}`);
      setAlerts(savedAlerts ? JSON.parse(savedAlerts) : []);
    } catch (error) {
      console.error("Failed to parse alerts from localStorage", error);
      setAlerts([]);
    }
  }, [symbol]);

  const checkAlerts = useCallback((price: number) => {
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => {
        if (alert.triggered) return alert;

        const conditionMet = 
          (alert.direction === AlertDirection.Above && price >= alert.price) ||
          (alert.direction === AlertDirection.Below && price <= alert.price);

        if (conditionMet) {
          sendNotification(
            `${alert.symbol} Price Alert!`,
            `Price crossed your target of $${alert.price}. Current price: $${price.toFixed(2)}.`,
            alert.symbol
          );
          return { ...alert, triggered: true };
        }
        return alert;
      })
    );
  }, [sendNotification]);

  useEffect(() => {
    if (latestPrice) {
      checkAlerts(latestPrice.close);
    }
  }, [latestPrice, checkAlerts]);

  const addAlert = (alert: Omit<Alert, 'id' | 'triggered'>) => {
    // The alert passed in doesn't have a symbol, so we add the current one.
    setAlerts(prev => [...prev, { ...alert, symbol: symbol, id: crypto.randomUUID(), triggered: false }]);
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };
  
  const resetAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, triggered: false } : a));
  };

  const handleChartClick = (price: number) => {
    setClickedPrice(price);
  };

  const handleClickedPriceConsumed = () => {
    setClickedPrice(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
      <main className="flex-grow flex flex-col lg:flex-row gap-6">
        <div className="flex-grow flex flex-col gap-6 lg:w-3/4">
          <Header
            symbol={symbol}
            setSymbol={setSymbol}
            latestPrice={latestPrice}
            timeFrame={timeFrame}
            setTimeFrame={setTimeFrame}
            status={status}
          />
          <div className="relative flex-grow bg-slate-900 p-4 rounded-lg shadow-2xl min-h-[350px] md:min-h-[550px] min-h-0">
            <CryptoChart 
              data={data} 
              status={status} 
              symbol={symbol} 
              timeFrame={timeFrame} 
              onChartClick={handleChartClick}
            />
          </div>
        </div>
        <div className="lg:w-1/4 flex flex-col">
          <AlertManager
            alerts={alerts}
            symbol={symbol}
            onAddAlert={addAlert}
            onRemoveAlert={removeAlert}
            onResetAlert={resetAlert}
            currentPrice={latestPrice?.close ?? 0}
            notificationPermission={permission}
            onRequestNotificationPermission={requestPermission}
            onSubscribeToPush={subscribeToPush}
            isSubscribedToPush={isSubscribed}
            clickedPrice={clickedPrice}
            onClickedPriceConsumed={handleClickedPriceConsumed}
          />
        </div>
      </main>
      <footer className="text-center text-slate-600 mt-8 text-xs">
        CrypTrack | Data sourced from Binance API.
      </footer>
    </div>
  );
};

export default App;