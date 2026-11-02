export interface CpuInfo {
  cpuBrand: string | null;
  cpuGen: string | null;
}

const GEN_LABEL = (n: number) => `Intel ${n}.ª gen`;

/**
 * Brand and generation from a CPU string as the stores write it: "Core i7-13620H",
 * "CORE i5 6200U", "Ryzen 7 7735HS", "Core Ultra 5 225H", "Apple M2".
 * Returns null where the string doesn't say (e.g. "Core i5" with no model number).
 */
export function parseCpu(cpu: string | null | undefined): CpuInfo {
  const none: CpuInfo = { cpuBrand: null, cpuGen: null };
  if (!cpu) return none;
  const t = cpu.replace(/\s+/g, " ").trim();

  const apple = t.match(/\bM([1-5])\b/i);
  if (/\bApple\b/i.test(t) || apple) {
    return { cpuBrand: "Apple", cpuGen: apple ? `Apple M${apple[1]}` : null };
  }
  if (/\bA1[89]\b/.test(t)) return { cpuBrand: "Apple", cpuGen: "Apple A-series" };
  if (/snapdragon/i.test(t)) return { cpuBrand: "Qualcomm", cpuGen: "Snapdragon X" };

  if (/ryzen|\bamd\b|\bR[3579][\s-]/i.test(t)) {
    const ai = t.match(/\bAI\s*[3579]\s*(\d{3})\b/i);
    if (ai) return { cpuBrand: "AMD", cpuGen: "AMD Ryzen AI 300" };
    const model = t.match(/(?:ryzen\s*|\bR)[3579][\s-]*(\d{4})/i);
    return { cpuBrand: "AMD", cpuGen: model ? `AMD Ryzen ${model[1][0]}000` : null };
  }

  if (/intel|core|celeron|pentium|xeon|\bci[3579]\b|\bi[3579]\b/i.test(t)) {
    if (/\bN\d{3}\b/.test(t)) return { cpuBrand: "Intel", cpuGen: "Intel N-series" };
    // Core Ultra and the newer 3-digit models: 1xx, 2xx, 3xx are the series.
    const series = t.match(/(?:ultra\s*[3579]\s*|core\s*[3579]\s*|\bi[3579]\s*[-]?\s*)(\d)\d{2}[A-Z]{0,2}\b/i);
    if (series && !/\d{4}/.test(t.match(/\d{3,}/)?.[0] ?? "")) {
      const label = /ultra/i.test(t) ? `Intel Core Ultra ${series[1]}` : `Intel Core serie ${series[1]}`;
      return { cpuBrand: "Intel", cpuGen: label };
    }
    const model = t.match(/(?:\bi[3579]|\bCi[3579]|\bI[3579]|core\s*[3579]?)[\s-]*(\d{4,5})/i);
    if (model) {
      const digits = model[1];
      // 5-digit models (10210U, 13420H) and 1xxx models (1135G7, 1260P) carry the generation in two digits.
      const gen = digits.length === 5 || digits[0] === "1" ? digits.slice(0, 2) : digits[0];
      return { cpuBrand: "Intel", cpuGen: GEN_LABEL(Number(gen)) };
    }
    return { cpuBrand: "Intel", cpuGen: null };
  }

  return none;
}
