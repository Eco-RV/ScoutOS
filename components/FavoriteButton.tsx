"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Heart that saves or removes a laptop. Shows the new state at once, then syncs with the server. */
export default function FavoriteButton({
  productId,
  saved,
  className = "",
}: {
  productId: number;
  saved: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    // The card is a link; the heart must not navigate.
    e.preventDefault();
    e.stopPropagation();
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      const res = next
        ? await fetch("/api/favorites", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ productId }),
          })
        : await fetch(`/api/favorites/${productId}`, { method: "DELETE" });
      if (res.ok) window.dispatchEvent(new Event("favorites:changed"));
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={optimistic}
      aria-label={optimistic ? "Quitar de favoritos" : "Guardar en favoritos"}
      title={optimistic ? "Quitar de favoritos" : "Guardar en favoritos"}
      className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border transition duration-200 ease-out hover:scale-110 ${
        optimistic ? "border-error/60 bg-error-bg text-error" : "border-line bg-surface text-muted hover:text-error"
      } ${className}`}
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={optimistic ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M12 21s-7.5-4.6-9.5-9.2C1.1 8.6 3.2 5 6.8 5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.6 0 5.7 3.6 4.3 6.8C19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}
