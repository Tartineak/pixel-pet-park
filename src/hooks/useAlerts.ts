import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { AlertRule, Quote } from '@/types/stock';

function hit(rule: AlertRule, q: Quote): string | null {
  // 停牌 / 尚未开盘时 price 可能为 0，不应触发任何价格类预警
  if (!Number.isFinite(q.price) || q.price <= 0) return null;
  switch (rule.type) {
    case 'above':
      return q.price >= rule.value ? `最新价 ${q.price.toFixed(2)} 已涨到 ${rule.value} 上方` : null;
    case 'below':
      return q.price <= rule.value ? `最新价 ${q.price.toFixed(2)} 已跌到 ${rule.value} 下方` : null;
    case 'pctUp':
      return q.changePct >= rule.value ? `今日涨幅已达 +${q.changePct.toFixed(2)}%` : null;
    case 'pctDown':
      return q.changePct <= -rule.value ? `今日跌幅已达 ${q.changePct.toFixed(2)}%` : null;
  }
}

/** 浏览器通知权限：只在用户主动设闹铃时询问一次 */
export async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export function useAlerts(quotes: Map<string, Quote>) {
  const [rules, setRules] = useLocalStorage<AlertRule[]>('garden.alerts', []);
  const firedRef = useRef<Set<string>>(new Set());

  const addRule = useCallback(
    (rule: Omit<AlertRule, 'id' | 'status' | 'createdAt'>) => {
      // 修复：以前只判断 permission === 'granted'，从没申请过权限，桌面通知永远不会弹
      void ensureNotifyPermission();
      setRules((prev) => [
        {
          ...rule,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          status: 'active',
          createdAt: Date.now(),
        },
        ...prev,
      ]);
    },
    [setRules],
  );

  const removeRule = useCallback(
    (id: string) => {
      firedRef.current.delete(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    },
    [setRules],
  );

  /** 自选股被移出乐园时，连带清掉它的闹铃，避免留下孤儿规则 */
  const removeRulesByCode = useCallback(
    (code: string) => {
      setRules((prev) => {
        prev.forEach((r) => {
          if (r.code === code) firedRef.current.delete(r.id);
        });
        return prev.filter((r) => r.code !== code);
      });
    },
    [setRules],
  );

  const rearm = useCallback(
    (id: string) => {
      firedRef.current.delete(id);
      setRules((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: 'active', triggeredAt: undefined, triggerNote: undefined } : r,
        ),
      );
    },
    [setRules],
  );

  useEffect(() => {
    if (rules.length === 0 || quotes.size === 0) return;
    const triggered: Array<{ rule: AlertRule; note: string }> = [];
    for (const rule of rules) {
      if (rule.status !== 'active' || firedRef.current.has(rule.id)) continue;
      const q = quotes.get(rule.code);
      if (!q) continue;
      const note = hit(rule, q);
      if (note) triggered.push({ rule, note });
    }
    if (triggered.length === 0) return;

    triggered.forEach(({ rule }) => firedRef.current.add(rule.id));
    setRules((prev) =>
      prev.map((r) => {
        const t = triggered.find((x) => x.rule.id === r.id);
        return t
          ? { ...r, status: 'triggered' as const, triggeredAt: Date.now(), triggerNote: t.note }
          : r;
      }),
    );

    triggered.forEach(({ rule, note }) => {
      const isGood = rule.type === 'above' || rule.type === 'pctUp';
      toast(`${isGood ? '🌷' : '🌧️'} ${rule.name} 预警触发`, {
        description: note,
        duration: 10000,
      });
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(`${rule.name} 预警触发`, { body: note, tag: rule.id });
        } catch {
          /* ignore */
        }
      }
    });
  }, [quotes, rules, setRules]);

  return { rules, addRule, removeRule, removeRulesByCode, rearm };
}
