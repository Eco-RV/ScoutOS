const KNOWN: Record<string, string> = {
  acer: "Acer",
  apple: "Apple",
  asus: "ASUS",
  dell: "Dell",
  gigabyte: "Gigabyte",
  hp: "HP",
  huawei: "Huawei",
  lenovo: "Lenovo",
  lg: "LG",
  microsoft: "Microsoft",
  msi: "MSI",
  razer: "Razer",
  samsung: "Samsung",
};

// Words stores add around the brand ("Laptops usadas dell", "CPUMINI usadas HP").
const NOISE = /\b(laptops?|usadas?|usados?|recertificad[oa]s?|cpumini)\b/g;

/**
 * Key that groups one brand written many ways: "LENOVO", "Lenovo" and "Laptops usadas lenovo" are one key.
 * A known brand anywhere in the text wins; otherwise the store's extra words are stripped.
 */
export function brandKey(b: string): string {
  const s = b.trim().toLowerCase();
  const known = Object.keys(KNOWN).find((k) => new RegExp(`\b${k}\b`).test(s));
  if (known) return known;
  return s.replace(NOISE, "").replace(/\s+/g, " ").trim() || s;
}

/** Display name: known brands get their official casing, the rest get a capitalized first letter. */
export function canonicalBrand(b: string): string {
  const key = brandKey(b);
  return KNOWN[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}
