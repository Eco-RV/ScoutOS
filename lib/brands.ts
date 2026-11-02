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

/** Key that groups the same brand written in different cases ("LENOVO" and "Lenovo"). */
export const brandKey = (b: string) => b.trim().toLowerCase();

/** Display name: known brands get their official casing, the rest get a capitalized first letter. */
export function canonicalBrand(b: string): string {
  const key = brandKey(b);
  return KNOWN[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}
