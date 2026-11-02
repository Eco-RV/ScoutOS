"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { formatPrice, timeAgo } from "@/lib/format";
import { POPOVER_EVENT, closeOthers } from "@/lib/popover";
import CompareFavorites from "@/components/CompareFavorites";

export interface FavoriteRow {
  productId: number;
  title: string;
  image: string | null;
  storeLabel: string;
  inStock: boolean;
  currentPrice: number;
  priceAtSave: number;
  savedAt: string;
}

/** Heart button in the NavBar with a count. Opens a panel with the latest saved laptops and their price changes. */
export default function NavFavorites() {
  const pathname = usePathname();
  const panelId = useId();
  const box = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<FavoriteRow[] | null>(null);
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  const load = useCallback(async () => {
    const res = await fetch("/api/favorites", { cache: "no-store" });
    if (res.ok) setRows(await res.json());
  }, []);

  // Loaded on mount, and again whenever a heart anywhere on the site changes.
  useEffect(() => {
    load();
    window.addEventListener("favorites:changed", load);
    return () => window.removeEventListener("favorites:changed", load);
  }, [load]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpenedOn(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenedOn(null);
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== "favorites") setOpenedOn(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener(POPOVER_EVENT, onOther);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(POPOVER_EVENT, onOther);
    };
  }, []);

  const count = rows?.length ?? 0;
  const latest = (rows ?? []).slice(0, 5);

  function toggle() {
    if (open) return setOpenedOn(null);
    closeOthers("favorites");
    setOpenedOn(pathname);
    load();
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Favoritos: ${count}`}
        className="btn-ghost relative grid size-10 place-items-center p-0"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill={count > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={count > 0 ? "text-error" : ""}>
          <path d="M12 21s-7.5-4.6-9.5-9.2C1.1 8.6 3.2 5 6.8 5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.6 0 5.7 3.6 4.3 6.8C19.5 16.4 12 21 12 21z" />
        </svg>
        {count > 0 && (
          <span aria-hidden="true" className="spring absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-semibold text-on-accent">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div id={panelId} className="menu-enter absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/50">
          <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
            <span className="font-display font-bold">Favoritos</span>
            <span className="text-xs text-muted">{count} guardadas</span>
          </div>

          {count === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              Toca el corazón en una laptop para guardarla aquí.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {latest.map((f) => {
                const down = f.priceAtSave > f.currentPrice;
                return (
                  <li key={f.productId}>
                    <Link
                      href={`/products/${f.productId}`}
                      onClick={() => setOpenedOn(null)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 block text-sm">{f.title}</span>
                        <span className="text-xs text-muted">{f.storeLabel} · guardada {timeAgo(f.savedAt)}</span>
                      </span>
                      <span className="shrink-0 text-right font-mono text-sm tabular-nums">
                        <span className={down ? "text-deal" : ""}>{formatPrice(f.currentPrice)}</span>
                        {down && (
                          <span className="block text-xs text-deal">−{Math.round((1 - f.currentPrice / f.priceAtSave) * 100)}%</span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {count > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
              <Link href="/favoritos" onClick={() => setOpenedOn(null)} className="text-sm text-accent hover:underline">
                Ver todos →
              </Link>
              {count >= 2 && (
                <CompareFavorites productIds={(rows ?? []).map((r) => r.productId)} label="Comparar" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
