/**
 * Copia los datos de una base SQLite antigua (prisma/dev.db) a la base PostgreSQL
 * apuntada por DATABASE_URL. Solo lectura sobre SQLite; se niega a correr si
 * PostgreSQL ya tiene productos.
 *
 * Uso:  npx tsx scripts/sqlite-to-postgres.ts [ruta/al/dev.db]
 */
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";

const file = process.argv[2] ?? "prisma/dev.db";
const sqlite = new DatabaseSync(file, { readOnly: true });
const prisma = new PrismaClient();

type Row = Record<string, unknown>;
const rows = (table: string): Row[] => sqlite.prepare(`SELECT * FROM "${table}"`).all() as Row[];

// Prisma guarda DateTime en SQLite como milisegundos (entero) o como texto ISO.
const date = (v: unknown): Date | null => (v == null ? null : new Date(typeof v === "number" || /^\d+$/.test(String(v)) ? Number(v) : String(v)));
const bool = (v: unknown) => Number(v) === 1 || v === true;
const dates = (r: Row, ...keys: string[]) => Object.fromEntries(keys.map((k) => [k, date(r[k])]));

async function copy(name: string, data: object[], create: (d: never) => Promise<{ count: number }>) {
  const chunk = 500;
  let n = 0;
  for (let i = 0; i < data.length; i += chunk) n += (await create(data.slice(i, i + chunk) as never)).count;
  console.log(`${name}: ${n}/${data.length}`);
}

async function main() {
  if ((await prisma.product.count()) > 0) throw new Error("PostgreSQL ya tiene productos; no se copia nada.");

  await copy("Source", rows("Source").map((r) => ({ ...r, active: bool(r.active), ...dates(r, "lastRunAt", "createdAt") })), (d) => prisma.source.createMany({ data: d }));
  await copy("Product", rows("Product").map((r) => ({ ...r, inStock: bool(r.inStock), ...dates(r, "createdAt", "updatedAt") })), (d) => prisma.product.createMany({ data: d }));
  await copy("Comparison", rows("Comparison").map((r) => ({ ...r, ...dates(r, "createdAt", "updatedAt") })), (d) => prisma.comparison.createMany({ data: d }));
  await copy("ComparisonItem", rows("ComparisonItem") as never[], (d) => prisma.comparisonItem.createMany({ data: d }));
  await copy("PriceHistory", rows("PriceHistory").map((r) => ({ ...r, ...dates(r, "capturedAt") })), (d) => prisma.priceHistory.createMany({ data: d }));
  await copy("Favorite", rows("Favorite").map((r) => ({ ...r, ...dates(r, "createdAt") })), (d) => prisma.favorite.createMany({ data: d }));

  // Los ids se copiaron tal cual: alinear las secuencias para que los nuevos inserts no choquen.
  for (const t of ["Source", "Product", "Comparison", "PriceHistory", "Favorite"]) {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 1), (SELECT COUNT(*) > 0 FROM "${t}"))`);
  }
  console.log("Listo.");
}

main().finally(() => prisma.$disconnect());
