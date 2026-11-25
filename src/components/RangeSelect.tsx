// Liste déroulante de portée en mètres (soi-même, contact, 9 m…), utilisée pour les attaques et les sorts.
const RANGES = [0, 1.5, 3, 4.5, 9, 18, 24, 27, 30, 36, 45, 90, 150];

export function RangeSelect({ id, value, onChange, allowSelf = true }: { id: string; value: number; onChange: (v: number) => void; allowSelf?: boolean }) {
  const opts = RANGES.filter((r) => allowSelf || r > 0);
  if (!opts.includes(value)) opts.push(value);
  return (
    <select id={id} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} aria-label="Portée">
      {opts
        .sort((a, b) => a - b)
        .map((r) => (
          <option key={r} value={r}>
            {r === 0 ? 'Soi-même' : r === 1.5 ? 'Contact (1,5 m)' : `${String(r).replace('.', ',')} m`}
          </option>
        ))}
    </select>
  );
}
