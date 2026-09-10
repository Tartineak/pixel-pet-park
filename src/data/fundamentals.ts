/**
 * 基本面体检数据快照
 * 来源：同花顺 iFinD 财务指标接口（盈利 + 成长维度）
 * 报告期：2026 年半年报；快照日期：2026-09-01
 * 注：这是离线快照，想刷新可以找我来更新。
 */

export interface Fundamentals {
  code: string;
  name: string;
  roe: number; // 净资产收益率 %（半年报）
  netMargin: number | null; // 销售净利率 %
  grossMargin: number | null; // 毛利率 %
  eps: number; // 基本每股收益 元
  revYoy: number; // 营收同比 %
  profitYoy: number; // 归母净利润同比 %
}

export const FUND_REPORT_PERIOD = '2026 年中报';
export const FUND_AS_OF = '2026-09-01';

export const FUNDAMENTALS: Record<string, Fundamentals> = {
  sh600519: {
    code: 'sh600519',
    name: '贵州茅台',
    roe: 17.95,
    netMargin: 50.75,
    grossMargin: 89.56,
    eps: 35.57,
    revYoy: 1.47,
    profitYoy: -1.95,
  },
  sz300750: {
    code: 'sz300750',
    name: '宁德时代',
    roe: 12.08,
    netMargin: 16.98,
    grossMargin: 23.93,
    eps: 9.51,
    revYoy: 54.8,
    profitYoy: 41.98,
  },
  sz002594: {
    code: 'sz002594',
    name: '比亚迪',
    roe: 4.86,
    netMargin: 3.58,
    grossMargin: 18.85,
    eps: 1.35,
    revYoy: -7.13,
    profitYoy: -20.54,
  },
  sh600036: {
    code: 'sh600036',
    name: '招商银行',
    roe: 5.84,
    netMargin: 43.17,
    grossMargin: null,
    eps: 2.98,
    revYoy: 4.83,
    profitYoy: 2.02,
  },
  sz000858: {
    code: 'sz000858',
    name: '五粮液',
    roe: 7.34,
    netMargin: 31.66,
    grossMargin: 80.29,
    eps: 2.26,
    revYoy: 20.87,
    profitYoy: 89.3,
  },
  sz300059: {
    code: 'sz300059',
    name: '东方财富',
    roe: 8.48,
    netMargin: null,
    grossMargin: 86.21,
    eps: 0.51,
    revYoy: 44.48,
    profitYoy: 44.85,
  },
};

/* ---------- 体检打分（0~9 分，映射为 1~5 朵花） ---------- */

function scoreBand(v: number, good: number, ok: number): number {
  if (v >= good) return 3;
  if (v >= ok) return 2;
  if (v >= 0) return 1;
  return 0;
}

export function healthScore(f: Fundamentals): { score: number; flowers: number; label: string } {
  const s =
    scoreBand(f.roe, 15, 8) + scoreBand(f.revYoy, 20, 5) + scoreBand(f.profitYoy, 20, 5);
  const flowers = Math.max(1, Math.round((s / 9) * 5));
  const label = s >= 7 ? '优等生' : s >= 4 ? '中规中矩' : '需要观察';
  return { score: s, flowers, label };
}

export function roeComment(roe: number): string {
  if (roe >= 15) return '股东的钱半年就赚了近两成年化回报，赚钱能力很强';
  if (roe >= 8) return '赚钱能力良好，超过大多数公司';
  if (roe >= 3) return '赚钱能力一般，不算突出';
  return '赚钱能力偏弱，值得关注原因';
}

export function growthComment(v: number): string {
  if (v >= 30) return '高速成长，生意规模扩张很快';
  if (v >= 10) return '稳步成长，节奏健康';
  if (v >= 0) return '基本持平，略有增长';
  return '同比在收缩，需要留意是不是遇到了困难';
}
