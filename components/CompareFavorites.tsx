"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Builds a comparison from a list of laptop ids and opens it. */
export default function CompareFavorites({ productIds, label = "Comparar favoritos" }: { productIds: number[]; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function compare() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear la comparación");
      router.push(`/comparisons/${data.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button type="button" className="btn" disabled={productIds.length < 2 || busy} onClick={compare}>
        {busy ? "Creando…" : label}
      </button>
      {productIds.length < 2 && <span className="text-sm text-muted">Guarda al menos 2 para comparar</span>}
      {error && <span role="alert" className="text-sm text-error">{error}</span>}
    </span>
  );
}
