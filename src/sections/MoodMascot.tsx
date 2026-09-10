import Sprite from '@/components/Sprite';
import { PET_PALETTE, PET_SPRITES } from '@/data/sprites';

/**
 * 心情吉祥物（像素萌宠版）：K线图上的实时动态元素
 * 上涨 → 开心到起飞的猫；下跌 → 哇哇大哭的狗；平盘 → 打盹的猫
 */

type Mood = 'up' | 'down' | 'flat';

const MOOD_TEXT: Record<Mood, string> = {
  up: '好耶！',
  down: '呜呜…',
  flat: 'Zzz…',
};

export default function MoodMascot({ changePct }: { changePct: number | undefined }) {
  const mood: Mood =
    changePct === undefined || changePct === 0 ? 'flat' : changePct > 0 ? 'up' : 'down';

  const tone =
    mood === 'up' ? 'hsl(var(--up))' : mood === 'down' ? 'hsl(var(--down))' : '#8d5568';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="mascot-enter" key={mood}>
        {mood === 'up' && (
          <div className="sprite-idle">
            <Sprite rows={PET_SPRITES.cat.super} palette={PET_PALETTE} px={3} />
          </div>
        )}
        {mood === 'down' && (
          <div className="sprite-wilt">
            <Sprite rows={PET_SPRITES.dog.cry} palette={PET_PALETTE} px={3} />
          </div>
        )}
        {mood === 'flat' && (
          <div className="sprite-sleep">
            <Sprite rows={PET_SPRITES.cat.sleep} palette={PET_PALETTE} px={3} />
          </div>
        )}
      </div>
      <div
        className="rounded-lg border px-1.5 py-1 font-pixel text-[7px]"
        style={{ color: tone, borderColor: tone, background: '#ffffff' }}
      >
        {MOOD_TEXT[mood]}
      </div>
    </div>
  );
}
