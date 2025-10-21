import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Bar,
  Line,
} from 'recharts';
import type { CandleData, TimeFrame } from '../types';
import { TimeFrame as TimeFrameEnum } from '../types';
import type { DataStatus } from '../hooks/useCryptoData';

interface CryptoChartProps {
  data: CandleData[];
  status: DataStatus;
  symbol: string;
  timeFrame: TimeFrame;
  onChartClick?: (price: number) => void;
}

// ---------------- Existing Components ---------------- //
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    if (!dataPoint) return null;

    return (
      <div className="bg-slate-700 p-3 rounded-md border border-slate-600 text-sm shadow-lg">
        <p className="label font-semibold text-white">
          {new Date(label).toLocaleString()}
        </p>
        <p className="text-slate-400 mt-2">
          Open:{' '}
          <span className="font-semibold text-cyan-400">
            ${dataPoint.open.toFixed(2)}
          </span>
        </p>
        <p className="text-slate-400">
          High:{' '}
          <span className="font-semibold text-emerald-400">
            ${dataPoint.high.toFixed(2)}
          </span>
        </p>
        <p className="text-slate-400">
          Low:{' '}
          <span className="font-semibold text-rose-500">
            ${dataPoint.low.toFixed(2)}
          </span>
        </p>
        <p className="text-slate-400">
          Close:{' '}
          <span className="font-semibold text-cyan-400">
            ${dataPoint.close.toFixed(2)}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

const ChartControls: React.FC<{
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPanLeft: () => void;
  onPanRight: () => void;
  canPanLeft: boolean;
  canPanRight: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
}> = ({
  onZoomIn,
  onZoomOut,
  onPanLeft,
  onPanRight,
  canPanLeft,
  canPanRight,
  canZoomIn,
  canZoomOut,
}) => {
  const ControlButton: React.FC<{
    onClick: () => void;
    disabled: boolean;
    children: React.ReactNode;
    title: string;
  }> = ({ onClick, disabled, children, title }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-300 rounded-md transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
      <ControlButton onClick={onPanLeft} disabled={!canPanLeft} title="Pan Left">
        ←
      </ControlButton>
      <ControlButton onClick={onPanRight} disabled={!canPanRight} title="Pan Right">
        →
      </ControlButton>
      <ControlButton onClick={onZoomOut} disabled={!canZoomOut} title="Zoom Out">
        −
      </ControlButton>
      <ControlButton onClick={onZoomIn} disabled={!canZoomIn} title="Zoom In">
        +
      </ControlButton>
    </div>
  );
};

const Candlestick = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (width <= 0 || height < 0 || x === undefined || y === undefined || !payload)
    return null;

  const { open, close, high, low } = payload;
  if (high === low) return null;

  const isBullish = close >= open;
  const fill = isBullish ? '#34d399' : '#f43f5e';
  const wickColor = '#94a3b8';
  const scale = (price: number) => y + (height * (high - price)) / (high - low);

  const openY = scale(open);
  const closeY = scale(close);
  const bodyY = Math.min(openY, closeY);
  const bodyHeight = Math.abs(openY - closeY);
  const finalBodyHeight = Math.max(bodyHeight, 1);

  return (
    <g shapeRendering="crispEdges">
      <line
        x1={x + width / 2}
        y1={y}
        x2={x + width / 2}
        y2={y + height}
        stroke={wickColor}
        strokeWidth={1}
      />
      <rect x={x} y={bodyY} width={width} height={finalBodyHeight} fill={fill} />
    </g>
  );
};

const CustomCursor: React.FC<any> = (props) => {
  const { points, width, height, chartY } = props;
  if (!points || points.length === 0) return null;
  const { x } = points[0];
  const showHorizontalLine =
    chartY !== undefined && chartY > 0 && chartY < height;

  return (
    <g>
      <line
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="#94a3b8"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {showHorizontalLine && (
        <line
          x1={0}
          y1={chartY}
          x2={width}
          y2={chartY}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}
    </g>
  );
};

const getTickFormatter = (timeFrame: TimeFrame) => {
  switch (timeFrame) {
    case TimeFrameEnum.OneDay:
    case TimeFrameEnum.OneWeek:
    case TimeFrameEnum.OneMonth:
      return (time: number) =>
        new Date(time).toLocaleDateString([], { month: 'short', day: 'numeric' });
    default:
      return (time: number) =>
        new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

const OHLCLegend: React.FC<{ data: CandleData | null }> = ({ data }) => {
  if (!data) return null;
  return (
    <div >
    </div>
  );
};

const calculateEMA = (data, period, key = 'close') => {
  if (!data || data.length < period) return [];
  const k = 2 / (period + 1);
  let emaArray = [];
  let prevEMA = data[0][key];
  emaArray.push(prevEMA);

  for (let i = 1; i < data.length; i++) {
    const ema = data[i][key] * k + prevEMA * (1 - k);
    emaArray.push(ema);
    prevEMA = ema;
  }

  return emaArray;
};

export const CryptoChart: React.FC<CryptoChartProps> = ({
  data,
  status,
  symbol,
  timeFrame,
  onChartClick,
}) => {
  const INITIAL_VISIBLE_CANDLES = 60;
  const MIN_CANDLES = 15;
  const ZOOM_AMOUNT = 10;
  const PAN_AMOUNT = 15;

  const cacheKey = useMemo(() => `chartView_${symbol}_${timeFrame}`, [symbol, timeFrame]);
  const [viewDomain, setViewDomain] = useState({ startIndex: 0, endIndex: 0 });
  const [activePayload, setActivePayload] = useState<CandleData | null>(null);
  const [showEMA9, setShowEMA9] = useState(true);
  const [showEMA15, setShowEMA15] = useState(true);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    isInitialLoad.current = true;
  }, [symbol, timeFrame]);

  useEffect(() => {
    if (viewDomain.endIndex > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(viewDomain));
    }
  }, [viewDomain, cacheKey]);

  useEffect(() => {
    if (data.length > 0 && isInitialLoad.current) {
      isInitialLoad.current = false;
      let initialView = null;
      try {
        const savedView = localStorage.getItem(cacheKey);
        if (savedView) {
          const parsed = JSON.parse(savedView);
          if (
            parsed.endIndex > 0 &&
            parsed.endIndex <= data.length &&
            parsed.startIndex < parsed.endIndex
          ) {
            initialView = parsed;
          }
        }
      } catch (e) {
        console.error('Failed to parse chart view from cache', e);
      }

      if (initialView) {
        setViewDomain(initialView);
      } else {
        const startIndex = Math.max(0, data.length - INITIAL_VISIBLE_CANDLES);
        const endIndex = data.length;
        setViewDomain({ startIndex, endIndex });
      }
    }
  }, [data, cacheKey]);

  const processedData = useMemo(() => {
    const visible = data.slice(viewDomain.startIndex, viewDomain.endIndex);
    const ema9 = calculateEMA(visible, 9);
    const ema15 = calculateEMA(visible, 15);
    return visible.map((d, i) => ({
      ...d,
      ema9: ema9[i],
      ema15: ema15[i],
    }));
  }, [data, viewDomain]);

  const latestDataPoint = data.length > 0 ? data[data.length - 1] : null;
  const tickFormatter = useMemo(() => getTickFormatter(timeFrame), [timeFrame]);

  const handlePanLeft = () =>
    setViewDomain((prev) => {
      const newStartIndex = Math.max(0, prev.startIndex - PAN_AMOUNT);
      const newEndIndex = newStartIndex + (prev.endIndex - prev.startIndex);
      return { startIndex: newStartIndex, endIndex: newEndIndex };
    });

  const handlePanRight = () =>
    setViewDomain((prev) => {
      const newEndIndex = Math.min(data.length, prev.endIndex + PAN_AMOUNT);
      const newStartIndex = newEndIndex - (prev.endIndex - prev.startIndex);
      return { startIndex: newStartIndex, endIndex: newEndIndex };
    });

  const handleZoomIn = () =>
    setViewDomain((prev) => {
      const currentRange = prev.endIndex - prev.startIndex;
      if (currentRange <= MIN_CANDLES) return prev;
      const newStartIndex = Math.min(prev.endIndex - MIN_CANDLES, prev.startIndex + ZOOM_AMOUNT);
      const newEndIndex = Math.max(newStartIndex + MIN_CANDLES, prev.endIndex - ZOOM_AMOUNT);
      return { startIndex: newStartIndex, endIndex: newEndIndex };
    });

  const handleZoomOut = () =>
    setViewDomain((prev) => {
      const newStartIndex = Math.max(0, prev.startIndex - ZOOM_AMOUNT);
      const newEndIndex = Math.min(data.length, prev.endIndex + ZOOM_AMOUNT);
      return { startIndex: newStartIndex, endIndex: newEndIndex };
    });

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-[400px] text-rose-500 text-center p-4">
        Could not load chart data. Please check your internet connection.
      </div>
    );
  }

  if (status === 'loading' && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-slate-400">
        Loading chart data...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-slate-400">
        No data available for this symbol or time frame.
      </div>
    );
  }

  const canPanLeft = viewDomain.startIndex > 0;
  const canPanRight = viewDomain.endIndex < data.length;
  const canZoomIn = viewDomain.endIndex - viewDomain.startIndex > MIN_CANDLES;
  const canZoomOut = viewDomain.startIndex > 0 || viewDomain.endIndex < data.length;

  const yDomain = ([min, max]: [number, number]): [number, number] => [
    min * 0.99,
    max * 1.01,
  ];

  return (
    <div className="relative h-[400px] w-full bg-[#0b1120] rounded-2xl">
      <OHLCLegend data={activePayload || latestDataPoint} />
      <ChartControls
        onPanLeft={handlePanLeft}
        onPanRight={handlePanRight}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        canPanLeft={canPanLeft}
        canPanRight={canPanRight}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
      />

      {/* 🔘 EMA Toggles */}
      <div className="absolute top-4 left-5 z-10 flex items-center gap-2">
        <button
          onClick={() => setShowEMA9((prev) => !prev)}
          className={`px-2 py-1 rounded-md text-xs ${
            showEMA9 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          9 EMA
        </button>
        <button
          onClick={() => setShowEMA15((prev) => !prev)}
          className={`px-2 py-1 rounded-md text-xs ${
            showEMA15 ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          15 EMA
        </button>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={processedData}
          margin={{ top: 20, right: 20, left: -15, bottom: 5 }}
          onMouseMove={(state: any) => {
            if (state && state.activePayload && state.activePayload.length > 0) {
              setActivePayload(state.activePayload[0].payload);
            }
          }}
          onMouseLeave={() => setActivePayload(null)}
          onClick={(state: any) => {
            if (state && state.activePayload && state.activePayload.length > 0 && onChartClick) {
              const highPrice = state.activePayload[0].payload.high;
              onChartClick(highPrice);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="time"
            tickFormatter={tickFormatter}
            stroke="#94a3b8"
            dy={10}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={yDomain}
            orientation="right"
            tickFormatter={(price) => `${price.toLocaleString()}`}
            stroke="#94a3b8"
            dx={5}
            tickCount={8}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={<CustomCursor />}
            isAnimationActive={false}
          />

          <Bar
            dataKey={(d: CandleData) => [d.low, d.high]}
            shape={<Candlestick />}
            barSize={7}
            isAnimationActive={false}
          />

          {/* ✅ 9 EMA (Blue) */}
          {showEMA9 && (
            <Line
              type="monotone"
              dataKey="ema9"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          )}
 
          {/* ✅ 15 EMA (Red) */}
          {showEMA15 && (
            <Line
              type="monotone"
              dataKey="ema15"
              stroke="#ef4444"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          )}
          
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};