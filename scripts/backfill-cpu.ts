// Fills cpuBrand / cpuGen for laptops saved before those columns existed. Run: npx tsx scripts/backfill-cpu.ts
import { prisma } from "../lib/db";
import { parseCpu } from "../lib/cpu";

async function main() {
  const products = await prisma.product.findMany({ select: { id: true, cpu: true } });
  let updated = 0;
  for (const p of products) {
    const info = parseCpu(p.cpu);
    await prisma.product.update({ where: { id: p.id }, data: info });
    if (info.cpuBrand) updated++;
  }
  console.log(`${products.length} laptops revisadas, ${updated} con procesador reconocido`);
}

main().finally(() => prisma.$disconnect());
