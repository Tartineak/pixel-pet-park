import { memo, useEffect, useMemo, useState } from 'react';
import Sprite from '@/components/Sprite';
import { PAW_ROWS, PET_PALETTE } from '@/data/sprites';
import { fmtAgo, fmtPct, fmtPrice, marketStatus } from '@/lib/stockApi';
import type { Quote } from '@/types/stock';

const INDEX_LIST = [
  { code: 'sh000001', label: '上证指数' },
  { code: 'sz399001', label: '深证成指' },
  { code: 'sz399006', label: '创业板指' },
];

export const INDEX_CODES = INDEX_LIST.map((i) => i.code);

function PawMark() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-[#ffc2d4] bg-white shadow-[2px_2px_0_#ffc2d4]">
      <Sprite rows={PAW_ROWS} palette={PET_PALETTE} px={3.4} />
    </span>
  );
}

/**
 * 时钟 + 交易状态单独成组件：以前整个 Header（含跑马灯、心情值）
 * 每秒重渲染一次，这里把每秒变化的部分隔离出来。
 */
const StatusClock = memo(function StatusClock({ latestQuoteTime }: { latestQuoteTime?: string }) {
  const [st, setSt] = useState(() => marketStatus(latestQuoteTime));

  useEffect(() => {
    setSt(marketStatus(latestQuoteTime));
    const t = window.setInterval(() => setSt(marketStatus(latestQuoteTime)), 1000);
    return () => window.clearInterval(t);
  }, [latestQuoteTime]);

  return (
    <>
      <span className="inline-flex items-center gap-2 rounded-full border border-[#ffc2d4] bg-[#ffe9f0] px-3 py-1 text-[11px] tracking-wider">
        <span
          className={`h-1.5 w-1.5 rounded-full ${st.open ? 'led-pulse' : ''}`}
          style={{ color: st.open ? '#1c8f5f' : '#8d5568', background: 'currentColor' }}
        />
        <span className="text-[#43242f]">{st.label}</span>
      </span>
      <span className="num hidden text-xs text-[#8d5568] sm:block" title="北京时间">
        {st.clock}
      </span>
    </>
  );
});

/** 心情值：HP 条式分段仪表（反映整个乐园的平均涨跌） */
export const VitalityGauge = memo(function VitalityGauge({
  quotes,
  codes,
}: {
  quotes: Map<string, Quote>;
  codes: string[];
}) {
  const { avg, filled, tone } = useMemo(() => {
    const pcts = codes
      .map((c) => quotes.get(c)?.changePct)
      .filter((x): x is number => x !== undefined);
    const a = pcts.length ? pcts.reduce((x, y) => x + y, 0) / pcts.length : 0;
    // -3% ~ +3% 映射到 0~10 格
    const f = Math.round(((Math.min(3, Math.max(-3, a)) + 3) / 6) * 10);
    return { avg: a, filled: f, tone: a > 0 ? 'hsl(var(--up))' : a < 0 ? 'hsl(var(--down))' : '#8d5568' };
  }, [quotes, codes]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.18em] text-[#8d5568]">心情值</span>
      <div className="flex gap-[3px]" role="img" aria-label={`乐园平均涨跌 ${fmtPct(avg)}`}>
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="h-3.5 w-[7px] rounded-[3px] border border-[#ffc2d4]"
            style={{
              background: i < filled ? tone : '#ffe9f0',
              boxShadow: i < filled ? `0 0 6px ${tone}` : 'none',
            }}
          />
        ))}
      </div>
      <span className="num text-xs font-bold" style={{ color: tone }}>
        {fmtPct(avg)}
      </span>
    </div>
  );
});

const Ticker = memo(function Ticker({
  quotes,
  extraCodes,
}: {
  quotes: Map<string, Quote>;
  extraCodes: string[];
}) {
  const items = [
    ...INDEX_LIST.map((i) => ({ label: i.label, q: quotes.get(i.code) })),
    ...extraCodes.map((c) => {
      const q = quotes.get(c);
      return { label: q?.name ?? c, q };
    }),
  ].filter((x) => x.q);

  const content = (
    <>
      {items.map(({ label, q }) => {
        const up = (q!.changePct ?? 0) >= 0;
        return (
          <span key={label + q!.code} className="mx-6 inline-flex items-baseline gap-2 text-[11px]">
            <span className="uppercase tracking-[0.12em] text-[#8d5568]">{label}</span>
            <span className="num font-bold" style={{ color: up ? 'hsl(var(--up))' : 'hsl(var(--down))' }}>
              {fmtPrice(q!.price)} {fmtPct(q!.changePct)}
            </span>
            <span style={{ color: up ? 'hsl(var(--up))' : 'hsl(var(--down))' }}>{up ? '▲' : '▼'}</span>
          </span>
        );
      })}
    </>
  );

  return (
    <div className="relative overflow-hidden border-b border-[#ffc2d4] bg-white/70 py-1.5">
      <div className="ticker-track flex w-max whitespace-nowrap">
        <div className="flex">{content}</div>
        <div className="flex" aria-hidden>{content}</div>
      </div>
    </div>
  );
});

/** 「上次更新 xx 秒前」也每秒变，同样隔离 */
const LastUpdate = memo(function LastUpdate({
  lastUpdate,
  onRefresh,
}: {
  lastUpdate: number;
  onRefresh: () => void;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <button
      onClick={onRefresh}
      title="立即刷新行情"
      aria-label={`立即刷新行情，上次更新 ${fmtAgo(lastUpdate)}`}
      className="num inline-flex items-center gap-1.5 rounded-full border border-[#ffc2d4] bg-white px-2.5 py-1 text-[11px] text-[#8d5568] transition-colors hover:border-[#ff5d8f] hover:text-[#ff5d8f]"
    >
      <span aria-hidden>↻</span>
      <span className="hidden sm:inline">{lastUpdate ? fmtAgo(lastUpdate) : '加载中'}</span>
    </button>
  );
});

export default function Header({
  quotes,
  watchCodes,
  latestQuoteTime,
  lastUpdate,
  onRefresh,
}: {
  quotes: Map<string, Quote>;
  watchCodes: string[];
  latestQuoteTime?: string;
  lastUpdate: number;
  onRefresh: () => void;
}) {
  return (
    <div className="sticky top-0 z-40">
      <header className="border-b border-[#ffc2d4] bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <PawMark />
            <div>
              <h1 className="text-sm font-bold tracking-wider text-[#43242f]">像素萌宠乐园</h1>
              <div className="font-pixel text-[7px] tracking-wider text-[#ff5d8f]">
                PIXEL PET PARK
              </div>
            </div>
          </div>

          <StatusClock latestQuoteTime={latestQuoteTime} />

          <div className="ml-auto flex items-center gap-4">
            <VitalityGauge quotes={quotes} codes={watchCodes} />
            <LastUpdate lastUpdate={lastUpdate} onRefresh={onRefresh} />
          </div>
        </div>
      </header>
      <Ticker quotes={quotes} extraCodes={watchCodes} />
    </div>
  );
}
