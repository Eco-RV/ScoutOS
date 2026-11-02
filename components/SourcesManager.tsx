"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { shortUrl, timeAgo } from "@/lib/format";

interface Source {
  id: number;
  url: string;
  store: string;
  type: string;
  active: boolean;
  lastRunAt: string | null;
  lastError: string | null;
  productCount: number;
}

/** What the page knows about each store: plain data, so it can cross into this client component. */
export interface StoreInfo {
  id: string;
  name: string;
  hosts: string[];
  platform: string;
  method: string;
  example: string;
  browserOnly: boolean;
  laptops: number;
  linkCount: number;
  lastRunAt: string | null;
  error: string | null;
}

interface Summary {
  found: number;
  created: number;
  priceChanges: number;
  priceDrops: number;
  error?: string;
}

const describe = (s: Summary) =>
  s.error
    ? `Error: ${s.error}`
    : `${s.found} laptops · ${s.created} nuevas · ${s.priceChanges} cambios de precio · ${s.priceDrops} rebajas`;

function detectStore(stores: StoreInfo[], raw: string): StoreInfo | null {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase();
    return stores.find((s) => s.hosts.includes(host)) ?? null;
  } catch {
    return null;
  }
}

export default function SourcesManager({ stores, initial }: { stores: StoreInfo[]; initial: Source[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const detected = useMemo(() => (url.trim() ? detectStore(stores, url) : null), [stores, url]);
  const unsupported = url.trim() !== "" && !detected;
  const totalLaptops = stores.reduce((n, s) => n + s.laptops, 0);

  async function call(key: string, input: RequestInfo, init?: RequestInit) {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch(input, { headers: { "content-type": "application/json" }, ...init });
      const data = res.status === 204 ? null : await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`);
      router.refresh();
      return data;
    } catch (e) {
      setMessage({ text: (e as Error).message, error: true });
    } finally {
      setBusy(null);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const data = await call("add", "/api/sources", { method: "POST", body: JSON.stringify({ url }) });
    if (data) {
      setUrl("");
      setMessage({ text: describe(data.summary), error: !!data.summary.error });
    }
  }

  async function scrape(sourceId?: number) {
    const data: Summary[] | undefined = await call(`scrape-${sourceId ?? "all"}`, "/api/scrape", {
      method: "POST",
      body: JSON.stringify({ sourceId }),
    });
    if (data) {
      const drops = data.reduce((n, s) => n + s.priceDrops, 0);
      const errors = data.filter((s) => s.error).length;
      setMessage({
        text: data.length === 1 ? describe(data[0]) : `${data.length} links actualizados · ${drops} rebajas · ${errors} con error`,
        error: errors > 0 && data.length === 1,
      });
    }
  }

  // Store cards put a real example in the form and bring the user back to it.
  function fillExample(example: string) {
    setUrl(example);
    input.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={add} className="space-y-2 rounded-xl border border-line bg-surface p-4">
        <label htmlFor="source-url" className="text-sm font-medium">Agregar un link</label>
        <div className="flex flex-wrap gap-2">
          <input
            id="source-url"
            ref={input}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://cr.siman.com/tecnologia/computadoras/laptops"
            className="input min-w-64 flex-1"
            required
          />
          <button className="btn" disabled={!!busy || unsupported}>
            {busy === "add" ? "Extrayendo…" : "Agregar y extraer"}
          </button>
        </div>
        <p className="text-xs" aria-live="polite">
          {detected && <span className="text-accent">Tienda detectada: {detected.name}</span>}
          {unsupported && <span className="text-error">Esta tienda no está en la lista de abajo.</span>}
          {!url.trim() && <span className="text-muted">Pega el link y ScoutOS reconoce la tienda.</span>}
        </p>
      </form>

      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-sm ${message.error ? "bg-error-bg text-error" : "bg-surface text-muted"}`}
        >
          {message.text}
        </p>
      )}

      <section aria-labelledby="stores-title" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="stores-title" className="font-display text-xl font-bold">
            {stores.length} tiendas · {totalLaptops} laptops
          </h2>
          {initial.length > 0 && (
            <button className="btn-ghost" disabled={!!busy} onClick={() => scrape()}>
              {busy === "scrape-all" ? "Actualizando todo…" : "Actualizar todos los precios"}
            </button>
          )}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stores.map((s, i) => {
            const status = s.error ? "error" : s.linkCount === 0 ? "vacia" : "ok";
            return (
              <li key={s.id} className="rise" style={{ "--i": i } as React.CSSProperties}>
                <div className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <a href={`#tienda-${s.id}`} className="font-display text-lg font-bold hover:text-accent">{s.name}</a>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-line px-2 py-0.5 text-muted">{s.platform}</span>
                        <StatusDot status={status} />
                      </div>
                    </div>
                    <span className="font-mono text-2xl font-medium tabular-nums">{s.laptops}</span>
                  </div>
                  <p className="text-xs text-muted">{s.method}</p>
                  <p className="mt-auto text-xs text-muted">
                    {s.linkCount} {s.linkCount === 1 ? "link" : "links"} · revisada {timeAgo(s.lastRunAt)}
                  </p>
                  {s.error && <p className="text-xs text-error">{s.error}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-ghost text-xs" onClick={() => fillExample(s.example)}>
                      Usar ejemplo
                    </button>
                    <a href={`#tienda-${s.id}`} className="btn-ghost text-xs">Ver sus links</a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="links-title" className="space-y-6">
        <h2 id="links-title" className="font-display text-xl font-bold">Links por tienda</h2>
        {stores.map((s) => {
          const rows = initial.filter((x) => x.store === s.id);
          return (
            <div key={s.id} id={`tienda-${s.id}`} className="scroll-mt-24 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
                <h3 className="font-semibold">
                  {s.name} <span className="text-sm font-normal text-muted">· {rows.length} {rows.length === 1 ? "link" : "links"}</span>
                </h3>
                <span className="text-xs text-muted">{s.method}</span>
              </div>

              {rows.length === 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-line p-4 text-sm text-muted">
                  <span>Aún no agregas links de {s.name}.</span>
                  <button type="button" className="btn-ghost text-xs" onClick={() => fillExample(s.example)}>Usar ejemplo</button>
                </div>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                  {rows.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <a href={r.url} target="_blank" rel="noreferrer" title={r.url} className="block truncate text-sm hover:text-accent">
                          {shortUrl(r.url)}
                        </a>
                        <div className="mt-0.5 text-xs text-muted">
                          {r.type === "product" ? "Producto" : "Listado"} · {r.productCount} laptops · revisado {timeAgo(r.lastRunAt)}
                          {!r.active && " · pausado"}
                        </div>
                        {r.lastError && <div className="mt-1 text-xs text-error">{r.lastError}</div>}
                      </div>
                      {s.browserOnly ? (
                        <Link href="/import" className="btn-ghost" title="Esta tienda solo se puede actualizar con el marcador">
                          Importar con marcador
                        </Link>
                      ) : (
                        <button className="btn-ghost" disabled={!!busy} onClick={() => scrape(r.id)}>
                          {busy === `scrape-${r.id}` ? "Actualizando…" : "Actualizar"}
                        </button>
                      )}
                      <button
                        className="btn-ghost"
                        disabled={!!busy}
                        onClick={() => call(`toggle-${r.id}`, `/api/sources/${r.id}`, { method: "PATCH", body: JSON.stringify({ active: !r.active }) })}
                      >
                        {r.active ? "Pausar" : "Reanudar"}
                      </button>
                      <button
                        className="btn-ghost text-error"
                        disabled={!!busy}
                        onClick={() => confirm("¿Quitar este link? Las laptops y su historial se conservan.") && call(`del-${r.id}`, `/api/sources/${r.id}`, { method: "DELETE" })}
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function StatusDot({ status }: { status: "ok" | "error" | "vacia" }) {
  const map = {
    ok: { label: "Funcionando", cls: "bg-deal" },
    error: { label: "Con error", cls: "bg-error" },
    vacia: { label: "Sin links", cls: "bg-muted" },
  } as const;
  return (
    <span className="flex items-center gap-1.5 text-muted">
      <span aria-hidden="true" className={`size-2 rounded-full ${map[status].cls}`} />
      {map[status].label}
    </span>
  );
}
