const crc = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 });

export const formatPrice = (n: number) => crc.format(n);

export function formatStorage(gb?: number | null) {
  if (!gb) return null;
  return gb >= 1024 ? `${+(gb / 1024).toFixed(1)} TB` : `${gb} GB`;
}

export function timeAgo(d: Date | string | null | undefined) {
  if (!d) return "nunca";
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  return h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
}

/** Discount the store advertises (list price vs. current). */
export function storeDiscountPct(p: { currentPrice: number; listPrice: number | null }) {
  return p.listPrice && p.listPrice > p.currentPrice
    ? Math.round((1 - p.currentPrice / p.listPrice) * 100)
    : 0;
}

/** Drop we saw ourselves since the previous scrape. */
export function droppedBy(p: { currentPrice: number; prevPrice: number | null }) {
  return p.prevPrice && p.prevPrice > p.currentPrice ? p.prevPrice - p.currentPrice : 0;
}
