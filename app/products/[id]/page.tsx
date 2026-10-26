import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { droppedBy, formatPrice, formatStorage, storeDiscountPct, timeAgo } from "@/lib/format";
import { storeName } from "@/lib/scrapers";
import PriceChart from "@/components/PriceChart";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: { history: { orderBy: { capturedAt: "asc" } } },
  });
  if (!p) notFound();

  const pct = storeDiscountPct(p);
  const drop = droppedBy(p);
  const specs: [string, string | null | undefined][] = [
    ["Procesador", p.cpu],
    ["RAM", p.ramGb ? `${p.ramGb} GB` : null],
    ["Almacenamiento", p.storageGb ? `${formatStorage(p.storageGb)} ${p.storageType ?? ""}` : null],
    ["Pantalla", p.screenIn ? `${p.screenIn}"` : null],
    ["Gráficos", p.gpu],
    ["Marca", p.brand],
  ];

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-muted hover:text-foreground">← Volver</Link>
      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <div className="flex h-72 items-center justify-center rounded-lg border border-line bg-white p-4">
          {p.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt="" className="max-h-full max-w-full object-contain" />
          )}
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted">{storeName(p.store)}</div>
            <h1 className="mt-1 text-xl font-semibold">{p.title}</h1>
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold">{formatPrice(p.currentPrice)}</span>
            {pct > 0 && (
              <>
                <span className="text-muted line-through">{formatPrice(p.listPrice!)}</span>
                <span className="rounded bg-deal px-1.5 py-0.5 text-sm font-semibold text-white">-{pct}%</span>
              </>
            )}
            {!p.inStock && <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-sm text-white">Agotado</span>}
          </div>
          <div className="text-sm text-muted">
            Precio más bajo visto: <strong className="text-foreground">{formatPrice(p.lowestPrice)}</strong>
            {drop > 0 && <> · bajó {formatPrice(drop)} desde la revisión anterior</>}
            {" "}· revisado {timeAgo(p.updatedAt)}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-line bg-surface p-4 text-sm sm:grid-cols-3">
            {specs.map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          <a href={p.url} target="_blank" rel="noreferrer" className="btn inline-block">Ver en la tienda ↗</a>
        </div>
      </div>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-3 font-medium">Historial de precio</h2>
        <PriceChart
          points={p.history.map((h) => ({ date: h.capturedAt.toISOString(), price: h.price }))}
        />
        <ul className="mt-4 divide-y divide-line text-sm">
          {[...p.history].reverse().map((h) => (
            <li key={h.id} className="flex justify-between py-1.5">
              <span className="text-muted">{h.capturedAt.toLocaleString("es-CR")}</span>
              <span className="font-medium">{formatPrice(h.price)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
