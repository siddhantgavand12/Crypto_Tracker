// Fix: Removed extraneous file markers (e.g., '--- START OF FILE ...') that were causing parsing errors.
export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export enum TimeFrame {
  FiveMinutes = '5m',
  FifteenMinutes = '15m',
  ThirtyMinutes = '30m',
  OneHour = '1h',
  FourHours = '4h',
  OneDay = '1d',
  OneWeek = '1w',
  OneMonth = '1M',
}

export enum AlertDirection {
  Above = 'Above',
  Below = 'Below',
}

export interface Alert {
  id: string;
  symbol: string;
  price: number;
  direction: AlertDirection;
  triggered: boolean;
}
