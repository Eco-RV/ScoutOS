/** Dropdown of checkboxes for a multi-value filter. Works without JS: the form submits repeated params. */
export default function CheckboxFilter({
  name,
  label,
  options,
  selected,
}: {
  name: string;
  label: string;
  options: { value: string; label: string; group?: string }[];
  selected: string[];
}) {
  // Options that carry a group (e.g. the CPU brand of a generation) are listed under a heading.
  let lastGroup: string | undefined;
  return (
    <details className="relative">
      <summary className="input cursor-pointer list-none">
        {selected.length > 0 ? `${label} (${selected.length})` : `Todos: ${label}`}
      </summary>
      <div className="dropdown-panel absolute z-20 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-line bg-surface p-2 shadow-2xl shadow-black/50">
        {options.map((o) => {
          const heading = o.group && o.group !== lastGroup ? o.group : null;
          lastGroup = o.group ?? lastGroup;
          return (
            <div key={o.value}>
              {heading && (
                <p className="px-1.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-accent">{heading}</p>
              )}
              <label className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-surface-2">
                <input type="checkbox" name={name} value={o.value} defaultChecked={selected.includes(o.value)} />
                {o.label}
              </label>
            </div>
          );
        })}
        {options.length === 0 && <p className="px-1.5 py-1 text-sm text-muted">Sin opciones todavía</p>}
      </div>
    </details>
  );
}
