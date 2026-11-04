"use client";

import Link from "next/link";
import type { Product } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { droppedBy, formatPrice, formatStorage, storeDiscountPct } from "@/lib/format";
import FavoriteButton from "@/components/FavoriteButton";

export type GridProduct = Product & {
  storeLabel: string;
  condition: "nueva" | "usada";
  /** Percent below the first price we recorded; 0 when it never dropped. */
  dropPct: number;
  firstPrice: number | null;
};

export default function CompareGrid({ products, favoriteIds = [] }: { products: GridProduct[]; favoriteIds?: number[] }) {
  const saved = new Set(favoriteIds);
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function compare() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear la comparación");
      router.push(`/comparisons/${data.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid gap-3 pb-20 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p, i) => {
          const pct = storeDiscountPct(p);
          const drop = droppedBy(p);
          const isSelected = selected.includes(p.id);
          const chips = [
            p.cpu,
            p.ramGb && `${p.ramGb} GB RAM`,
            p.storageGb && `${formatStorage(p.storageGb)}${p.storageType ? ` ${p.storageType}` : ""}`,
            p.screenIn && `${p.screenIn}"`,
            p.gpu,
          ].filter(Boolean) as string[];
          return (
            <div
              key={p.id}
              style={{ "--i": Math.min(i, 12) } as React.CSSProperties}
              className={`rise group relative flex flex-col rounded-lg border bg-surface p-3 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-black/30 ${
                isSelected ? "border-accent ring-1 ring-accent" : "border-line"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted">
                  {p.storeLabel}
                  {p.condition === "usada" && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 normal-case text-accent-2">Usada</span>}
                </span>
                <div className="flex items-center gap-2">
                  <label className="relative z-10 flex cursor-pointer items-center gap-1 text-xs text-muted">
                    <input type="checkbox" checked={isSelected} onChange={() => toggle(p.id)} /> Comparar
                  </label>
                  <FavoriteButton productId={p.id} saved={saved.has(p.id)} />
                </div>
              </div>
              <Link
                href={`/products/${p.id}`}
                className="flex flex-1 flex-col after:absolute after:inset-0 after:content-['']"
              >
                <div className="relative mb-3 flex h-40 items-center justify-center rounded bg-white">
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                  )}
                  {pct > 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-deal px-1.5 py-0.5 text-xs font-semibold text-on-deal">
                      -{pct}%
                    </span>
                  )}
                  {!p.inStock && (
                    <span className="absolute right-1.5 top-1.5 rounded bg-foreground px-1.5 py-0.5 text-xs text-background">
                      Agotado
                    </span>
                  )}
                </div>
                <h2 className="line-clamp-2 text-sm font-medium group-hover:text-accent">{p.title}</h2>
                <div className="mt-2 flex flex-wrap gap-1">
                  {chips.map((c) => (
                    <span key={c} className="rounded bg-background px-1.5 py-0.5 text-xs text-muted">{c}</span>
                  ))}
                </div>
                <div className="mt-auto pt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-lg font-semibold tabular-nums">{formatPrice(p.currentPrice)}</span>
                    {p.listPrice && p.listPrice > p.currentPrice && (
                      <span className="text-sm text-muted line-through">{formatPrice(p.listPrice)}</span>
                    )}
                  </div>
                  {p.dropPct > 0 && (
                    <div className="mt-1 inline-block rounded bg-deal px-1.5 py-0.5 text-xs font-semibold text-on-deal">
                      −{p.dropPct}% desde {formatPrice(p.firstPrice!)}
                    </div>
                  )}
                  {drop > 0 && (
                    <div className="mt-1 inline-block rounded bg-deal-bg px-1.5 py-0.5 text-xs font-medium text-deal">
                      Bajó {formatPrice(drop)} desde la última revisión
                    </div>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="bar-enter fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm">
              {selected.length} seleccionada{selected.length === 1 ? "" : "s"}
              {selected.length < 2 && <span className="text-muted"> · elige al menos 2</span>}
            </span>
            <div className="flex items-center gap-3">
              {error && <span role="alert" className="text-sm text-error">{error}</span>}
              <button className="text-sm text-muted hover:text-foreground" onClick={() => setSelected([])}>
                Limpiar
              </button>
              <button className="btn disabled:opacity-50" disabled={selected.length < 2 || saving} onClick={compare}>
                {saving ? "Creando…" : "Comparar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
