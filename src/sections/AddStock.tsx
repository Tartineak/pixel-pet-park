import { useEffect, useRef, useState } from 'react';
import { searchStocks } from '@/lib/stockApi';
import type { SearchResult, WatchItem } from '@/types/stock';

/** 6 位代码直接推断交易所：6/9 开头沪市，0/2/3 开头深市 */
function guessByCode(digits: string): SearchResult | null {
  if (!/^\d{6}$/.test(digits)) return null;
  if (/^[69]/.test(digits)) return { code: `sh${digits}`, name: `沪市 ${digits}` };
  if (/^[023]/.test(digits)) return { code: `sz${digits}`, name: `深市 ${digits}` };
  return null;
}

export default function AddStock({
  existing,
  onAdd,
}: {
  existing: string[];
  onAdd: (item: WatchItem) => void;
}) {
  const [kw, setKw] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const kwTrim = kw.trim();
    if (!kwTrim) {
      setResults([]);
      setOpen(false);
      return;
    }
    const guessed = guessByCode(kwTrim);
    if (guessed) {
      setResults([guessed]);
      setOpen(true);
    }
    const seq = ++seqRef.current;
    setSearching(true);
    let alive = true;
    const t = window.setTimeout(async () => {
      const list = await searchStocks(kwTrim);
      // seq 防串场，alive 防卸载后 setState
      if (!alive || seq !== seqRef.current) return;
      setResults(list.length > 0 ? list : guessed ? [guessed] : []);
      setOpen(true);
      setSearching(false);
    }, 280);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [kw]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 rounded-full border-2 border-[#ffc2d4] bg-white px-4 py-2.5 shadow-[3px_3px_0_#ffc2d4] transition-colors focus-within:border-[#ff5d8f]">
        <span className="font-pixel text-[9px] text-[#ff5d8f]">+</span>
        <input
          id="add-stock-input"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && open && results.length > 0) {
              const first = results.find((r) => !existing.includes(r.code));
              if (first) {
                onAdd({ code: first.code, name: first.name });
                setKw('');
                setOpen(false);
              }
            }
          }}
          placeholder="领养新朋友：输入股票名字或代码，比如 茅台 / 600519"
          className="w-full bg-transparent text-sm text-[#43242f] outline-none placeholder:text-[#8d5568]/50"
        />
        {searching && (
          <span className="h-3.5 w-3.5 shrink-0 animate-spin border-2 border-[#ff5d8f] border-t-transparent" />
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-[#ff5d8f]/40 bg-white shadow-[0_8px_32px_rgba(255,93,143,0.25)]">
          {results.length === 0 ? (
            <div className="px-4 py-3.5 text-xs text-[#8d5568]">没找到这只股票，换个关键词试试？</div>
          ) : (
            results.map((r) => {
              const added = existing.includes(r.code);
              return (
                <button
                  key={r.code}
                  disabled={added}
                  onClick={() => {
                    onAdd({ code: r.code, name: r.name });
                    setKw('');
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between border-b border-[#ffc2d4] px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-[#fff0f6] disabled:opacity-45"
                >
                  <span className="text-sm font-semibold text-[#43242f]">{r.name}</span>
                  <span className="num text-xs text-[#8d5568]">
                    {r.code.slice(0, 2).toUpperCase()}.{r.code.slice(2)}
                    {added && <span className="ml-2 text-[#ff5d8f]">已领养</span>}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
