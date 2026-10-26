// Manual check: npx tsx scripts/try-scrape.ts <url> [<url>...]
import { isLaptop, storeForUrl } from "@/lib/scrapers";
import { parseSpecs } from "@/lib/specs/parse";

async function main() {
for (const raw of process.argv.slice(2)) {
  try {
    const { store, url } = storeForUrl(raw);
    const r = await store.adapter.scrape(url);
    const laptops = r.type === "product" ? r.products : r.products.filter(isLaptop);
    console.log(`\n== ${store.name} [${r.type}] ${r.products.length} productos, ${laptops.length} laptops`);
    for (const p of laptops.slice(0, 4)) {
      console.log(`- ${p.title.slice(0, 90)}\n  ₡${p.price}${p.listPrice ? ` (antes ₡${p.listPrice})` : ""} stock=${p.inStock}`, JSON.stringify(parseSpecs(p.title, p.specs)));
    }
    const rejected = r.products.filter((p) => !isLaptop(p)).map((p) => p.title.slice(0, 60));
    if (rejected.length) console.log("  descartados:", rejected.slice(0, 5));
  } catch (e) {
    console.log(`\n!! ${raw}: ${(e as Error).message}`);
  }
}
}

main();
