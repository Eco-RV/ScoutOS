import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { droppedBy, formatPrice, formatStorage, storeDiscountPct, timeAgo } from "@/lib/format";
import { STORES, storeName } from "@/lib/scrapers";

export const dynamic = "force-dynamic";

type Search = Record<string, string | undefined>;

const SORTS: Record<string, string> = {
  price_asc: "Precio: menor a mayor",
  price_desc: "Precio: mayor a menor",
  discount: "Mayor descuento",
  recent: "Actualizados recientemente",
};

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const where: Prisma.ProductWhereInput = {
    ...(sp.q && { title: { contains: sp.q } }),
    ...(sp.store && { store: sp.store }),
    ...(sp.brand && { brand: sp.brand }),
    ...(sp.ram && { ramGb: { gte: Number(sp.ram) } }),
    ...(sp.max && { currentPrice: { lte: Number(sp.max) } }),
    ...(sp.stock === "1" && { inStock: true }),
  };

  let products = await prisma.product.findMany({
    where,
    orderBy:
      sp.sort === "price_desc" ? { currentPrice: "desc" }
      : sp.sort === "recent" ? { updatedAt: "desc" }
      : { currentPrice: "asc" },
  });
  if (sp.deals === "1") products = products.filter((p) => storeDiscountPct(p) > 0 || droppedBy(p) > 0);
  if (sp.sort === "discount") products.sort((a, b) => storeDiscountPct(b) - storeDiscountPct(a));

  const [brands, total, lastRun] = await Promise.all([
    prisma.product.findMany({ distinct: ["brand"], select: { brand: true }, where: { brand: { not: null } } }),
    prisma.product.count(),
    prisma.source.findFirst({ orderBy: { lastRunAt: "desc" }, select: { lastRunAt: true } }),
  ]);

  if (!total) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold">Todavía no hay laptops</h1>
        <p className="mt-2 text-muted">Agrega el link de un producto o de una categoría de laptops para empezar.</p>
        <Link href="/sources" className="btn mt-6 inline-block">Agregar un link</Link>
      </div>
    );
  }

  const deals = products.filter((p) => storeDiscountPct(p) > 0 || droppedBy(p) > 0).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Laptops</h1>
          <p className="text-sm text-muted">
            {products.length} de {total} · {deals} en rebaja · última actualización {timeAgo(lastRun?.lastRunAt)}
          </p>
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-3">
        <input name="q" defaultValue={sp.q} placeholder="Buscar modelo, CPU…" className="input min-w-48 flex-1" />
        <select name="store" defaultValue={sp.store ?? ""} className="input">
          <option value="">Todas las tiendas</option>
          {STORES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="brand" defaultValue={sp.brand ?? ""} className="input">
          <option value="">Todas las marcas</option>
          {brands.map((b) => <option key={b.brand} value={b.brand!}>{b.brand}</option>)}
        </select>
        <select name="ram" defaultValue={sp.ram ?? ""} className="input">
          <option value="">RAM</option>
          {[8, 16, 32].map((r) => <option key={r} value={r}>{r} GB o más</option>)}
        </select>
        <input name="max" type="number" defaultValue={sp.max} placeholder="Precio máx. ₡" className="input w-36" />
        <select name="sort" defaultValue={sp.sort ?? "price_asc"} className="input">
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="deals" value="1" defaultChecked={sp.deals === "1"} /> Solo rebajas
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="stock" value="1" defaultChecked={sp.stock === "1"} /> Con stock
        </label>
        <button className="btn">Filtrar</button>
        <Link href="/" className="text-sm text-muted hover:text-foreground">Limpiar</Link>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => {
          const pct = storeDiscountPct(p);
          const drop = droppedBy(p);
          const chips = [
            p.cpu,
            p.ramGb && `${p.ramGb} GB RAM`,
            p.storageGb && `${formatStorage(p.storageGb)}${p.storageType ? ` ${p.storageType}` : ""}`,
            p.screenIn && `${p.screenIn}"`,
            p.gpu,
          ].filter(Boolean) as string[];
          return (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="group flex flex-col rounded-lg border border-line bg-surface p-3 transition hover:border-accent"
            >
              <div className="relative mb-3 flex h-40 items-center justify-center rounded bg-white">
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                )}
                {pct > 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-deal px-1.5 py-0.5 text-xs font-semibold text-white">
                    -{pct}%
                  </span>
                )}
                {!p.inStock && (
                  <span className="absolute right-1.5 top-1.5 rounded bg-neutral-700 px-1.5 py-0.5 text-xs text-white">Agotado</span>
                )}
              </div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted">{storeName(p.store)}</div>
              <h2 className="mt-0.5 line-clamp-2 text-sm font-medium group-hover:text-accent">{p.title}</h2>
              <div className="mt-2 flex flex-wrap gap-1">
                {chips.map((c) => (
                  <span key={c} className="rounded bg-background px-1.5 py-0.5 text-xs text-muted">{c}</span>
                ))}
              </div>
              <div className="mt-auto pt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold">{formatPrice(p.currentPrice)}</span>
                  {p.listPrice && p.listPrice > p.currentPrice && (
                    <span className="text-sm text-muted line-through">{formatPrice(p.listPrice)}</span>
                  )}
                </div>
                {drop > 0 && (
                  <div className="mt-1 inline-block rounded bg-deal-bg px-1.5 py-0.5 text-xs font-medium text-deal">
                    Bajó {formatPrice(drop)} desde la última revisión
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
