import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice, timeAgo } from "@/lib/format";
import { priceDropSince } from "@/lib/history";
import { conditionOf } from "@/lib/laptop-filters";
import { storeName } from "@/lib/scrapers";
import PageHeader from "@/components/PageHeader";
import Sparkline from "@/components/Sparkline";

export const dynamic = "force-dynamic";

const dateLabel = (d: Date) => d.toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" });

export default async function BajadasPage({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const { orden } = await searchParams;
  // Only products seen at least twice have a previous price, so this is every product with a history to compare.
  const rows = await prisma.product.findMany({
    where: { prevPrice: { not: null } },
    include: {
      source: { select: { url: true } },
      history: { select: { price: true, capturedAt: true }, orderBy: { capturedAt: "asc" } },
    },
  });

  const drops = rows
    .flatMap((r) => {
      const drop = priceDropSince(r.history, r.currentPrice);
      return drop ? [{ r, drop, condition: conditionOf(r.title, r.source?.url) }] : [];
    })
    .sort((a, b) => (orden === "monto" ? b.drop.amount - a.drop.amount : b.drop.pct - a.drop.pct));

  const biggest = drops.reduce((m, d) => Math.max(m, d.drop.pct), 0);
  const lastCheck = rows.reduce<Date | null>((m, r) => (!m || r.updatedAt > m ? r.updatedAt : m), null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Historial de precios"
        title="Bajadas"
        actions={
          <div className="flex gap-1 rounded-full border border-line bg-surface p-1 text-sm">
            <Link href="/bajadas" aria-current={orden !== "monto" ? "page" : undefined} className="nav-link">
              Por porcentaje
            </Link>
            <Link href="/bajadas?orden=monto" aria-current={orden === "monto" ? "page" : undefined} className="nav-link">
              Por monto
            </Link>
          </div>
        }
      >
        Laptops que bajaron de precio desde la primera vez que las importamos. Cada revisión queda guardada, así que
        ves el antes y el después.
      </PageHeader>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <div className="font-mono text-xl font-medium tabular-nums">{drops.length}</div>
          <div className="text-xs text-muted">Laptops que bajaron</div>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <div className="font-mono text-xl font-medium tabular-nums text-deal">−{biggest}%</div>
          <div className="text-xs text-muted">Mayor bajada</div>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <div className="font-mono text-xl font-medium tabular-nums">{timeAgo(lastCheck)}</div>
          <div className="text-xs text-muted">Última revisión</div>
        </div>
      </div>

      {drops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-muted">
          Todavía no hay bajadas. Aparecen cuando una laptop se revisa de nuevo y cuesta menos que antes.
        </div>
      ) : (
        <ul className="space-y-3">
          {drops.map(({ r, drop, condition }, i) => (
            <li key={r.id} className="rise" style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
              <Link
                href={`/products/${r.id}`}
                className="group grid gap-4 rounded-xl border border-line bg-surface p-4 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-deal sm:grid-cols-[88px_1fr_auto] sm:items-center"
              >
                <div className="grid size-22 place-items-center rounded-lg bg-white p-2">
                  {r.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted">Sin foto</span>
                  )}
                </div>

                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-medium uppercase tracking-wide">{storeName(r.store)}</span>
                    {condition === "usada" && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-accent-2">Usada</span>}
                  </div>
                  <h2 className="line-clamp-2 text-sm font-medium group-hover:text-accent">{r.title}</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm tabular-nums">
                    <span className="text-muted line-through">{formatPrice(drop.first)}</span>
                    <span aria-hidden="true" className="text-muted">→</span>
                    <span className="text-lg font-semibold text-deal">{formatPrice(drop.current)}</span>
                    <span className="text-xs text-muted">
                      desde {dateLabel(drop.firstAt)} · revisada {timeAgo(r.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <span className="rounded-full bg-deal px-3 py-1 font-mono text-sm font-semibold text-on-deal">−{drop.pct}%</span>
                  <Sparkline prices={r.history.map((h) => h.price)} className="h-9 w-30 text-deal" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
