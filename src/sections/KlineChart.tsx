import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
} from 'lightweight-charts';
import type { KlineBar } from '@/types/stock';

const UP = '#ff5d73';
const DOWN = '#23a36b';

function ma(bars: KlineBar[], n: number) {
  return bars
    .map((b, i) => {
      if (i < n - 1) return null;
      let s = 0;
      for (let j = i - n + 1; j <= i; j++) s += bars[j].close;
      return { time: b.time, value: s / n };
    })
    .filter((x): x is { time: string; value: number } => x !== null);
}

export default function KlineChart({ bars }: { bars: KlineBar[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!ref.current || bars.length === 0) return;

    const chart = createChart(ref.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8d5568',
        fontSize: 10,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      },
      grid: {
        vertLines: { color: '#ffdeea' },
        horzLines: { color: '#ffdeea' },
      },
      rightPriceScale: { borderColor: '#ffc2d4' },
      timeScale: { borderColor: '#ffc2d4' },
      crosshair: {
        vertLine: { color: '#ff5d8f', labelBackgroundColor: '#ff5d8f' },
        horzLine: { color: '#ff5d8f', labelBackgroundColor: '#ff5d8f' },
      },
    });
    chartRef.current = chart;

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });
    candle.setData(bars.map((b) => ({ ...b })));

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volume.setData(
      bars.map((b) => ({
        time: b.time,
        value: b.volume,
        color: b.close >= b.open ? 'rgba(255,93,115,0.35)' : 'rgba(35,163,107,0.35)',
      })),
    );

    const ma5 = chart.addSeries(LineSeries, { color: '#ff5d8f', lineWidth: 1, priceLineVisible: false });
    ma5.setData(ma(bars, 5));
    const ma10 = chart.addSeries(LineSeries, { color: '#f5a623', lineWidth: 1, priceLineVisible: false });
    ma10.setData(ma(bars, 10));
    const ma20 = chart.addSeries(LineSeries, { color: '#c084fc', lineWidth: 1, priceLineVisible: false });
    ma20.setData(ma(bars, 20));

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [bars]);

  return (
    <div>
      <div className="num mb-1 flex gap-3 px-1 text-[10px] uppercase tracking-wider text-[#8d5568]">
        <span><i className="mr-1 inline-block h-0.5 w-3 bg-[#ff5d8f] align-middle" />MA5</span>
        <span><i className="mr-1 inline-block h-0.5 w-3 bg-[#f5a623] align-middle" />MA10</span>
        <span><i className="mr-1 inline-block h-0.5 w-3 bg-[#c084fc] align-middle" />MA20</span>
      </div>
      <div ref={ref} className="h-[300px] w-full" />
    </div>
  );
}
