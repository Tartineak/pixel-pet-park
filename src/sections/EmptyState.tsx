import Sprite from '@/components/Sprite';
import { PET_PALETTE, PET_SPRITES } from '@/data/sprites';
import type { WatchItem } from '@/types/stock';

const POPULAR: WatchItem[] = [
  { code: 'sh600519', name: '贵州茅台' },
  { code: 'sz300750', name: '宁德时代' },
  { code: 'sz002594', name: '比亚迪' },
  { code: 'sh600036', name: '招商银行' },
  { code: 'sz000858', name: '五粮液' },
  { code: 'sz300059', name: '东方财富' },
];

export default function EmptyState({ onAdd }: { onAdd: (item: WatchItem) => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-[#ffc2d4] bg-white/70 px-6 py-12 text-center">
      <div className="flex items-end gap-6">
        <div className="sprite-sleep opacity-80">
          <Sprite rows={PET_SPRITES.cat.sleep} palette={PET_PALETTE} px={4.4} />
        </div>
        <div className="sprite-idle">
          <Sprite rows={PET_SPRITES.dog.super} palette={PET_PALETTE} px={5.2} />
        </div>
        <div className="sprite-idle opacity-80" style={{ animationDelay: '0.4s' }}>
          <Sprite rows={PET_SPRITES.cat.happy} palette={PET_PALETTE} px={4.4} />
        </div>
      </div>
      <p className="font-pixel mt-6 text-[10px] tracking-wider text-[#ff5d8f]">PARK IS EMPTY</p>
      <p className="mt-3 text-sm font-semibold text-[#43242f]">乐园里还没有小可爱</p>
      <p className="mt-1 text-xs leading-relaxed text-[#8d5568]">
        搜索并把关注的股票领养进来——涨了它会开心到起飞，跌了会哇哇大哭。也可以先领养几只热门的：
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {POPULAR.map((s) => (
          <button
            key={s.code}
            onClick={() => onAdd(s)}
            className="rounded-full border border-[#ffc2d4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#8d5568] transition-colors hover:border-[#ff5d8f] hover:text-[#ff5d8f]"
          >
            + {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
