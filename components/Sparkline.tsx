/** Tiny price line drawn in SVG, no chart library: the page stays light. */
export default function Sparkline({ prices, className = "" }: { prices: number[]; className?: string }) {
  const w = 120;
  const h = 36;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const pts = prices.map((p, i) => {
    const x = prices.length === 1 ? w : (i / (prices.length - 1)) * w;
    const y = h - 4 - ((p - min) / span) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none">
      <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
