import { useEffect, useMemo, useState } from 'react';
import { SITE } from '@/config/site';
import { Toaster } from '@/components/ui/sonner';
import { useAlerts } from '@/hooks/useAlerts';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useQuotes } from '@/hooks/useQuotes';
import type { WatchItem } from '@/types/stock';
import AddStock from '@/sections/AddStock';
import AlertsPanel from '@/sections/AlertsPanel';
import DailyReview from '@/sections/DailyReview';
import EmptyState from '@/sections/EmptyState';
import GardenGrid from '@/sections/GardenGrid';
import Header, { INDEX_CODES } from '@/sections/Header';
import StockDetail from '@/sections/StockDetail';

type Tab = 'garden' | 'review' | 'alerts';

export default function Home() {
  const [tab, setTab] = useState<Tab>('garden');
  const [watchlist, setWatchlist] = useLocalStorage<WatchItem[]>('garden.watchlist', []);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const codes = useMemo(() => [...INDEX_CODES, ...watchlist.map((w) => w.code)], [watchlist]);
  const { quotes, tickDir, error, lastUpdate, refresh } = useQuotes(codes);
  const { rules, addRule, removeRule, removeRulesByCode, rearm } = useAlerts(quotes);

  /**
   * 名称回填：按 6 位代码添加时只能猜出「沪市 600519」这种占位名，
   * 行情返回真实名称后同步过来（个股改名、变 ST 时也会自动更新）。
   */
  useEffect(() => {
    if (quotes.size === 0) return;
    setWatchlist((prev) => {
      let changed = false;
      const next = prev.map((w) => {
        const real = quotes.get(w.code)?.name?.trim();
        if (real && real !== w.name) {
          changed = true;
          return { ...w, name: real };
        }
        return w;
      });
      return changed ? next : prev;
    });
  }, [quotes, setWatchlist]);

  const activeAlertCodes = useMemo(
    () => new Set(rules.filter((r) => r.status === 'active').map((r) => r.code)),
    [rules],
  );
  const triggeredCount = rules.filter((r) => r.status === 'triggered').length;
  const watchCodes = useMemo(() => watchlist.map((w) => w.code), [watchlist]);
  const selected = useMemo(
    () => watchlist.find((w) => w.code === selectedCode) ?? null,
    [watchlist, selectedCode],
  );

  /** 交易时段判断的兜底依据：任意一条快照的时间戳 */
  const latestQuoteTime = useMemo(() => {
    for (const q of quotes.values()) if (q.time) return q.time;
    return undefined;
  }, [quotes]);

  const addStock = (item: WatchItem) => {
    setWatchlist((prev) => (prev.some((p) => p.code === item.code) ? prev : [...prev, item]));
  };
  const removeStock = (code: string) => {
    setWatchlist((prev) => prev.filter((p) => p.code !== code));
    removeRulesByCode(code); // 连带清掉这只股票的闹铃
  };

  return (
    <div className="dotgrid min-h-screen bg-[#ffd1dc] pb-10 text-[#43242f]">
      <Toaster position="top-center" />
      <Header
        quotes={quotes}
        watchCodes={watchCodes}
        latestQuoteTime={latestQuoteTime}
        lastUpdate={lastUpdate}
        onRefresh={refresh}
      />

      <main className="mx-auto mt-4 max-w-7xl px-4">
        {/* 圆角标签页 */}
        <div className="flex items-center gap-2">
          {(
            [
              { key: 'garden', label: '我的乐园' },
              { key: 'review', label: '每日复盘' },
              { key: 'alerts', label: `小闹铃${triggeredCount > 0 ? ` (${triggeredCount})` : ''}` },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? 'page' : undefined}
              className={`rounded-full border-2 px-4 py-1.5 text-xs font-bold tracking-[0.15em] transition-colors ${
                tab === t.key
                  ? 'border-[#ff5d8f] bg-[#ff5d8f] text-white shadow-[2px_2px_0_#d9436f]'
                  : 'border-[#ffc2d4] bg-white text-[#8d5568] hover:border-[#ff5d8f] hover:text-[#ff5d8f]'
              }`}
            >
              {t.label}
            </button>
          ))}
          <span className="num ml-auto hidden text-[11px] text-[#8d5568] sm:block">
            {watchlist.length > 0 ? `${watchlist.length} 只小可爱 · 交易中每 8 秒刷新` : ''}
          </span>
        </div>

        <div className="mt-3">
          {tab === 'garden' && (
            <div className="space-y-3">
              <AddStock existing={watchCodes} onAdd={addStock} />
              {error && (
                <div className="rounded-xl border-l-[3px] border-[#f5a623] bg-white px-4 py-3 text-xs text-[#8d5568]">
                  行情刷新失败了一次，会自动重试；如果一直失败，可能是当前网络访问行情接口受限。
                </div>
              )}
              {watchlist.length === 0 ? (
                <EmptyState onAdd={addStock} />
              ) : (
                <GardenGrid
                  items={watchlist}
                  quotes={quotes}
                  tickDir={tickDir}
                  hasAlert={(c) => activeAlertCodes.has(c)}
                  onOpen={(item) => setSelectedCode(item.code)}
                />
              )}
            </div>
          )}

          {tab === 'review' && <DailyReview />}

          {tab === 'alerts' && <AlertsPanel rules={rules} onRemove={removeRule} onRearm={rearm} />}
        </div>

        <footer className="mt-8 border-t border-[#ffc2d4] pt-4 text-[11px] leading-relaxed text-[#8d5568]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              href={SITE.url}
              className="num font-bold tracking-wide text-[#ff5d8f] hover:underline"
            >
              {SITE.domain}
            </a>
            <span className="font-pixel text-[7px] tracking-wider">{SITE.nameEn}</span>
          </div>
          <p className="mt-2">
            行情数据来自腾讯公开接口，可能存在延迟；本工具仅供学习参考，不构成任何投资建议。
            自选股和预警只保存在当前浏览器里，换设备或清除浏览器数据会丢失。
          </p>
        </footer>
      </main>

      <StockDetail
        item={selected}
        quote={selected ? quotes.get(selected.code) : undefined}
        open={selected !== null}
        onClose={() => setSelectedCode(null)}
        onRemove={removeStock}
        onAddAlert={addRule}
      />
    </div>
  );
}
