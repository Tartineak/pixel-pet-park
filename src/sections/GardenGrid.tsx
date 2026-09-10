import Sprite from '@/components/Sprite';
import { MOOD_LABEL, PAW_ROWS, PET_PALETTE, PET_SPRITES, SPECIES_LABEL, petMoodOf, speciesOf } from '@/data/sprites';
import { fmtPct, fmtPrice } from '@/lib/stockApi';
import type { Quote, WatchItem } from '@/types/stock';

function Sparkles() {
  return (
    <>
      <span className="sparkle absolute left-1 top-2 h-1 w-1 rounded-[1px] bg-[#f5a623]" />
      <span className="sparkle-delay absolute right-1.5 top-4 h-1 w-1 rounded-[1px] bg-[#ff4d6d]" />
    </>
  );
}

function Plot({
  item,
  quote,
  dir,
  hasAlert,
  onOpen,
  index,
}: {
  item: WatchItem;
  quote: Quote | undefined;
  dir: 'up' | 'down' | undefined;
  hasAlert: boolean;
  onOpen: () => void;
  index: number;
}) {
  const mood = petMoodOf(quote?.changePct);
  const species = speciesOf(item.code);
  const rows = PET_SPRITES[species][mood];
  const up = (quote?.changePct ?? 0) > 0;
  const flat = quote?.changePct === 0;
  const tone = flat ? '#8d5568' : up ? 'hsl(var(--up))' : 'hsl(var(--down))';
  const anim =
    mood === 'sad' || mood === 'cry'
      ? 'sprite-wilt'
      : mood === 'sleep'
        ? 'sprite-sleep'
        : 'sprite-idle';

  // 当日价格区间位置
  const span = quote ? quote.high - quote.low : 0;
  const pos = quote && span > 0 ? ((quote.price - quote.low) / span) * 100 : 50;

  return (
    <button
      onClick={onOpen}
      aria-label={`${item.name} ${item.code}，${quote ? `最新价 ${fmtPrice(quote.price)}，涨跌 ${fmtPct(quote.changePct)}` : '行情加载中'}，点击查看详情`}
      className="plot-in group relative flex flex-col rounded-2xl border-2 border-[#ffc2d4] bg-white p-3 text-left shadow-[3px_3px_0_#ffc2d4] transition-all hover:-translate-y-0.5 hover:border-[#ff5d8f] hover:shadow-[4px_4px_0_#ff9ebb]"
      style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
    >
      {/* 头部：名字 + 状态灯 + 物种徽章 */}
      <div className="flex items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: tone, boxShadow: `0 0 5px ${tone}` }}
        />
        <span className="truncate text-[13px] font-bold text-[#43242f]">{item.name}</span>
        <span className="shrink-0 rounded-full bg-[#ffe9f0] px-1.5 py-px text-[9px] font-bold text-[#ff5d8f]">
          {SPECIES_LABEL[species]}
        </span>
        {hasAlert && (
          <span className="led-pulse h-1.5 w-1.5 shrink-0 rounded-full bg-[#f5a623] text-[#f5a623]" title="设有预警" />
        )}
        <span className="num ml-auto text-[10px] uppercase tracking-wider text-[#8d5568]">
          {item.code.slice(0, 2)}.{item.code.slice(2)}
        </span>
      </div>

      {/* 萌宠小窝 */}
      <div className="relative mx-auto mt-1 flex h-[84px] w-full items-end justify-center rounded-xl bg-[#fff0f6] pb-1.5 pt-1">
        {mood === 'super' && <Sparkles />}
        <div className={anim}>
          <Sprite rows={rows} palette={PET_PALETTE} px={4.2} />
        </div>
        {/* 软垫 */}
        <div className="absolute bottom-1 h-1.5 w-3/5 rounded-full bg-[#ffd6e3]" />
      </div>

      <div className="mt-1.5 flex justify-center">
        <span
          className="rounded-full px-2 py-px text-[10px] font-bold tracking-[0.15em]"
          style={{ color: tone, background: `color-mix(in srgb, ${tone} 12%, white)` }}
        >
          {MOOD_LABEL[mood]}
        </span>
      </div>

      {/* 数据区 */}
      <div
        key={`${item.code}-${quote?.price}-${quote?.time}`}
        className={`mt-1.5 flex items-end justify-between border-t border-dashed border-[#ffc2d4] px-1 pt-2 ${
          dir === 'up' ? 'flash-up' : dir === 'down' ? 'flash-down' : ''
        }`}
      >
        <span className="num text-lg font-bold leading-none" style={{ color: tone }}>
          {quote ? fmtPrice(quote.price) : '···'}
        </span>
        <span
          className="num rounded-lg border px-1.5 py-0.5 text-[11px] font-bold"
          style={{ color: tone, borderColor: tone }}
        >
          {quote ? fmtPct(quote.changePct) : '--'}
        </span>
      </div>

      {/* 当日区间 */}
      {quote && quote.high > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#8d5568]">
          <span className="num">{fmtPrice(quote.low)}</span>
          <div className="relative h-1.5 flex-1 rounded-full bg-[#ffe9f0]">
            <div
              className="absolute top-1/2 h-2.5 w-1.5 -translate-y-1/2 rounded-full transition-all duration-500"
              style={{ left: `calc(${pos}% - 3px)`, background: tone, boxShadow: `0 0 4px ${tone}` }}
            />
          </div>
          <span className="num">{fmtPrice(quote.high)}</span>
        </div>
      )}
    </button>
  );
}

export default function GardenGrid({
  items,
  quotes,
  tickDir,
  hasAlert,
  onOpen,
}: {
  items: WatchItem[];
  quotes: Map<string, Quote>;
  tickDir: Map<string, 'up' | 'down'>;
  hasAlert: (code: string) => boolean;
  onOpen: (item: WatchItem) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, i) => (
        <Plot
          key={item.code}
          item={item}
          quote={quotes.get(item.code)}
          dir={tickDir.get(item.code)}
          hasAlert={hasAlert(item.code)}
          onOpen={() => onOpen(item)}
          index={i}
        />
      ))}
      {/* 空窝：领养新朋友 */}
      <button
        onClick={() => {
          const el = document.getElementById('add-stock-input');
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el?.focus();
        }}
        className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#ffc2d4] text-[#8d5568]/70 transition-colors hover:border-[#ff5d8f] hover:bg-white/60 hover:text-[#ff5d8f]"
      >
        <Sprite rows={PAW_ROWS} palette={PET_PALETTE} px={3} />
        <span className="text-[11px] font-bold tracking-[0.25em]">领养新朋友</span>
      </button>
    </div>
  );
}
