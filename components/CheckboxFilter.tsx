/** Dropdown of checkboxes for a multi-value filter. Works without JS: the form submits repeated params. */
export default function CheckboxFilter({
  name,
  label,
  options,
  selected,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
}) {
  return (
    <details className="relative">
      <summary className="input cursor-pointer list-none">
        {selected.length > 0 ? `${label} (${selected.length})` : `Todos: ${label}`}
      </summary>
      <div className="absolute z-10 mt-1 max-h-72 w-64 overflow-y-auto rounded-md border border-line bg-surface p-2 shadow-lg">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-background">
            <input type="checkbox" name={name} value={o.value} defaultChecked={selected.includes(o.value)} />
            {o.label}
          </label>
        ))}
        {options.length === 0 && <p className="px-1.5 py-1 text-sm text-muted">Sin opciones todavía</p>}
      </div>
    </details>
  );
}
