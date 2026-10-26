import { decodeEntities } from "@/lib/scrapers/http";

export interface LaptopSpecs {
  cpu?: string;
  ramGb?: number;
  storageGb?: number;
  storageType?: string;
  screenIn?: number;
  gpu?: string;
}

const clean = (s: string) =>
  decodeEntities(s).replace(/[®™©]/g, "").replace(/\(R\)|\(TM\)/gi, "").replace(/\s+/g, " ");

const CPU_PATTERNS = [
  /\bCore\s*Ultra\s*\d\s*\w*/i,
  /\b(?:Core\s*)?i[3579][\s-]*\d{3,5}[A-Z]{0,2}\d?\b/i, // "i5-1340U", "i7 1165G7"
  /\bCore\s*i[3579]\b/i,
  /\bCore\s*[357]\s*\d{3}[A-Z]{0,2}\b/i,
  /\bCore\s*[357]\b/i,
  /\bCi[3579]\b/i,
  /\bRyzen\s*AI\s*(?:Max\+?|[579])(?:\s*(?:HX|PRO))?(?:\s*\d{3}\w*)?/i,
  /\bRyzen\s*[3579]\s*\d{4}[A-Z]{0,3}\b/i,
  /\bRyzen\s*[3579]\b/i,
  /\bApple\s*M[1-5](?:\s*(?:Pro|Max|Ultra))?\b/i,
  /\bM[1-5]\s*(?:Pro|Max|Ultra)?\b(?=.*mac)/i,
  /\bA1[89]\s*Pro\b/i,
  /\bSnapdragon\s*X\s*\w*(?:\s*\w+)?/i,
  /\b(?:Celeron|Pentium(?:\s*Silver|\s*Gold)?|Athlon(?:\s*Silver|\s*Gold)?)\s*\w*\d\w*/i,
  /\bIntel\s*N\d{2,3}\b|\bN[12]\d{2}\b/,
  /\bAMD\s*\d{4}[a-z]\b/i, // "AMD 3020e"
  /\bR[3579][\s-]\d{4}[A-Z]{0,2}\b/, // "R5-5625U" shorthand
];

const GPU_PATTERNS = [
  /\b(?:GeForce\s*)?RTX\s*\d{4}\s*(?:Ti|Super)?\b/i,
  /\b(?:GeForce\s*)?GTX\s*\d{3,4}\s*(?:Ti)?\b/i,
  /\bRadeon\s*(?:RX\s*)?\d{3,4}M?\w*/i,
  /\bIntel\s*Arc\s*\w*\d*\w*/i,
];

// "16GB/256GB", "8GB 512GB", "8GB – 512GB": RAM first, storage second.
const RAM_THEN_STORAGE = /\b(\d{1,2})\s*GB\s*[\s\/–-]+\s*(\d{2,4}|[124])\s*(GB|TB)\b/i;

function first(patterns: RegExp[], text: string): string | undefined {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[0].replace(/\s+/g, " ").trim();
  }
  return undefined;
}

/** Find a spec value by label, e.g. "Memoria RAM" / "RAM". */
function spec(specs: Record<string, string>, label: RegExp, withLabel = false): string | undefined {
  for (const [k, v] of Object.entries(specs)) if (label.test(k)) return clean(withLabel ? `${v} ${k}` : v);
  return undefined;
}

const toGb = (n: number, unit: string) => (/tb/i.test(unit) ? Math.round(n * 1024) : Math.round(n));

function parseRam(text: string): number | undefined {
  const m =
    text.match(/(\d{1,3})\s*GB\s*(?:de\s*)?(?:memoria\s*)?(?:RAM|(?:LP)?DDR\d\w*|unificada)/i) ??
    text.match(/(?:RAM|memoria)\s*(?:de\s*)?:?\s*(\d{1,3})\s*GB/i) ??
    text.match(RAM_THEN_STORAGE) ??
    text.match(/\b(\d{1,2})\s*GB\s*[-–,]\s*(?:RTX|GTX)/i); // "16GB – RTX 5070"
  const n = m ? Number(m[1]) : NaN;
  return n >= 2 && n <= 256 ? n : undefined;
}

function parseStorage(text: string): { gb?: number; type?: string } {
  const m =
    text.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB)\s*(?:de\s*)?(?:almacenamiento\s*)?(SSD|HDD|eMMC|NVMe|UFS)/i) ??
    text.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB)?\s*-?\s*(SSD|HDD|eMMC)/i);
  if (m) {
    const n = Number(m[1].replace(",", "."));
    const unit = m[2] ?? (n <= 8 ? "TB" : "GB");
    return { gb: toGb(n, unit), type: m[3].toUpperCase() === "NVME" ? "SSD" : m[3].toUpperCase() };
  }
  const r = text.match(/(?:SSD|HDD|eMMC)\s*(?:de\s*)?(\d+)\s*(TB|GB)/i);
  if (r) return { gb: toGb(Number(r[1]), r[2]), type: r[0].match(/SSD|HDD|eMMC/i)![0].toUpperCase() };
  const s = text.match(RAM_THEN_STORAGE);
  if (s) return { gb: toGb(Number(s[2]), s[3]) };
  return {};
}

function parseScreen(text: string): number | undefined {
  const m =
    text.match(/(\d{2}(?:[.,]\d{1,2})?)\s*(?:"|”|″|''|pulgadas|pulg\.?|in\b|inch)/i) ??
    text.match(/pantalla\s*(?:de\s*)?(\d{2}(?:[.,]\d)?)/i);
  const n = m ? Number(m[1].replace(",", ".")) : NaN;
  return n >= 10 && n <= 19 ? n : undefined;
}

/**
 * Pull normalized laptop specs out of the title plus the store's spec table.
 * The title wins when it has the value; the spec table fills the gaps.
 */
export function parseSpecs(title: string, specs: Record<string, string> = {}): LaptopSpecs {
  const t = clean(title);
  const all = clean(`${title} | ${Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join(" | ")}`);

  const cpuField = spec(specs, /procesador|cpu|processor/i);
  const ramField = spec(specs, /^(memoria\s*)?ram$|memoria ram|^ram/i);
  // Keep the label: "SSD: 512 GB" only says it's an SSD in the label.
  const storageField = spec(specs, /almacenamiento|disco|ssd|memoria (interna|de almacenamiento)/i, true);
  const screenField = spec(specs, /pantalla|screen|display/i);
  const gpuField = spec(specs, /video|gr[aá]fic|gpu/i);

  const storage = parseStorage(t);
  const storageFromField = storageField ? parseStorage(storageField) : {};
  const storageType =
    storage.type ?? storageFromField.type ?? spec(specs, /tipo de memoria$|tipo de almacenamiento/i)?.toUpperCase();

  // Titles often shorten the CPU ("Ryzen 5"); keep the most detailed match.
  const cpuCandidates = [first(CPU_PATTERNS, t), cpuField && first(CPU_PATTERNS, cpuField)].filter(Boolean) as string[];
  const cpu = cpuCandidates.sort((a, b) => b.length - a.length)[0] ?? cpuField ?? first(CPU_PATTERNS, all);

  return {
    cpu,
    ramGb: parseRam(t) ?? (ramField ? Number(ramField.match(/\d+/)?.[0]) || undefined : undefined) ?? parseRam(all),
    storageGb: storage.gb ?? storageFromField.gb ?? parseStorage(all).gb,
    storageType: storageType?.match(/SSD|HDD|EMMC|UFS/)?.[0],
    screenIn: parseScreen(t) ?? (screenField ? parseScreen(screenField + '"') : undefined),
    gpu: first(GPU_PATTERNS, t) ?? (gpuField && first(GPU_PATTERNS, gpuField)) ?? first(GPU_PATTERNS, all),
  };
}
