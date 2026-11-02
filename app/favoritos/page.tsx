import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice, timeAgo } from "@/lib/format";
import { priceDropSince } from "@/lib/history";
import { storeName } from "@/lib/scrapers";
import CompareFavorites from "@/components/CompareFavorites";
import FavoriteButton from "@/components/FavoriteButton";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function FavoritosPage() {
  const rows = await prisma.favorite.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: { history: { select: { price: true, capturedAt: true }, orderBy: { capturedAt: "asc" } } },
      },
    },
  });

  const items = rows.map((f) => ({
    f,
    sinceSaved: f.priceAtSave > f.product.currentPrice ? f.priceAtSave - f.product.currentPrice : 0,
    sinceFirst: priceDropSince(f.product.history, f.product.currentPrice),
  }));
  const droppedSinceSaved = items.filter((i) => i.sinceSaved > 0).length;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Tu lista" title="Favoritos">
        Las laptops que guardaste con el corazón. Te mostramos cuánto cambió su precio desde que la guardaste.
      </PageHeader>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <p className="font-display text-xl font-bold">Todavía no tienes favoritos</p>
          <p className="mt-2 text-sm text-muted">Toca el corazón en cualquier laptop para guardarla aquí.</p>
          <Link href="/" className="btn mt-5">Ver laptops</Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-surface px-4 py-3">
                <div className="font-mono text-xl font-medium tabular-nums">{rows.length}</div>
                <div className="text-xs text-muted">Guardadas</div>
              </div>
              <div className="rounded-xl border border-line bg-surface px-4 py-3">
                <div className="font-mono text-xl font-medium tabular-nums text-deal">{droppedSinceSaved}</div>
                <div className="text-xs text-muted">Bajaron desde que las guardaste</div>
              </div>
            </div>
            <CompareFavorites productIds={rows.map((f) => f.productId)} />
          </div>

          <ul className="grid gap-3 lg:grid-cols-2">
            {items.map(({ f, sinceSaved, sinceFirst }, i) => {
              const p = f.product;
              return (
                <li key={f.productId} className="rise" style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
                  <div className="relative flex h-full gap-4 rounded-xl border border-line bg-surface p-4 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-accent">
                    <Link href={`/products/${p.id}`} className="absolute inset-0 rounded-xl" aria-label={p.title} />
                    <div className="grid size-24 shrink-0 place-items-center rounded-lg bg-white p-2">
                      {p.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="text-xs uppercase tracking-wide text-muted">{storeName(p.store)}</div>
                      <h2 className="line-clamp-2 text-sm font-medium">{p.title}</h2>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-sm tabular-nums">
                        <span className="text-lg font-semibold">{formatPrice(p.currentPrice)}</span>
                        {sinceSaved > 0 && (
                          <span className="rounded-full bg-deal px-2 py-0.5 text-xs font-semibold text-on-deal">
                            −{formatPrice(sinceSaved)} desde que la guardaste
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">
                        Guardada {timeAgo(f.createdAt)} a {formatPrice(f.priceAtSave)}
                        {sinceFirst && <> · primer precio visto {formatPrice(sinceFirst.first)} (−{sinceFirst.pct}%)</>}
                      </div>
                    </div>
                    <FavoriteButton productId={p.id} saved className="self-start" />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
