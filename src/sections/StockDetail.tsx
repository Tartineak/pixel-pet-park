import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchKline, fmtAmount, fmtPct, fmtPrice } from '@/lib/stockApi';
import type { AlertType, KlineBar, Quote, WatchItem } from '@/types/stock';
import FundamentalsCard from './FundamentalsCard';
import KlineChart from './KlineChart';
import MoodMascot from './MoodMascot';
import SignalCard from './SignalCard';

const ALERT_OPTIONS: Array<{ value: AlertType; label: string; unit: string; hint: string }> = [
  { value: 'above', label: '价格涨到 ≥', unit: '元', hint: '比如想在突破某个价位时知道' },
  { value: 'below', label: '价格跌到 ≤', unit: '元', hint: '比如想在回调到某价位时知道' },
  { value: 'pctUp', label: '今日涨幅 ≥', unit: '%', hint: '比如涨超 5% 时提醒' },
  { value: 'pctDown', label: '今日跌幅 ≥', unit: '%', hint: '比如跌超 3% 时提醒' },
];

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-[#ffc2d4] bg-[#ffe9f0] px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-[0.15em] text-[#8d5568]">{label}</div>
      <div className="num mt-1 text-sm font-bold" style={{ color: tone ?? '#43242f' }}>
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#ff5d8f]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#ff5d8f]" />
      {children}
    </div>
  );
}

export default function StockDetail({
  item,
  quote,
  open,
  onClose,
  onRemove,
  onAddAlert,
}: {
  item: WatchItem | null;
  quote: Quote | undefined;
  open: boolean;
  onClose: () => void;
  onRemove: (code: string) => void;
  onAddAlert: (r: { code: string; name: string; type: AlertType; value: number }) => void;
}) {
  const [bars, setBars] = useState<KlineBar[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [aType, setAType] = useState<AlertType>('above');
  const [aValue, setAValue] = useState('');
  const [saved, setSaved] = useState(false);

  const code = item?.code;
  useEffect(() => {
    if (!open || !code) return;
    const ctrl = new AbortController();
    setChartLoading(true);
    setBars([]);
    setSaved(false);
    setAValue('');
    fetchKline(code, 160, ctrl.signal)
      .then((b) => {
        if (!ctrl.signal.aborted) setBars(b);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setBars([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setChartLoading(false);
      });
    // 关掉弹窗 / 切换股票时中断在途请求
    return () => ctrl.abort();
  }, [open, code]);

  if (!item) return null;
  const q = quote;
  const up = (q?.changePct ?? 0) >= 0;
  const tone = q ? (up ? 'hsl(var(--up))' : 'hsl(var(--down))') : undefined;
  const opt = ALERT_OPTIONS.find((o) => o.value === aType)!;

  const submitAlert = () => {
    const v = Number(aValue);
    if (!Number.isFinite(v) || v <= 0) return;
    onAddAlert({ code: item.code, name: item.name, type: aType, value: v });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl border-2 border-[#ffc2d4] bg-white p-5 text-[#43242f]">
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[#43242f]">{item.name}</span>
            <span className="num text-[11px] uppercase tracking-wider text-[#8d5568]">
              {item.code.slice(0, 2)}.{item.code.slice(2)}
            </span>
            {q && (
              <span className="num ml-auto text-xl font-bold" style={{ color: tone }}>
                {fmtPrice(q.price)}
                <span className="ml-2 text-sm">{fmtPct(q.changePct)}</span>
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {q && (
          <div className="mt-1 grid grid-cols-4 gap-[2px]">
            <Stat label="今开" value={fmtPrice(q.open)} />
            <Stat label="最高" value={fmtPrice(q.high)} tone="hsl(var(--up))" />
            <Stat label="最低" value={fmtPrice(q.low)} tone="hsl(var(--down))" />
            <Stat label="昨收" value={fmtPrice(q.prevClose)} />
            <Stat label="成交额" value={fmtAmount(q.amount)} />
            <Stat label="换手率" value={q.turnoverPct ? `${q.turnoverPct.toFixed(2)}%` : '--'} />
            <Stat label="市盈率" value={q.pe ? q.pe.toFixed(1) : '--'} />
            <Stat
              label="更新"
              value={q.time.length >= 12 ? `${q.time.slice(8, 10)}:${q.time.slice(10, 12)}` : '--'}
            />
          </div>
        )}

        {/* K线 + 心情吉祥物 */}
        <div className="relative mt-4 rounded-xl border border-[#ffc2d4] bg-[#ffe9f0] p-3">
          <SectionTitle>近半年日 K 走势</SectionTitle>
          <div className="pointer-events-none absolute -top-2 right-2 z-10">
            <MoodMascot changePct={q?.changePct} />
          </div>
          <div className="mt-2">
            {chartLoading ? (
              <div className="flex h-[300px] items-center justify-center text-xs text-[#8d5568]">
                <span className="mr-2 h-3.5 w-3.5 animate-spin border-2 border-[#ff5d8f] border-t-transparent" />
                LOADING CHART…
              </div>
            ) : bars.length > 0 ? (
              <KlineChart bars={bars} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-xs text-[#8d5568]">
                走势图暂时没有加载出来，稍后再试试
              </div>
            )}
          </div>
        </div>

        {/* 信号小助手 */}
        {!chartLoading && bars.length > 0 && <SignalCard bars={bars} />}

        {/* 基本面体检卡 */}
        <FundamentalsCard code={item.code} />

        {/* 快速预警 */}
        <div className="mt-4 rounded-xl border border-[#ffc2d4] bg-[#ffe9f0] p-4">
          <SectionTitle>给 {item.name} 设一个小闹铃</SectionTitle>
          <p className="mt-1.5 text-xs text-[#8d5568]">{opt.hint}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-[#ffc2d4] bg-white p-[3px]">
              {ALERT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setAType(o.value)}
                  className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    aType === o.value ? 'bg-[#ff5d8f] text-white' : 'text-[#8d5568] hover:text-[#43242f]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                value={aValue}
                onChange={(e) => setAValue(e.target.value)}
                inputMode="decimal"
                placeholder={aType === 'above' || aType === 'below' ? '价格' : '幅度'}
                className="num w-24 rounded-lg border border-[#ffc2d4] bg-white px-3 py-1.5 text-sm text-[#43242f] outline-none placeholder:text-[#8d5568]/50 focus:border-[#ff5d8f]"
              />
              <span className="text-xs text-[#8d5568]">{opt.unit}</span>
            </div>
            <button
              onClick={submitAlert}
              disabled={!aValue || Number(aValue) <= 0}
              className="rounded-full border border-[#f5a623] px-4 py-1.5 text-xs font-bold text-[#f5a623] transition-colors hover:bg-[#f5a623] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#f5a623]"
            >
              {saved ? '✓ 已设好' : '设好闹铃'}
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            onRemove(item.code);
            onClose();
          }}
          className="mt-4 w-full rounded-xl border border-[#ffc2d4] py-2 text-xs font-semibold text-[#8d5568] transition-colors hover:border-[#ff5d73] hover:text-[#ff5d73]"
        >
          把 {item.name} 移出乐园
        </button>
      </DialogContent>
    </Dialog>
  );
}
