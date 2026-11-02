import Link from "next/link";

/** Filters in use, each one removable with its own link. Works without JS. */
export default function ActiveFilters({ chips }: { chips: { label: string; href: string }[] }) {
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Filtros activos" className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <li key={`${c.label}-${c.href}`}>
          <Link href={c.href} className="chip chip--on pr-2" aria-label={`Quitar filtro ${c.label}`}>
            {c.label}
            <span aria-hidden="true" className="text-base leading-none opacity-70">×</span>
          </Link>
        </li>
      ))}
      <li>
        <Link href="/" className="text-sm text-muted hover:text-foreground">Quitar todos</Link>
      </li>
    </ul>
  );
}
