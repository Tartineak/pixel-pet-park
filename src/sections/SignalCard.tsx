import { useMemo } from 'react';
import { analyze, type Direction } from '@/lib/indicators';
import type { KlineBar } from '@/types/stock';

const DIR_STYLE: Record<Direction, { color: string; label: string }> = {
  bullish: { color: 'hsl(var(--up))', label: '偏多' },
  bearish: { color: 'hsl(var(--down))', label: '偏空' },
  neutral: { color: '#8d5568', label: '中性' },
};

export default function SignalCard({ bars }: { bars: KlineBar[] }) {
  const report = useMemo(() => analyze(bars), [bars]);

  if (!report) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-[#ffc2d4] bg-[#ffe9f0] p-4 text-xs text-[#8d5568]">
        历史数据还太少，信号小助手暂时算不出来，多攒几天 K 线再来看看。
      </div>
    );
  }

  const total = report.signals.length;
  const bullPct = (report.bullish / total) * 100;
  const bearPct = (report.bearish / total) * 100;
  const verdictTone =
    report.verdict === 'bullish'
      ? 'hsl(var(--up))'
      : report.verdict === 'bearish'
        ? 'hsl(var(--down))'
        : '#8d5568';

  return (
    <div className="mt-4 rounded-xl border border-[#ffc2d4] bg-[#ffe9f0] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#ff5d8f]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff5d8f]" />
          信号小助手
        </div>
        <div className="text-[11px] font-bold" style={{ color: verdictTone }}>
          {report.verdictText}
        </div>
      </div>

      {/* 多空能量条 */}
      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full border border-[#ffc2d4] bg-white">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${bullPct}%`, background: 'hsl(var(--up))', boxShadow: '0 0 8px hsl(var(--up) / 0.5)' }}
        />
        <div className="h-full flex-1" />
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${bearPct}%`, background: 'hsl(var(--down))', boxShadow: '0 0 8px hsl(var(--down) / 0.5)' }}
        />
      </div>
      <div className="num mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-[#8d5568]">
        <span>偏多 {report.bullish}</span>
        {report.neutral > 0 && <span>中性 {report.neutral}</span>}
        <span>偏空 {report.bearish}</span>
      </div>

      <div className="mt-3 space-y-1.5">
        {report.signals.map((s) => {
          const st = DIR_STYLE[s.direction];
          return (
            <div
              key={s.key}
              className="flex items-start gap-2.5 rounded-lg border-l-[3px] bg-white px-3 py-2 transition-colors hover:bg-[#fff0f6]"
              style={{ borderColor: st.color }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#43242f]">{s.name}</span>
                  <span
                    className="rounded-md border px-1 py-px text-[9px] font-bold"
                    style={{ color: st.color, borderColor: st.color }}
                  >
                    {st.label}
                  </span>
                  <span className="num ml-auto text-[10px] text-[#8d5568]">{s.valueText}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#8d5568]">{s.plain}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 border-t border-[#ffc2d4] pt-2 text-xs leading-relaxed text-[#8d5568]">
        信号由 MA / MACD / RSI / 布林带 / KDJ 自动计算，只是历史数据的统计学描述，不代表未来走势。
      </p>
    </div>
  );
}
