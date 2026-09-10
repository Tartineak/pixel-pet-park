import type { KlineBar } from '@/types/stock';

/**
 * 技术指标引擎（纯前端，离线计算）
 * 指标定义与信号判定规则遵循技术分析标准口径：
 * MA 交叉、MACD(12,26,9)、RSI(14)、布林带(20,2)、KDJ(9,3,3)
 */

export type Direction = 'bullish' | 'bearish' | 'neutral';

export interface Signal {
  key: string;
  name: string;
  icon: string;
  direction: Direction;
  /** 新手友好的一句话解读 */
  plain: string;
  /** 指标数值摘要 */
  valueText: string;
}

export interface SignalReport {
  signals: Signal[];
  bullish: number;
  bearish: number;
  neutral: number;
  verdict: Direction;
  verdictText: string;
}

/* ---------- 基础计算 ---------- */

function sma(values: number[], n: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < n - 1) return null;
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += values[j];
    return s / n;
  });
}

function ema(values: number[], n: number): (number | null)[] {
  const k = 2 / (n + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  values.forEach((v, i) => {
    if (i < n - 1) {
      out.push(null);
      return;
    }
    if (prev === null) {
      let s = 0;
      for (let j = i - n + 1; j <= i; j++) s += values[j];
      prev = s / n;
    } else {
      prev = v * k + prev * (1 - k);
    }
    out.push(prev);
  });
  return out;
}

function rsi(closes: number[], n = 14): (number | null)[] {
  const out: (number | null)[] = [null];
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const up = Math.max(diff, 0);
    const down = Math.max(-diff, 0);
    if (i <= n) {
      gain += up;
      loss += down;
      if (i === n) {
        gain /= n;
        loss /= n;
        out.push(loss === 0 ? 100 : 100 - 100 / (1 + gain / loss));
      } else {
        out.push(null);
      }
    } else {
      gain = (gain * (n - 1) + up) / n;
      loss = (loss * (n - 1) + down) / n;
      out.push(loss === 0 ? 100 : 100 - 100 / (1 + gain / loss));
    }
  }
  return out;
}

function boll(closes: number[], n = 20, mult = 2) {
  const mid = sma(closes, n);
  return closes.map((_, i) => {
    const m = mid[i];
    if (m === null) return { mid: null, up: null, low: null };
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += (closes[j] - m) ** 2;
    const sd = Math.sqrt(s / n);
    return { mid: m, up: m + mult * sd, low: m - mult * sd };
  });
}

function kdj(bars: KlineBar[], n = 9) {
  let k = 50;
  let d = 50;
  const out = bars.map((b, i) => {
    if (i < n - 1) return { k: null, d: null, j: null };
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - n + 1; j <= i; j++) {
      hh = Math.max(hh, bars[j].high);
      ll = Math.min(ll, bars[j].low);
    }
    const rsv = hh === ll ? 50 : ((b.close - ll) / (hh - ll)) * 100;
    k = (2 / 3) * k + (1 / 3) * rsv;
    d = (2 / 3) * d + (1 / 3) * k;
    return { k, d, j: 3 * k - 2 * d };
  });
  return out;
}

/* ---------- 信号研判 ---------- */

const last = <T,>(arr: (T | null)[]): T | null => arr[arr.length - 1] ?? null;

export function analyze(bars: KlineBar[]): SignalReport | null {
  if (bars.length < 30) return null;
  const closes = bars.map((b) => b.close);
  const price = closes[closes.length - 1];
  const signals: Signal[] = [];

  // 1. MA 交叉
  const sma5 = last(sma(closes, 5));
  const sma20 = last(sma(closes, 20));
  if (sma5 !== null && sma20 !== null) {
    const bull = sma5 > sma20;
    signals.push({
      key: 'ma',
      name: '均线排列',
      icon: '〰️',
      direction: bull ? 'bullish' : 'bearish',
      valueText: `MA5 ${sma5.toFixed(2)} / MA20 ${sma20.toFixed(2)}`,
      plain: bull
        ? '5 日均线在 20 日均线上方，最近买入的人整体是赚的，短期气势偏强'
        : '5 日均线在 20 日均线下方，最近买入的人整体浮亏，短期气势偏弱',
    });
  }

  // 2. MACD
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const dif = closes.map((_, i) =>
    ema12[i] !== null && ema26[i] !== null ? (ema12[i] as number) - (ema26[i] as number) : null,
  );
  const difNums = dif.filter((x): x is number => x !== null);
  const dea = ema(difNums, 9);
  const difLast = difNums[difNums.length - 1];
  const deaLast = last(dea);
  if (deaLast !== null) {
    const hist = difLast - deaLast;
    const bull = hist > 0;
    signals.push({
      key: 'macd',
      name: 'MACD',
      icon: '🌊',
      direction: bull ? 'bullish' : 'bearish',
      valueText: `柱体 ${hist >= 0 ? '+' : ''}${hist.toFixed(2)}`,
      plain: bull
        ? 'MACD 红柱，上涨动能在积累，类似车还在踩油门'
        : 'MACD 绿柱，下跌动能在释放，类似车还在踩刹车',
    });
  }

  // 3. RSI
  const rsiLast = last(rsi(closes));
  if (rsiLast !== null) {
    const dir: Direction = rsiLast < 30 ? 'bullish' : rsiLast > 70 ? 'bearish' : 'neutral';
    signals.push({
      key: 'rsi',
      name: 'RSI 强弱',
      icon: '🌡️',
      direction: dir,
      valueText: `RSI ${rsiLast.toFixed(0)}`,
      plain:
        rsiLast < 30
          ? 'RSI 低于 30 属于"超卖"，跌得有点急，历史上常出现技术性反弹'
          : rsiLast > 70
            ? 'RSI 高于 70 属于"超买"，涨得有点急，要留意冲高回落'
            : 'RSI 在 30~70 之间，多空力量大体均衡，不冷不热',
    });
  }

  // 4. 布林带
  const b = last(boll(closes).map((x) => (x.up === null ? null : x))) as
    | { mid: number; up: number; low: number }
    | null;
  if (b) {
    const dir: Direction = price < b.low ? 'bullish' : price > b.up ? 'bearish' : 'neutral';
    signals.push({
      key: 'boll',
      name: '布林带位置',
      icon: '🎯',
      direction: dir,
      valueText: `上轨 ${b.up.toFixed(2)} / 下轨 ${b.low.toFixed(2)}`,
      plain:
        price < b.low
          ? '价格跌穿了布林带下轨，偏离正常波动区间，常被视为超跌'
          : price > b.up
            ? '价格冲破了布林带上轨，短期偏离正常波动区间，注意别追高'
            : '价格在布林带轨道内部运行，波动处于正常范围',
    });
  }

  // 5. KDJ
  const kd = last(kdj(bars).map((x) => (x.k === null ? null : x))) as
    | { k: number; d: number; j: number }
    | null;
  if (kd) {
    const bull = kd.j < 20 || kd.k > kd.d;
    const bear = kd.j > 80 || kd.k < kd.d;
    const dir: Direction = kd.j < 20 || kd.j > 80 ? (kd.j < 20 ? 'bullish' : 'bearish') : bear ? 'bearish' : bull ? 'bullish' : 'neutral';
    signals.push({
      key: 'kdj',
      name: 'KDJ',
      icon: '⚡',
      direction: dir,
      valueText: `K ${kd.k.toFixed(0)} / D ${kd.d.toFixed(0)} / J ${kd.j.toFixed(0)}`,
      plain:
        kd.j > 80
          ? 'J 值超过 80，短线情绪有点过热'
          : kd.j < 20
            ? 'J 值低于 20，短线情绪偏冷，常被看作超卖区'
            : kd.k > kd.d
              ? 'K 线上穿 D 线，短线动能向上'
              : 'K 线下穿 D 线，短线动能向下',
    });
  }

  const bullish = signals.filter((s) => s.direction === 'bullish').length;
  const bearish = signals.filter((s) => s.direction === 'bearish').length;
  const neutral = signals.length - bullish - bearish;
  const verdict: Direction =
    bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral';
  const verdictText =
    verdict === 'bullish'
      ? '整体偏暖：偏多信号占上风'
      : verdict === 'bearish'
        ? '整体偏凉：偏空信号占上风'
        : '不冷不热：多空信号打了个平手';

  return { signals, bullish, bearish, neutral, verdict, verdictText };
}
