import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { brandKey, canonicalBrand } from "@/lib/brands";
import { droppedBy, formatPrice, formatStorage, storeDiscountPct, timeAgo } from "@/lib/format";
import { priceDropSince } from "@/lib/history";
import { textWhere } from "@/lib/search";
import { conditionOf, hasDedicatedGpu, isScreenBucket, SCREEN_RANGES } from "@/lib/laptop-filters";
import { hrefWith, valuesOf, type RawParams } from "@/lib/query";
import { STORES, storeName } from "@/lib/scrapers";
import ActiveFilters from "@/components/ActiveFilters";
import CheckboxFilter from "@/components/CheckboxFilter";
import CompareGrid from "@/components/CompareGrid";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

type Search = RawParams;

const SORTS: Record<string, string> = {
  price_asc: "Precio: menor a mayor",
  price_desc: "Precio: mayor a menor",
  discount: "Mayor descuento de la tienda",
  drop: "Mayor bajada desde el primer precio",
  recent: "Actualizados recientemente",
};

const STORAGE_OPTIONS = [128, 256, 512, 1024];
const RAM_OPTIONS = [8, 16, 32];

// One-tap filters built from what the data actually has (see the counts in the README analysis).
const QUICK = [
  { key: "cond", value: "nueva", label: "Nuevas" },
  { key: "cond", value: "usada", label: "Usadas" },
  { key: "gpu", value: "1", label: "Gráfica dedicada" },
  { key: "ram", value: "16", label: "16 GB o más" },
  { key: "storage", value: "512", label: "512 GB o más" },
  { key: "drop", value: "1", label: "Bajaron de precio" },
  { key: "max", value: "250000", label: "Hasta ₡250 000" },
] as const;

const CPU_GROUP_ORDER = ["Intel", "AMD", "Apple", "Qualcomm"];

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const raw = await searchParams;
  // Repeated params (?brand=a&brand=b) arrive as arrays; every other filter takes the first value.
  const sp = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  ) as Record<string, string | undefined>;
  const brandKeys = [...new Set(valuesOf(raw, "brand"))];
  // Stores the user hid: they stay out of the results. Unknown ids are ignored.
  const hideStores = [...new Set(valuesOf(raw, "hideStore"))].filter((id) => STORES.some((st) => st.id === id));
  const cpuBrands = valuesOf(raw, "cpuBrand");
  const cpuGens = valuesOf(raw, "cpuGen");
  const screen = isScreenBucket(sp.screen) ? sp.screen : undefined;

  const [brandRows, cpuRows, total, lastRun, withDrops, favRows] = await Promise.all([
    prisma.product.findMany({ distinct: ["brand"], select: { brand: true }, where: { brand: { not: null } } }),
    prisma.product.findMany({
      distinct: ["cpuBrand", "cpuGen"],
      select: { cpuBrand: true, cpuGen: true },
      where: { cpuBrand: { not: null } },
    }),
    prisma.product.count(),
    prisma.source.findFirst({ orderBy: { lastRunAt: "desc" }, select: { lastRunAt: true } }),
    // Only products seen at least twice have a previous price, so this is every observed drop.
    prisma.product.findMany({
      where: { prevPrice: { not: null } },
      include: { history: { select: { price: true, capturedAt: true }, orderBy: { capturedAt: "asc" } } },
    }),
    prisma.favorite.findMany({ select: { productId: true } }),
  ]);

  const cpuGenOptions = [...new Map(
    cpuRows.filter((r) => r.cpuGen).map((r) => [r.cpuGen!, { value: r.cpuGen!, label: r.cpuGen!, group: r.cpuBrand! }]),
  ).values()].sort(
    (a, b) =>
      CPU_GROUP_ORDER.indexOf(a.group) - CPU_GROUP_ORDER.indexOf(b.group) ||
      a.label.localeCompare(b.label, "es", { numeric: true }),
  );
  const cpuBrandOptions = [...new Set(cpuRows.map((r) => r.cpuBrand!))]
    .sort((a, b) => CPU_GROUP_ORDER.indexOf(a) - CPU_GROUP_ORDER.indexOf(b))
    .map((v) => ({ value: v, label: v }));

  // "LENOVO", "Lenovo" and "Laptops usadas lenovo" are one option; selecting it matches every spelling in the DB.
  const spellings = new Map<string, string[]>();
  for (const { brand } of brandRows) {
    if (!brand) continue;
    const key = brandKey(brand);
    spellings.set(key, [...(spellings.get(key) ?? []), brand]);
  }
  const brandOptions = [...spellings.keys()]
    .map((key) => ({ value: key, label: canonicalBrand(key) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const priceRange = {
    ...(sp.min && { gte: Number(sp.min) }),
    ...(sp.max && { lte: Number(sp.max) }),
  };

  const where: Prisma.ProductWhereInput = {
    ...textWhere(sp.q),
    ...(hideStores.length > 0 && { store: { notIn: hideStores } }),
    ...(brandKeys.length > 0 && { brand: { in: brandKeys.flatMap((k) => spellings.get(k) ?? []) } }),
    ...(cpuBrands.length > 0 && { cpuBrand: { in: cpuBrands } }),
    ...(cpuGens.length > 0 && { cpuGen: { in: cpuGens } }),
    ...(sp.ram && { ramGb: { gte: Number(sp.ram) } }),
    ...(sp.storage && { storageGb: { gte: Number(sp.storage) } }),
    ...(screen && { screenIn: SCREEN_RANGES[screen].range }),
    ...(Object.keys(priceRange).length > 0 && { currentPrice: priceRange }),
    ...(sp.stock === "1" && { inStock: true }),
  };

  const rows = await prisma.product.findMany({
    where,
    include: {
      source: { select: { url: true } },
      history: { select: { price: true, capturedAt: true }, orderBy: { capturedAt: "asc" } },
    },
    orderBy:
      sp.sort === "price_desc" ? { currentPrice: "desc" }
      : sp.sort === "recent" ? { updatedAt: "desc" }
      : { currentPrice: "asc" },
  });

  // Filters that need JS: the condition and the drop come from the title, the source and the history.
  const items = rows.map((r) => ({
    r,
    condition: conditionOf(r.title, r.source?.url),
    drop: priceDropSince(r.history, r.currentPrice),
  }));
  let shown = items;
  if (sp.cond === "nueva" || sp.cond === "usada") shown = shown.filter((i) => i.condition === sp.cond);
  if (sp.gpu === "1") shown = shown.filter((i) => hasDedicatedGpu(i.r.gpu));
  if (sp.drop === "1") shown = shown.filter((i) => i.drop);
  if (sp.deals === "1") shown = shown.filter((i) => storeDiscountPct(i.r) > 0 || droppedBy(i.r) > 0);
  if (sp.sort === "discount") shown = [...shown].sort((a, b) => storeDiscountPct(b.r) - storeDiscountPct(a.r));
  if (sp.sort === "drop") shown = [...shown].sort((a, b) => (b.drop?.pct ?? -1) - (a.drop?.pct ?? -1));

  if (!total) {
    return (
      <div className="rise mx-auto max-w-md py-20 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Todavía no hay laptops</h1>
        <p className="font-hand mt-3 text-2xl text-accent">Pega un link y yo me encargo del resto.</p>
        <p className="mt-2 text-muted">Agrega el link de un producto o de una categoría de laptops para empezar.</p>
        <Link href="/sources" className="btn mt-6">Agregar un link</Link>
      </div>
    );
  }

  // The drops strip is global: it shows what we saw change, whatever the filters are.
  const observed = withDrops
    .flatMap((p) => {
      const drop = priceDropSince(p.history, p.currentPrice);
      return drop ? [{ p, drop }] : [];
    })
    .sort((a, b) => b.drop.pct - a.drop.pct);

  const storeDeals = shown.filter((i) => storeDiscountPct(i.r) > 0).length;
  const stats = [
    { label: "Mostrando", value: `${shown.length} de ${total}` },
    { label: "Con rebaja de la tienda", value: String(storeDeals) },
    { label: "Bajaron desde que las seguimos", value: String(observed.length) },
    { label: "Última actualización", value: timeAgo(lastRun?.lastRunAt) },
  ];

  const chips: { label: string; href: string }[] = [];
  if (sp.q) chips.push({ label: `“${sp.q}”`, href: hrefWith(raw, { q: null }) });
  for (const id of hideStores) {
    chips.push({ label: `Sin ${storeName(id)}`, href: hrefWith(raw, { hideStore: hideStores.filter((x) => x !== id) }) });
  }
  for (const k of brandKeys) chips.push({ label: canonicalBrand(k), href: hrefWith(raw, { brand: brandKeys.filter((x) => x !== k) }) });
  for (const k of cpuBrands) chips.push({ label: k, href: hrefWith(raw, { cpuBrand: cpuBrands.filter((x) => x !== k) }) });
  for (const k of cpuGens) chips.push({ label: k, href: hrefWith(raw, { cpuGen: cpuGens.filter((x) => x !== k) }) });
  if (sp.ram) chips.push({ label: `${sp.ram} GB o más`, href: hrefWith(raw, { ram: null }) });
  if (sp.storage) chips.push({ label: `${formatStorage(Number(sp.storage))} o más`, href: hrefWith(raw, { storage: null }) });
  if (sp.min || sp.max) {
    chips.push({
      label: `${sp.min ? formatPrice(Number(sp.min)) : "₡0"} – ${sp.max ? formatPrice(Number(sp.max)) : "sin tope"}`,
      href: hrefWith(raw, { min: null, max: null }),
    });
  }
  if (sp.cond) chips.push({ label: sp.cond === "usada" ? "Usadas" : "Nuevas", href: hrefWith(raw, { cond: null }) });
  if (screen) chips.push({ label: SCREEN_RANGES[screen].label, href: hrefWith(raw, { screen: null }) });
  if (sp.gpu === "1") chips.push({ label: "Gráfica dedicada", href: hrefWith(raw, { gpu: null }) });
  if (sp.drop === "1") chips.push({ label: "Bajaron de precio", href: hrefWith(raw, { drop: null }) });
  if (sp.deals === "1") chips.push({ label: "Con rebaja", href: hrefWith(raw, { deals: null }) });
  if (sp.stock === "1") chips.push({ label: "Con stock", href: hrefWith(raw, { stock: null }) });

  const products = shown.map(({ r, condition, drop }) => {
    // The client only needs the product's own fields, not its history or source rows.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { history: _history, source: _source, ...p } = r;
    return {
      ...p,
      storeLabel: storeName(p.store),
      condition,
      dropPct: drop?.pct ?? 0,
      firstPrice: drop?.first ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Costa Rica · Laptops"
        title="Laptops"
        actions={
          <Link href="/bajadas" className="btn-ghost">
            Ver historial de bajadas →
          </Link>
        }
      >
        Precios de {STORES.length} tiendas, comparados entre revisiones. Lo que bajó desde que lo seguimos aparece primero.
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="spring rounded-xl border border-line bg-surface px-4 py-3"
            style={{ "--i": i } as React.CSSProperties}
          >
            <div className="font-mono text-xl font-medium tabular-nums">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {observed.length > 0 && (
        <section aria-labelledby="drops-title" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="drops-title" className="font-display text-xl font-bold">Bajaron de precio</h2>
            <Link href="/bajadas" className="text-sm text-accent hover:underline">
              Ver las {observed.length} →
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {observed.slice(0, 4).map(({ p, drop }, i) => (
              <li key={p.id} className="rise" style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={`/products/${p.id}`}
                  className="block h-full rounded-xl border border-deal/40 bg-deal-bg/60 p-4 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-deal"
                >
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{storeName(p.store)}</span>
                    <span className="rounded-full bg-deal px-2 py-0.5 font-semibold text-on-deal">−{drop.pct}%</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-medium">{p.title}</p>
                  <p className="mt-3 font-mono text-sm tabular-nums">
                    <span className="text-muted line-through">{formatPrice(drop.first)}</span>{" "}
                    <span className="text-lg font-semibold text-deal">{formatPrice(drop.current)}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Filtros rápidos" className="flex flex-wrap gap-2">
        {QUICK.map((q) => {
          const on = raw[q.key] === q.value;
          return (
            <Link
              key={`${q.key}-${q.value}`}
              href={hrefWith(raw, { [q.key]: on ? null : q.value })}
              className={`chip ${on ? "chip--on" : ""}`}
              aria-pressed={on}
            >
              {q.label}
            </Link>
          );
        })}
      </section>

      <form className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Marca, CPU, modelo… ej. dell i7 16gb" aria-label="Buscar" className="input min-w-60 flex-1" />
          <CheckboxFilter name="brand" label="marcas" options={brandOptions} selected={brandKeys} />
          <CheckboxFilter
            name="hideStore"
            label="Ocultar tiendas"
            emptyText="Todas las tiendas"
            hint="Marca las tiendas que no quieres ver"
            options={STORES.map((st) => ({ value: st.id, label: st.name }))}
            selected={hideStores}
          />
          <input name="min" type="number" defaultValue={sp.min} placeholder="Precio mín. ₡" aria-label="Precio mínimo" className="input w-36" />
          <input name="max" type="number" defaultValue={sp.max} placeholder="Precio máx. ₡" aria-label="Precio máximo" className="input w-36" />
          <select name="sort" defaultValue={sp.sort ?? "price_asc"} aria-label="Orden" className="input">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn">Filtrar</button>
          <Link href="/" className="text-sm text-muted hover:text-foreground">Limpiar</Link>
        </div>

        <details className="group">
          <summary className="cursor-pointer select-none text-sm font-medium text-accent">Más filtros</summary>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CheckboxFilter name="cpuBrand" label="procesador" options={cpuBrandOptions} selected={cpuBrands} />
            <CheckboxFilter name="cpuGen" label="generación" options={cpuGenOptions} selected={cpuGens} />
            <select name="ram" defaultValue={sp.ram ?? ""} aria-label="Memoria RAM" className="input">
              <option value="">RAM</option>
              {RAM_OPTIONS.map((r) => <option key={r} value={r}>{r} GB o más</option>)}
            </select>
            <select name="storage" defaultValue={sp.storage ?? ""} aria-label="Almacenamiento" className="input">
              <option value="">Almacenamiento</option>
              {STORAGE_OPTIONS.map((gb) => <option key={gb} value={gb}>{formatStorage(gb)} o más</option>)}
            </select>
            <select name="cond" defaultValue={sp.cond ?? ""} aria-label="Condición" className="input">
              <option value="">Nueva y usada</option>
              <option value="nueva">Solo nuevas</option>
              <option value="usada">Solo usadas</option>
            </select>
            <select name="screen" defaultValue={screen ?? ""} aria-label="Tamaño de pantalla" className="input">
              <option value="">Cualquier pantalla</option>
              {Object.entries(SCREEN_RANGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <label className="flex items-center gap-1.5"><input type="checkbox" name="gpu" value="1" defaultChecked={sp.gpu === "1"} /> Gráfica dedicada</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" name="drop" value="1" defaultChecked={sp.drop === "1"} /> Bajaron de precio</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" name="deals" value="1" defaultChecked={sp.deals === "1"} /> Con rebaja de la tienda</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" name="stock" value="1" defaultChecked={sp.stock === "1"} /> Con stock</label>
          </div>
        </details>
      </form>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <span>
            {shown.length} {shown.length === 1 ? "laptop" : "laptops"}
            {lastRun?.lastRunAt && <> · última actualización {timeAgo(lastRun.lastRunAt)}</>}
          </span>
        </div>
        <ActiveFilters chips={chips} />
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-muted">
          Ninguna laptop cumple estos filtros. Prueba quitando alguno.
        </div>
      ) : (
        <CompareGrid products={products} favoriteIds={favRows.map((f) => f.productId)} />
      )}
    </div>
  );
}
