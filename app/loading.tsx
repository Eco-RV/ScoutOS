/** Shown while a page's data loads: skeleton cards that shimmer instead of a blank screen. */
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <div className="skeleton h-14 w-56" />
      <div className="skeleton h-14 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton rise h-72 p-3" style={{ "--i": Math.min(i, 12) } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}
