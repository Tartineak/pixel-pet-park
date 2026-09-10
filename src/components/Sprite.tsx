import { memo, useMemo } from 'react';

/**
 * 把字符画渲染成像素 SVG（边缘锐利）。
 * memo + useMemo：一只宠物约 200 个 <rect>，20 只就是几千节点，
 * 没有缓存时每次行情刷新都会重建整棵子树。
 */
function SpriteBase({
  rows,
  palette,
  px = 4,
  className,
  style,
}: {
  rows: string[];
  palette: Record<string, string>;
  px?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { w, h, rects } = useMemo(() => {
    const width = Math.max(...rows.map((r) => r.length));
    const height = rows.length;
    const out: React.ReactNode[] = [];
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const color = palette[ch];
        if (!color) continue;
        out.push(
          <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={color} />,
        );
      }
    });
    return { w: width, h: height, rects: out };
  }, [rows, palette, px]);

  return (
    <svg
      width={w * px}
      height={h * px}
      viewBox={`0 0 ${w * px} ${h * px}`}
      className={`pixelated ${className ?? ''}`}
      style={style}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {rects}
    </svg>
  );
}

export default memo(SpriteBase);
