import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchQuotes, marketStatus } from '@/lib/stockApi';
import type { Quote } from '@/types/stock';

export interface QuotesState {
  quotes: Map<string, Quote>;
  /** code -> 相比上一次刷新是涨是跌，用于闪烁动画 */
  tickDir: Map<string, 'up' | 'down'>;
  loading: boolean;
  error: boolean;
  lastUpdate: number;
  /** 手动刷新（真的会发请求） */
  refresh: () => void;
}

export function useQuotes(codes: string[], intervalMs = 8000): QuotesState {
  const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
  const [tickDir, setTickDir] = useState<Map<string, 'up' | 'down'>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const prevRef = useRef<Map<string, number>>(new Map());
  /** 供外部手动触发的当前 load 函数 */
  const loadRef = useRef<() => void>(() => {});
  const codesKey = codes.join(',');

  useEffect(() => {
    // cancelled 同时守住 setState、定时器排程和在途请求，避免旧的轮询链继续跑
    let cancelled = false;
    let timer: number | undefined;
    let inflight: AbortController | null = null;

    const load = async () => {
      if (cancelled) return;
      const list = codesKey.split(',').filter(Boolean);
      if (list.length === 0) {
        setQuotes(new Map());
        setLoading(false);
        return;
      }
      inflight?.abort();
      const ctrl = new AbortController();
      inflight = ctrl;
      try {
        const map = await fetchQuotes(list, ctrl.signal);
        if (cancelled || ctrl.signal.aborted) return;
        const dirs = new Map<string, 'up' | 'down'>();
        map.forEach((q, code) => {
          const prev = prevRef.current.get(code);
          if (prev !== undefined && q.price !== prev) {
            dirs.set(code, q.price > prev ? 'up' : 'down');
          }
          prevRef.current.set(code, q.price);
        });
        setQuotes(map);
        setTickDir(dirs);
        setError(false);
        setLastUpdate(Date.now());
        setLoading(false);
      } catch {
        if (cancelled || ctrl.signal.aborted) return;
        setError(true);
        setLoading(false);
      } finally {
        if (inflight === ctrl) inflight = null;
      }
    };

    loadRef.current = () => {
      void load();
    };

    // 交易时段内按间隔轮询；非交易时段降到 60s 一次（拿收盘价）
    const schedule = () => {
      // 关键修复：清理之后不再排新定时器，否则每次 codes 变化都会多出一条永不停止的轮询链
      if (cancelled) return;
      window.clearTimeout(timer);
      const ms = marketStatus().open ? intervalMs : 60000;
      timer = window.setTimeout(() => {
        void load().finally(schedule);
      }, ms);
    };

    void load().finally(schedule);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) void load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      inflight?.abort();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [codesKey, intervalMs]);

  const refresh = useCallback(() => loadRef.current(), []);

  return { quotes, tickDir, loading, error, lastUpdate, refresh };
}
