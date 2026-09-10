import {
  FUNDAMENTALS,
  FUND_AS_OF,
  FUND_REPORT_PERIOD,
  growthComment,
  healthScore,
  roeComment,
} from '@/data/fundamentals';

function Item({ label, value, comment }: { label: string; value: string; comment: string }) {
  return (
    <div className="rounded-xl border border-[#ffc2d4] bg-white px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.15em] text-[#8d5568]">{label}</div>
      <div className="num mt-1 text-sm font-bold text-[#43242f]">{value}</div>
      <div className="mt-1 text-[11px] leading-snug text-[#8d5568]">{comment}</div>
    </div>
  );
}

export default function FundamentalsCard({ code }: { code: string }) {
  const f = FUNDAMENTALS[code];
  if (!f) return null;
  const { score, label } = healthScore(f);

  return (
    <div className="mt-4 rounded-xl border border-[#ffc2d4] bg-[#ffe9f0] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#ff5d8f]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff5d8f]" />
          基本面体检卡
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-[3px]">
            {Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className="h-2.5 w-[6px] rounded-[3px] border border-[#ffc2d4]"
                style={{
                  background: i < score ? 'hsl(var(--gold))' : '#ffffff',
                  boxShadow: i < score ? '0 0 4px hsl(var(--gold) / 0.6)' : 'none',
                }}
              />
            ))}
          </div>
          <span className="rounded-full border border-[#f5a623] px-2 py-0.5 text-[9px] font-bold text-[#f5a623]">
            {label}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Item label="ROE 净资产收益率" value={`${f.roe.toFixed(1)}%`} comment={roeComment(f.roe)} />
        <Item label="基本每股收益" value={`${f.eps.toFixed(2)} 元`} comment="半年里每一股股票对应赚到的利润" />
        <Item label="营收同比" value={`${f.revYoy > 0 ? '+' : ''}${f.revYoy.toFixed(1)}%`} comment={growthComment(f.revYoy)} />
        <Item label="净利润同比" value={`${f.profitYoy > 0 ? '+' : ''}${f.profitYoy.toFixed(1)}%`} comment={growthComment(f.profitYoy)} />
        {f.grossMargin !== null && (
          <Item label="毛利率" value={`${f.grossMargin.toFixed(1)}%`} comment="卖出去的钱里，扣掉直接成本还剩多少" />
        )}
        {f.netMargin !== null && (
          <Item label="净利率" value={`${f.netMargin.toFixed(1)}%`} comment="扣除所有成本费用后，真正落袋的比例" />
        )}
      </div>

      <p className="mt-3 border-t border-[#ffc2d4] pt-2 text-xs leading-relaxed text-[#8d5568]">
        数据来自同花顺 iFinD（{FUND_REPORT_PERIOD}），快照更新于 {FUND_AS_OF}，想刷新可以来找我更新。
        评分只是几个常见维度的速览，不构成投资建议。
      </p>
    </div>
  );
}
