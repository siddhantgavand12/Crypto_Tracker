import { useState, useEffect } from 'react';
import type { CandleData, TimeFrame } from '../types';

const MAX_DATA_POINTS = 100;

export type DataStatus = 'loading' | 'success' | 'offline' | 'error';

const parseCandleData = (d: any): CandleData => ({
  time: d[0],
  open: parseFloat(d[1]),
  high: parseFloat(d[2]),
  low: parseFloat(d[3]),
  close: parseFloat(d[4]),
});

const fetchKlines = async (symbol: string, timeFrame: TimeFrame, limit: number): Promise<CandleData[]> => {
  const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeFrame}&limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.map(parseCandleData);
};

export const useCryptoData = (symbol: string, timeFrame: TimeFrame, interval: number) => {
  const [data, setData] = useState<CandleData[]>([]);
  const [status, setStatus] = useState<DataStatus>('loading');

  useEffect(() => {
    let isMounted = true;
    const cacheKey = `cryptoData_${symbol}_${timeFrame}`;

    const fetchData = async (isUpdate: boolean = false) => {
      try {
        const limit = isUpdate ? 1 : MAX_DATA_POINTS;
        const fetchedData = await fetchKlines(symbol, timeFrame, limit);
        if (!isMounted) return;

        setData(prevData => {
          const updatedData = isUpdate ? updateData(prevData, fetchedData) : fetchedData;
          localStorage.setItem(cacheKey, JSON.stringify(updatedData));
          return updatedData;
        });
        setStatus('success');
      } catch (err) {
        console.error("Failed to fetch klines:", err);
        if (isMounted) {
          setData(prevData => {
            if (prevData.length > 0) {
              setStatus('offline');
            } else {
              setStatus('error');
            }
            return prevData;
          });
        }
      }
    };
    
    const updateData = (currentData: CandleData[], newData: CandleData[]) => {
      if (newData.length === 0) return currentData;
      const newCandle = newData[0];
      if (currentData.length === 0) return [newCandle];
      const lastCandle = currentData[currentData.length - 1];
      if (newCandle.time === lastCandle.time) {
        return [...currentData.slice(0, -1), newCandle];
      } else {
        const combined = [...currentData, newCandle];
        return combined.slice(combined.length - MAX_DATA_POINTS);
      }
    };

    // Clear old data and set loading state on symbol/timeframe change
    setData([]);
    setStatus('loading');
    
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        setData(JSON.parse(cachedData));
        setStatus('offline');
      }
    } catch (e) {
      console.error("Failed to read from cache", e);
    }

    fetchData(false);

    const timer = setInterval(() => fetchData(true), interval);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [symbol, timeFrame, interval]);

  return { data, latestPrice: data.length > 0 ? data[data.length - 1] : null, status };
};
