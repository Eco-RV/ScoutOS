"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buildBookmarklet } from "@/lib/bookmarklet";

interface ImportMessage {
  type: "scoutos-import";
  url: string;
  products: unknown[];
}

type State =
  | { kind: "idle" }
  | { kind: "waiting" }
  | { kind: "saving"; count: number }
  | { kind: "done"; text: string }
  | { kind: "error"; text: string };

/**
 * Shows the draggable bookmarklet. When opened by it as a popup, also waits
 * for the products it sends and saves them through /api/import.
 */
export default function ImportReceiver({ allowedHosts }: { allowedHosts: string[] }) {
  const link = useRef<HTMLAnchorElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    // React refuses javascript: hrefs in JSX, so set it on the DOM node directly.
    link.current?.setAttribute("href", buildBookmarklet(window.location.origin));

    const opener = window.opener as Window | null;
    if (!opener) return;
    setState({ kind: "waiting" });

    let received = false;
    // Keep announcing until the store page has finished reading and replies.
    const ping = setInterval(() => !received && opener.postMessage("scoutos-ready", "*"), 500);

    async function onMessage(e: MessageEvent) {
      const data = e.data as ImportMessage;
      if (received || data?.type !== "scoutos-import") return;
      const origin = new URL(e.origin);
      if (!allowedHosts.includes(origin.hostname) || new URL(data.url).origin !== e.origin) return;
      received = true;
      clearInterval(ping);

      setState({ kind: "saving", count: data.products.length });
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: data.url, products: data.products }),
      });
      const body = await res.json();
      if (!res.ok) return setState({ kind: "error", text: body.error });
      const s = body.summary;
      setState({
        kind: "done",
        text: `${body.store}: ${s.found} laptops · ${s.created} nuevas · ${s.priceChanges} cambios de precio · ${s.priceDrops} rebajas`,
      });
    }

    window.addEventListener("message", onMessage);
    return () => {
      clearInterval(ping);
      window.removeEventListener("message", onMessage);
    };
  }, [allowedHosts]);

  return (
    <div className="space-y-4">
      {state.kind !== "idle" && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            state.kind === "error" ? "border-deal bg-deal-bg text-deal" : "border-line bg-surface"
          }`}
        >
          {state.kind === "waiting" && "Leyendo los productos de la tienda…"}
          {state.kind === "saving" && `Guardando ${state.count} productos…`}
          {state.kind === "error" && state.text}
          {state.kind === "done" && (
            <>
              <strong>Importación lista.</strong> {state.text}.{" "}
              <Link href="/" className="text-accent underline">Ver laptops</Link>
            </>
          )}
        </div>
      )}

      <div className="rounded-lg border border-line bg-surface p-4">
        <p className="mb-3 text-sm text-muted">Arrastra este botón a tu barra de marcadores:</p>
        <a
          ref={link}
          onClick={(e) => {
            e.preventDefault();
            alert("Arrástralo a la barra de marcadores; se usa desde la página de la tienda.");
          }}
          className="btn inline-block cursor-grab"
        >
          Importar a ScoutOS
        </a>
      </div>
    </div>
  );
}
