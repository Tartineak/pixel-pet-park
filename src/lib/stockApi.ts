import type { KlineBar, Quote, SearchResult } from '@/types/stock';

/**
 * 数据源：腾讯公开行情接口（浏览器端直接访问，均允许跨域）。
 * - 快照：qt.gtimg.cn（GBK 编码，用 TextDecoder 解码）
 * - K线：ifzq.gtimg.cn（UTF-8 JSON）
 * - 搜索：smartbox.gtimg.cn（JSONP，无 CORS 头，用 <script> 方式加载）
 *
 * 所有网络请求都带超时 + 可中断（AbortSignal），避免请求悬挂。
 */

const fnum = (s: string | undefined): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const DEFAULT_TIMEOUT = 8000;

/** fetch + 超时 + 外部中断信号 */
async function fetchWithTimeout(
  url: string,
  { timeout = DEFAULT_TIMEOUT, signal }: { timeout?: number; signal?: AbortSignal } = {},
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeout);
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/* ---------------- 北京时间 ---------------- */

export interface BeijingNow {
  /** yyyy-mm-dd */
  date: string;
  /** HH:MM:SS */
  clock: string;
  /** 0=周日 … 6=周六 */
  dow: number;
  /** 当日分钟数 */
  mins: number;
}

/**
 * 取北京时间（Asia/Shanghai），不依赖设备时区。
 * 原来的实现直接用 new Date().getHours()，设备时区不是 UTC+8 时交易时段会全错。
 */
export function beijingNow(d: Date = new Date()): BeijingNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const date = `${g('year')}-${g('month')}-${g('day')}`;
  const h = Number(g('hour'));
  const mi = Number(g('minute'));
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return { date, clock: `${g('hour')}:${g('minute')}:${g('second')}`, dow, mins: h * 60 + mi };
}

/**
 * 交易所休市日（yyyy-mm-dd）。每年上交所会发《休市安排公告》，
 * 把对应日期填进来即可；没填也不要紧——marketStatus 会用行情快照日期兜底判断。
 */
export const MARKET_HOLIDAYS: string[] = [
  // 例：'2026-10-01', '2026-10-02', ...
];

export interface MarketStatus {
  open: boolean;
  label: string;
  /** 北京时间 HH:MM:SS，Header 直接用这个显示 */
  clock: string;
  date: string;
}

/**
 * A股交易时段判断（北京时间，周一~周五 9:30-11:30 / 13:00-15:00）。
 * @param latestQuoteTime 最新快照时间戳（yyyymmddHHMMSS）。开盘 5 分钟后若快照日期
 *        仍停留在更早的日期，说明今天并非交易日（节假日），据此兜底识别休市。
 */
export function marketStatus(latestQuoteTime?: string): MarketStatus {
  const { date, clock, dow, mins } = beijingNow();
  const base = { clock, date };

  if (dow === 0 || dow === 6) return { ...base, open: false, label: '周末休市' };
  if (MARKET_HOLIDAYS.includes(date)) return { ...base, open: false, label: '节假日休市' };

  if (latestQuoteTime && latestQuoteTime.length >= 8 && mins > 9 * 60 + 35) {
    const qd = `${latestQuoteTime.slice(0, 4)}-${latestQuoteTime.slice(4, 6)}-${latestQuoteTime.slice(6, 8)}`;
    if (qd < date) return { ...base, open: false, label: '今日休市' };
  }

  const inAm = mins >= 9 * 60 + 30 && mins <= 11 * 60 + 30;
  const inPm = mins >= 13 * 60 && mins <= 15 * 60;
  if (inAm || inPm) return { ...base, open: true, label: '交易中' };
  if (mins < 9 * 60 + 15) return { ...base, open: false, label: '未开盘' };
  if (mins < 9 * 60 + 30) return { ...base, open: false, label: '集合竞价' };
  if (mins < 13 * 60) return { ...base, open: false, label: '午间休市' };
  return { ...base, open: false, label: '已收盘' };
}

/* ---------------- 实时快照 ---------------- */

const CHUNK = 50;

async function fetchQuoteChunk(
  codes: string[],
  out: Map<string, Quote>,
  signal?: AbortSignal,
): Promise<void> {
  const url = `https://qt.gtimg.cn/q=${codes.join(',')}`;
  const res = await fetchWithTimeout(url, { signal });
  const buf = await res.arrayBuffer();
  const text = new TextDecoder('gbk').decode(buf);
  // v_sh600519="1~贵州茅台~600519~...";
  const re = /v_([a-z]{2}\d{6})="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const code = m[1];
    const f = m[2].split('~');
    if (f.length < 40) continue;
    out.set(code, {
      code,
      name: f[1] ?? '',
      price: fnum(f[3]),
      prevClose: fnum(f[4]),
      open: fnum(f[5]),
      high: fnum(f[33]),
      low: fnum(f[34]),
      change: fnum(f[31]),
      changePct: fnum(f[32]),
      turnoverPct: fnum(f[38]),
      pe: fnum(f[39]),
      amount: fnum(f[37]),
      time: f[30] ?? '',
    });
  }
}

/** 批量拉取快照。代码多时自动分批，单批失败不影响其它批次。 */
export async function fetchQuotes(codes: string[], signal?: AbortSignal): Promise<Map<string, Quote>> {
  const out = new Map<string, Quote>();
  if (codes.length === 0) return out;

  const chunks: string[][] = [];
  for (let i = 0; i < codes.length; i += CHUNK) chunks.push(codes.slice(i, i + CHUNK));

  const results = await Promise.allSettled(
    chunks.map((c) => fetchQuoteChunk(c, out, signal)),
  );
  // 全部批次都失败才算真失败
  if (results.every((r) => r.status === 'rejected')) {
    throw (results[0] as PromiseRejectedResult).reason;
  }
  return out;
}

/* ---------------- 日 K 线（带缓存） ---------------- */

const KLINE_TTL = 5 * 60 * 1000;
const klineCache = new Map<string, { at: number; bars: KlineBar[] }>();

export async function fetchKline(
  code: string,
  count = 160,
  signal?: AbortSignal,
): Promise<KlineBar[]> {
  const key = `${code}:${count}`;
  const hit = klineCache.get(key);
  if (hit && Date.now() - hit.at < KLINE_TTL) return hit.bars;

  const url = `https://ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code},day,,,${count},qfq`;
  const res = await fetchWithTimeout(url, { timeout: 12000, signal });
  const json = await res.json();
  const node = json?.data?.[code];
  const rows: unknown[] = node?.qfqday ?? node?.day ?? [];
  const bars = rows
    .map((r) => {
      const a = r as (string | number)[];
      return {
        time: String(a[0]),
        open: fnum(String(a[1])),
        close: fnum(String(a[2])),
        high: fnum(String(a[3])),
        low: fnum(String(a[4])),
        volume: fnum(String(a[5])),
      };
    })
    .filter((b) => b.time && b.close > 0);

  if (bars.length > 0) klineCache.set(key, { at: Date.now(), bars });
  return bars;
}

/* ---------------- 搜索（JSONP） ---------------- */

declare global {
  interface Window {
    v_hint?: string;
  }
}

/**
 * 腾讯 smartbox 固定把结果写在全局 window.v_hint 上，多个请求并发时会互相覆盖。
 * 因此这里保证「同一时刻只有一个在飞」：新搜索会先取消上一次。
 */
let cancelActive: (() => void) | null = null;

export function searchStocks(keyword: string): Promise<SearchResult[]> {
  cancelActive?.();

  return new Promise((resolve) => {
    const script = document.createElement('script');
    let done = false;

    const cleanup = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      script.remove();
      delete window.v_hint;
      if (cancelActive === cancel) cancelActive = null;
    };

    const cancel = () => {
      cleanup();
      resolve([]);
    };

    const timer = window.setTimeout(cancel, 6000);
    cancelActive = cancel;

    script.src = `https://smartbox.gtimg.cn/s3/?v=2&q=${encodeURIComponent(keyword)}&t=all`;
    script.onload = () => {
      const raw = window.v_hint ?? '';
      cleanup();
      if (!raw) return resolve([]);
      // 格式: "sh~600519~贵州茅台~gzmt~GP-A^sz~000858~五粮液~wly~GP-A"
      const list = raw
        .split('^')
        .map((seg) => seg.split('~'))
        .filter((a) => a.length >= 3 && (a[4] === 'GP-A' || a[0] === 'sh' || a[0] === 'sz'))
        .map((a) => ({ code: `${a[0]}${a[1]}`, name: a[2] }))
        .filter((r) => /^[a-z]{2}\d{6}$/.test(r.code));
      resolve(list.slice(0, 12));
    };
    script.onerror = cancel;
    document.body.appendChild(script);
  });
}

/* ---------------- 格式化 ---------------- */

export function fmtPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '--';
  return n.toFixed(2);
}

export function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return '--';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function fmtAmount(wan: number): string {
  if (!Number.isFinite(wan) || wan <= 0) return '--';
  if (wan >= 1e4) return `${(wan / 1e4).toFixed(1)}亿`;
  return `${wan.toFixed(0)}万`;
}

/** 距今多久（用于「上次更新」） */
export function fmtAgo(ts: number): string {
  if (!ts) return '--';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s} 秒前`;
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  return `${Math.floor(s / 3600)} 小时前`;
}
