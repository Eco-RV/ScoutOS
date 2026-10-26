"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { timeAgo } from "@/lib/format";

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

export default function SourcesManager({ initial }: { initial: Source[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

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

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex flex-wrap gap-2 rounded-lg border border-line bg-surface p-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://cr.siman.com/tecnologia/computadoras/laptops"
          className="input min-w-64 flex-1"
          required
        />
        <button className="btn" disabled={!!busy}>
          {busy === "add" ? "Extrayendo…" : "Agregar y extraer"}
        </button>
      </form>

      {message && (
        <p className={`rounded-md px-3 py-2 text-sm ${message.error ? "bg-deal-bg text-deal" : "bg-surface text-muted"}`}>
          {message.text}
        </p>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-medium">{initial.length} links</h2>
        {initial.length > 0 && (
          <button className="btn-ghost" disabled={!!busy} onClick={() => scrape()}>
            {busy === "scrape-all" ? "Actualizando todo…" : "Actualizar todos los precios"}
          </button>
        )}
      </div>

      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {initial.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <a href={s.url} target="_blank" rel="noreferrer" className="block truncate text-sm hover:text-accent">
                {s.url}
              </a>
              <div className="mt-0.5 text-xs text-muted">
                {s.type === "product" ? "Producto" : "Listado"} · {s.productCount} laptops · revisado {timeAgo(s.lastRunAt)}
                {!s.active && " · pausado"}
              </div>
              {s.lastError && <div className="mt-1 text-xs text-deal">{s.lastError}</div>}
            </div>
            <button className="btn-ghost" disabled={!!busy} onClick={() => scrape(s.id)}>
              {busy === `scrape-${s.id}` ? "Actualizando…" : "Actualizar"}
            </button>
            <button
              className="btn-ghost"
              disabled={!!busy}
              onClick={() => call(`toggle-${s.id}`, `/api/sources/${s.id}`, { method: "PATCH", body: JSON.stringify({ active: !s.active }) })}
            >
              {s.active ? "Pausar" : "Reanudar"}
            </button>
            <button
              className="btn-ghost text-deal"
              disabled={!!busy}
              onClick={() => confirm("¿Quitar este link? Las laptops y su historial se conservan.") && call(`del-${s.id}`, `/api/sources/${s.id}`, { method: "DELETE" })}
            >
              Quitar
            </button>
          </li>
        ))}
        {!initial.length && <li className="p-6 text-center text-sm text-muted">Aún no hay links.</li>}
      </ul>
    </div>
  );
}
