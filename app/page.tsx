import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { brandKey, canonicalBrand } from "@/lib/brands";
import { droppedBy, formatStorage, storeDiscountPct, timeAgo } from "@/lib/format";
import { STORES, storeName } from "@/lib/scrapers";
import CheckboxFilter from "@/components/CheckboxFilter";
import CompareGrid from "@/components/CompareGrid";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

const SORTS: Record<string, string> = {
  price_asc: "Precio: menor a mayor",
  price_desc: "Precio: mayor a menor",
  discount: "Mayor descuento",
  recent: "Actualizados recientemente",
};

const STORAGE_OPTIONS = [128, 256, 512, 1024];

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const raw = await searchParams;
  // Repeated params (?brand=a&brand=b) arrive as arrays; every other filter takes the first value.
  const sp = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  ) as Record<string, string | undefined>;
  const brandKeys = ([] as string[]).concat(raw.brand ?? []);
  const cpuBrands = ([] as string[]).concat(raw.cpuBrand ?? []);
  const cpuGens = ([] as string[]).concat(raw.cpuGen ?? []);

  const [brandRows, cpuRows, total, lastRun] = await Promise.all([
    prisma.product.findMany({ distinct: ["brand"], select: { brand: true }, where: { brand: { not: null } } }),
    prisma.product.findMany({
      distinct: ["cpuBrand", "cpuGen"],
      select: { cpuBrand: true, cpuGen: true },
      where: { cpuBrand: { not: null } },
    }),
    prisma.product.count(),
    prisma.source.findFirst({ orderBy: { lastRunAt: "desc" }, select: { lastRunAt: true } }),
  ]);

  const cpuBrandOptions = [...new Set(cpuRows.map((r) => r.cpuBrand!))]
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }));
  const cpuGenOptions = [...new Set(cpuRows.map((r) => r.cpuGen).filter((g): g is string => !!g))]
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true }))
    .map((v) => ({ value: v, label: v }));

  // "LENOVO" and "Lenovo" are one option; selecting it matches every spelling stored in the DB.
  const spellings = new Map<string, string[]>();
  for (const { brand } of brandRows) {
    if (!brand) continue;
    const key = brandKey(brand);
    spellings.set(key, [...(spellings.get(key) ?? []), brand]);
  }
  const brandOptions = [...spellings.keys()]
    .map((key) => ({ key, label: canonicalBrand(key) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const priceRange = {
    ...(sp.min && { gte: Number(sp.min) }),
    ...(sp.max && { lte: Number(sp.max) }),
  };

  const where: Prisma.ProductWhereInput = {
    ...(sp.q && { title: { contains: sp.q } }),
    ...(sp.store && { store: sp.store }),
    ...(brandKeys.length > 0 && { brand: { in: brandKeys.flatMap((k) => spellings.get(k) ?? []) } }),
    ...(cpuBrands.length > 0 && { cpuBrand: { in: cpuBrands } }),
    ...(cpuGens.length > 0 && { cpuGen: { in: cpuGens } }),
    ...(sp.ram && { ramGb: { gte: Number(sp.ram) } }),
    ...(sp.storage && { storageGb: { gte: Number(sp.storage) } }),
    ...(Object.keys(priceRange).length > 0 && { currentPrice: priceRange }),
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
        <CheckboxFilter
          name="brand"
          label="marcas"
          options={brandOptions.map((b) => ({ value: b.key, label: b.label }))}
          selected={brandKeys}
        />
        <CheckboxFilter name="cpuBrand" label="procesador" options={cpuBrandOptions} selected={cpuBrands} />
        <CheckboxFilter name="cpuGen" label="generación" options={cpuGenOptions} selected={cpuGens} />
        <select name="ram" defaultValue={sp.ram ?? ""} className="input">
          <option value="">RAM</option>
          {[8, 16, 32].map((r) => <option key={r} value={r}>{r} GB o más</option>)}
        </select>
        <select name="storage" defaultValue={sp.storage ?? ""} className="input">
          <option value="">Almacenamiento</option>
          {STORAGE_OPTIONS.map((gb) => <option key={gb} value={gb}>{formatStorage(gb)} o más</option>)}
        </select>
        <input name="min" type="number" defaultValue={sp.min} placeholder="Precio mín. ₡" className="input w-36" />
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

      <CompareGrid products={products.map((p) => ({ ...p, storeLabel: storeName(p.store) }))} />
    </div>
  );
}
