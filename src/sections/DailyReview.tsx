import { useMemo } from 'react';
import { REVIEW, type LianbanStock, type StreakStock, type ZtStock } from '@/data/marketReview';

/**
 * 每日复盘 · 科技感深色终端风
 * 视觉与「像素萌宠乐园」其余页面刻意区分：复盘是严肃的数据视图，
 * 用深色底 + 青色数据线 + 等宽数字，不使用粉色系。
 * 涨跌配色仍遵循 A 股习惯：红涨绿跌。
 */

const C = {
  bg: '#0b1220',
  panel: '#101b30',
  panel2: '#0d1728',
  line: '#1e2e4c',
  lineSoft: '#182640',
  text: '#e3eaf7',
  muted: '#95a6c6',
  cyan: '#22d3ee',
  up: '#ff4d5e',
  down: '#16c784',
  gold: '#f2b134',
};

function Title({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="block h-3.5 w-[3px] rounded-full" style={{ background: C.cyan }} />
        <span className="text-[13px] font-semibold tracking-wide" style={{ color: C.text }}>
          {children}
        </span>
      </div>
      {extra}
    </div>
  );
}

function StatCard({ label, en, value, tone }: { label: string; en: string; value: string; tone: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border px-3 py-2.5"
      style={{ borderColor: C.line, background: C.panel }}
    >
      <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: tone, opacity: 0.75 }} />
      <div className="num text-[10px] uppercase tracking-[0.2em]" style={{ color: C.muted }}>
        {en}
      </div>
      <div className="num mt-1.5 text-xl font-bold leading-none" style={{ color: tone }}>
        {value}
      </div>
      <div className="mt-1.5 text-[11px]" style={{ color: C.muted }}>
        {label}
      </div>
    </div>
  );
}

/** MACD 柱状迷你可视化：以零轴为中心向两侧延伸 */
function MacdBar({ bar, scale }: { bar: number; scale: number }) {
  const pct = Math.min(50, (Math.abs(bar) / scale) * 50);
  const positive = bar >= 0;
  return (
    <div
      className="relative h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: C.panel2 }}
      aria-hidden
    >
      <span className="absolute inset-y-0 left-1/2 w-px" style={{ background: C.line }} />
      <span
        className="absolute inset-y-0 rounded-full transition-all"
        style={{
          background: positive ? C.up : C.down,
          left: positive ? '50%' : `${50 - pct}%`,
          width: `${pct}%`,
        }}
      />
    </div>
  );
}

function LianbanCard({ s, rank, scale }: { s: LianbanStock; rank: number; scale: number }) {
  const hot = s.lbc >= 3;
  const m = s.macd;
  const judgment =
    m.bar > 0
      ? m.shape.includes('出现')
        ? '动能刚刚转强'
        : m.shape.includes('放大')
          ? '上行动能还在增强'
          : '仍是多头区间，动能有所减弱'
      : m.shape.includes('出现')
        ? '刚刚转弱，注意风险'
        : m.shape.includes('放大')
          ? '下行动能在增强，注意风险'
          : '绿柱区间，下跌动能在减弱';

  return (
    <div
      className="relative overflow-hidden rounded-lg border p-3 transition-colors"
      style={{
        borderColor: hot ? 'rgba(242,177,52,0.55)' : C.line,
        background: C.panel,
      }}
    >
      {hot && (
        <span
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: C.gold }}
          aria-hidden
        />
      )}

      <div className="flex items-center gap-2.5">
        <span
          className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[12px] font-bold"
          style={{
            borderColor: hot ? 'rgba(242,177,52,0.5)' : C.line,
            color: hot ? C.gold : C.cyan,
            background: C.panel2,
          }}
        >
          {String(rank).padStart(2, '0')}
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold" style={{ color: C.text }}>
              {s.name}
            </span>
            <span
              className="num shrink-0 rounded px-1.5 py-px text-[10px] font-bold"
              style={
                hot
                  ? { background: C.gold, color: '#241a05' }
                  : { background: 'rgba(34,211,238,0.14)', color: C.cyan }
              }
            >
              {s.lbc} 连板
            </span>
          </div>
          <div className="num mt-0.5 text-[11px]" style={{ color: C.muted }}>
            {s.code.slice(0, 2).toUpperCase()}.{s.code.slice(2)} · {s.hy}
          </div>
        </div>

        <div className="num ml-auto shrink-0 text-right">
          <div className="text-sm font-bold" style={{ color: C.up }}>
            {s.price.toFixed(2)}
          </div>
          <div className="text-[11px] font-bold" style={{ color: C.up }}>
            +{s.pct.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="num mt-2.5 grid grid-cols-4 gap-2 text-[11px]" style={{ color: C.muted }}>
        <span>换手 {s.hs}%</span>
        <span>成交 {s.amount} 亿</span>
        <span>封单 {s.fund} 万</span>
        <span style={{ color: s.zbc > 0 ? C.gold : C.muted }}>
          {s.zbc > 0 ? `炸板 ${s.zbc} 次` : '未炸板'}
        </span>
      </div>

      <div
        className="mt-2.5 rounded-md border px-2.5 py-2"
        style={{ borderColor: C.lineSoft, background: C.panel2 }}
      >
        <div className="num flex items-center gap-2.5 text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>
          <span>DIF {m.dif}</span>
          <span>DEA {m.dea}</span>
          <span style={{ color: m.bar >= 0 ? C.up : C.down }}>BAR {m.bar}</span>
          {m.cross && (
            <span
              className="ml-auto shrink-0 rounded px-1.5 py-px text-[10px] font-bold"
              style={{ background: 'rgba(34,211,238,0.16)', color: C.cyan }}
            >
              {m.cross}
            </span>
          )}
        </div>
        <div className="mt-1.5">
          <MacdBar bar={m.bar} scale={scale} />
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: C.text }}>
          MACD 在{m.pos}，{m.shape}
          {m.cross ? `，${m.cross}` : ''} —— {judgment}
        </p>
      </div>
    </div>
  );
}

function ZtRow({ s }: { s: ZtStock }) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border px-2.5 py-1.5"
      style={{ borderColor: C.lineSoft, background: C.panel }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-xs font-semibold" style={{ color: C.text }}>
            {s.name}
          </span>
          {s.lbc > 1 && (
            <span
              className="num shrink-0 rounded px-1 text-[10px] font-bold"
              style={{ background: 'rgba(34,211,238,0.14)', color: C.cyan }}
            >
              {s.lbc}板
            </span>
          )}
        </div>
        <div className="num text-[10px]" style={{ color: C.muted }}>
          {s.hy}
        </div>
      </div>
      <span className="num shrink-0 text-[11px] font-bold" style={{ color: C.up }}>
        +{s.pct.toFixed(1)}%
      </span>
    </div>
  );
}

function StreakList({ list, dir }: { list: StreakStock[]; dir: 'up' | 'down' }) {
  const tone = dir === 'up' ? C.up : C.down;
  const max = Math.max(...list.map((s) => s.streak), 1);
  return (
    <div className="space-y-1">
      {list.map((s) => (
        <div key={s.code} className="flex items-center gap-2 rounded-md px-2 py-1.5" style={{ background: C.panel }}>
          <span
            className="num w-11 shrink-0 rounded px-1 py-px text-center text-[10px] font-bold"
            style={{ background: `${tone}22`, color: tone }}
          >
            {s.streak} {dir === 'up' ? '连阳' : '连阴'}
          </span>
          <span className="truncate text-xs font-semibold" style={{ color: C.text }}>
            {s.name}
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden h-1 w-14 overflow-hidden rounded-full sm:block" style={{ background: C.panel2 }}>
              <span
                className="block h-full rounded-full"
                style={{ width: `${(s.streak / max) * 100}%`, background: tone }}
              />
            </span>
            <span className="num w-16 text-right text-[11px] font-bold" style={{ color: tone }}>
              {s.pct > 0 ? '+' : ''}
              {s.pct.toFixed(2)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DailyReview() {
  const macdScale = useMemo(
    () => Math.max(...REVIEW.lianban.map((s) => Math.abs(s.macd.bar)), 0.1),
    [],
  );

  return (
    <div
      className="tech-surface overflow-hidden rounded-2xl border p-4 sm:p-5"
      style={{ borderColor: C.line, background: C.bg }}
    >
      {/* 终端标题条 */}
      <div
        className="-mx-4 -mt-4 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3 sm:-mx-5 sm:-mt-5 sm:px-5"
        style={{ borderColor: C.line, background: C.panel2 }}
      >
        <div className="flex items-center gap-2.5">
          <span className="tech-dot h-2 w-2 rounded-full" style={{ background: C.cyan }} />
          <div>
            <div className="text-sm font-semibold tracking-wide" style={{ color: C.text }}>
              每日复盘终端
            </div>
            <div className="num text-[10px] uppercase tracking-[0.28em]" style={{ color: C.muted }}>
              Market Review
            </div>
          </div>
        </div>
        <div className="num ml-auto flex items-center gap-2 text-[11px]">
          <span
            className="rounded border px-2 py-1"
            style={{ borderColor: C.line, color: C.cyan, background: C.panel }}
          >
            {REVIEW.date} 收盘快照
          </span>
        </div>
      </div>

      {/* 顶部统计 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="复盘日期" en="Date" value={REVIEW.date.slice(5)} tone={C.cyan} />
        <StatCard label="今日涨停" en="Limit Up" value={`${REVIEW.ztTotal}`} tone={C.up} />
        <StatCard label="连板股票" en="Streak" value={`${REVIEW.lbTotal}`} tone={C.gold} />
        <StatCard label="最高连板" en="Max Board" value={`${REVIEW.maxLbc} 板`} tone={C.text} />
      </div>

      {/* 连板看台 */}
      <div className="mt-4 rounded-xl border p-3.5" style={{ borderColor: C.line, background: C.panel2 }}>
        <Title
          extra={
            <span
              className="num rounded px-2 py-0.5 text-[10px] font-bold"
              style={{ background: 'rgba(242,177,52,0.15)', color: C.gold }}
            >
              金色 = 三连板及以上
            </span>
          }
        >
          连板看台 · MACD 体检
        </Title>
        {REVIEW.lianban.length === 0 ? (
          <p className="mt-3 text-xs" style={{ color: C.muted }}>
            今天没有连板股票，市场比较冷静。
          </p>
        ) : (
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {REVIEW.lianban.map((s, i) => (
              <LianbanCard key={s.code} s={s} rank={i + 1} scale={macdScale} />
            ))}
          </div>
        )}
      </div>

      {/* 涨停全名单 */}
      <div className="mt-3 rounded-xl border p-3.5" style={{ borderColor: C.line, background: C.panel2 }}>
        <Title
          extra={
            <span className="num text-[11px]" style={{ color: C.muted }}>
              共 {REVIEW.zt.length} 只
            </span>
          }
        >
          今日涨停全名单
        </Title>
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
          {REVIEW.zt.map((s) => (
            <ZtRow key={s.code} s={s} />
          ))}
        </div>
      </div>

      {/* 连涨 / 连跌 */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border p-3.5" style={{ borderColor: C.line, background: C.panel2 }}>
          <Title>连涨 3 日以上</Title>
          <div className="mt-3">
            <StreakList list={REVIEW.up3} dir="up" />
          </div>
        </div>
        <div className="rounded-xl border p-3.5" style={{ borderColor: C.line, background: C.panel2 }}>
          <Title>连跌 3 日以上</Title>
          <div className="mt-3">
            <StreakList list={REVIEW.down3} dir="down" />
          </div>
        </div>
      </div>

      <p className="mt-4 border-t pt-3 text-[11px] leading-relaxed" style={{ borderColor: C.line, color: C.muted }}>
        涨停/连板数据来自东方财富涨停池；连板股的日线历史来自同花顺 iFinD，MACD(12,26,9) 由日线收盘价计算；
        连涨/连跌覆盖当日涨幅前 600 与跌幅前 400 的股票并逐只核验日线。数据为 {REVIEW.date} 收盘快照，
        仅供学习参考，不构成投资建议。
      </p>
    </div>
  );
}
