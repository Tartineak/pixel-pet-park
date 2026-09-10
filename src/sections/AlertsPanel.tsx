import { useState } from 'react';
import { ALERT_TYPE_LABEL, type AlertRule } from '@/types/stock';

export default function AlertsPanel({
  rules,
  onRemove,
  onRearm,
}: {
  rules: AlertRule[];
  onRemove: (id: string) => void;
  onRearm: (id: string) => void;
}) {
  const [perm, setPerm] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  const askPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const p = await Notification.requestPermission();
    setPerm(p);
  };

  return (
    <div className="space-y-3">
      {perm !== 'granted' && perm !== 'unsupported' && (
        <div className="flex items-center justify-between gap-3 rounded-xl border-l-[3px] border-[#f5a623] bg-white px-4 py-3">
          <p className="text-xs leading-relaxed text-[#8d5568]">
            打开浏览器通知，预警触发时即使切到别的页面也能第一时间看到。
          </p>
          <button
            onClick={askPermission}
            className="shrink-0 rounded-full border border-[#f5a623] px-3.5 py-1.5 text-xs font-bold text-[#f5a623] transition-colors hover:bg-[#f5a623] hover:text-white"
          >
            开启通知
          </button>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#ffc2d4] bg-white/70 px-6 py-10 text-center">
          <p className="font-pixel text-[10px] text-[#ff5d8f]">NO ALARMS YET</p>
          <p className="mt-3 text-sm font-semibold text-[#43242f]">还没有小闹铃</p>
          <p className="mt-1 text-xs text-[#8d5568]">点开乐园里任意一只小可爱，就能给它设涨跌提醒。</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => {
            const triggered = r.status === 'triggered';
            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 rounded-xl border-l-[3px] bg-white px-4 py-3 ${
                  triggered ? 'border-[#f5a623] alert-glow' : 'border-[#ff5d8f]'
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${triggered ? 'led-pulse bg-[#f5a623] text-[#f5a623]' : 'bg-[#ff5d8f]'}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#43242f]">{r.name}</div>
                  <div className="num mt-0.5 text-xs text-[#8d5568]">
                    {ALERT_TYPE_LABEL[r.type]} {r.value}
                    {r.type === 'above' || r.type === 'below' ? ' 元' : ' %'}
                  </div>
                  {triggered && r.triggerNote && (
                    <div className="mt-0.5 text-[11px] font-semibold text-[#f5a623]">{r.triggerNote}</div>
                  )}
                </div>
                {triggered ? (
                  <button
                    onClick={() => onRearm(r.id)}
                    className="shrink-0 rounded-full border border-[#f5a623] px-3 py-1.5 text-[11px] font-bold text-[#f5a623] transition-colors hover:bg-[#f5a623] hover:text-white"
                  >
                    再响一次
                  </button>
                ) : (
                  <span className="shrink-0 rounded-full border border-[#ffc2d4] px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#ff5d8f]">
                    监控中
                  </span>
                )}
                <button
                  title="删除"
                  onClick={() => onRemove(r.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center text-[#8d5568] transition-colors hover:text-[#ff5d73]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
