"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { POPOVER_EVENT, closeOthers } from "@/lib/popover";

interface Hit {
  id: number;
  title: string;
  image: string | null;
  storeLabel: string;
  currentPrice: number;
}

/** Search box in the NavBar: suggestions while typing, arrow keys to pick, Enter to open. */
export default function NavSearch({ name }: { name: "desktop" | "mobile" }) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(-1);
  // The list is open for the page it was opened on; navigating away closes it without an effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const ready = q.trim().length >= 2;
  const open = ready && openedOn === pathname && hits.length > 0;

  // Debounced fetch. Aborting the previous request keeps a slow old answer from replacing a newer one.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data: Hit[]) => {
          setHits(data);
          setActive(-1);
          setOpenedOn(pathname);
        })
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, pathname]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpenedOn(null);
    };
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== name) setOpenedOn(null);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener(POPOVER_EVENT, onOther);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener(POPOVER_EVENT, onOther);
    };
  }, [name]);

  function go(href: string) {
    setOpenedOn(null);
    router.push(href);
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (active >= 0 && hits[active]) return go(`/products/${hits[active].id}`);
    if (q.trim()) go(`/?q=${encodeURIComponent(q.trim())}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!open) return;
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + hits.length) % hits.length);
    } else if (e.key === "Escape") {
      setOpenedOn(null);
      setActive(-1);
    }
  }

  const listbox = open && (
    <ul id={listId} role="listbox" aria-label="Sugerencias" className="menu-enter absolute left-0 top-full z-50 mt-2 w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/50">
      {hits.map((h, i) => (
        <li
          key={h.id}
          id={`${listId}-${i}`}
          role="option"
          aria-selected={i === active}
          onMouseDown={(e) => { e.preventDefault(); go(`/products/${h.id}`); }}
          onMouseEnter={() => setActive(i)}
          className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${i === active ? "bg-surface-2" : ""}`}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-white p-1">
            {h.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={h.image} alt="" className="max-h-full max-w-full object-contain" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 block">{h.title}</span>
            <span className="text-xs text-muted">{h.storeLabel}</span>
          </span>
          <span className="shrink-0 font-mono tabular-nums text-accent">{formatPrice(h.currentPrice)}</span>
        </li>
      ))}
      <li>
        <Link
          href={`/?q=${encodeURIComponent(q.trim())}`}
          onClick={() => setOpenedOn(null)}
          className="block border-t border-line px-3 py-2 text-center text-xs text-accent hover:bg-surface-2"
        >
          Ver todos los resultados
        </Link>
      </li>
    </ul>
  );

  return (
    <div ref={box} className="relative">
      <form role="search" onSubmit={submit}>
        <label htmlFor={`nav-search-${name}`} className="sr-only">Buscar laptops</label>
        <input
          id={`nav-search-${name}`}
          type="search"
          role="combobox"
          autoComplete="off"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(-1);
            if (e.target.value.trim().length >= 2) closeOthers("search");
          }}
          onKeyDown={onKeyDown}
          onFocus={() => ready && setOpenedOn(pathname)}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          placeholder="Buscar marca, CPU, modelo…"
          className="input input--icon w-full min-w-56"
        />
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </form>
      {listbox}
    </div>
  );
}
