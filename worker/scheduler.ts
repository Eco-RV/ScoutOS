// Re-scrapes every active link on a schedule. Run with: npm run worker
import cron from "node-cron";
import { runAllSources } from "@/lib/ingest";

const SCHEDULE = process.env.SCRAPE_CRON ?? "0 */6 * * *"; // every 6 hours

async function tick() {
  const started = new Date();
  console.log(`[${started.toISOString()}] actualizando precios...`);
  const results = await runAllSources();
  for (const r of results) {
    console.log(
      r.error
        ? `  fuente ${r.sourceId}: ERROR ${r.error}`
        : `  fuente ${r.sourceId}: ${r.found} laptops, ${r.created} nuevas, ${r.priceDrops} bajaron de precio`,
    );
  }
}

console.log(`ScoutOS worker: horario "${SCHEDULE}"`);
cron.schedule(SCHEDULE, () => void tick());
if (process.argv.includes("--now")) void tick();
