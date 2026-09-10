/** 自选股条目，code 形如 sh600519 / sz000001 */
export interface WatchItem {
  code: string;
  name: string;
}

/** 行情快照（解析自腾讯 qt.gtimg.cn） */
export interface Quote {
  code: string;
  name: string;
  price: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePct: number; // 百分比数值，如 1.25
  turnoverPct: number; // 换手率 %
  pe: number; // 市盈率，可能为 0/NaN
  amount: number; // 成交额（万元）
  time: string; // 20260901103015
}

export interface SearchResult {
  code: string;
  name: string;
}

export interface KlineBar {
  time: string; // yyyy-mm-dd
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type AlertType = 'above' | 'below' | 'pctUp' | 'pctDown';

export interface AlertRule {
  id: string;
  code: string;
  name: string;
  type: AlertType;
  value: number;
  status: 'active' | 'triggered';
  createdAt: number;
  triggeredAt?: number;
  triggerNote?: string;
}

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  above: '价格涨到 ≥',
  below: '价格跌到 ≤',
  pctUp: '涨幅超过 ≥',
  pctDown: '跌幅超过 ≤',
};
