import { useUomNames } from '../../hooks/useUomNames';

interface Props {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** UOM picker: shows the UOM name, keeps the master code as the stored value. */
export default function UomSelect({ value, onChange, disabled, className = 'in', style }: Props) {
  const { options, uomName } = useUomNames();
  const known = options.some((o) => o.code === value);
  return (
    <select className={className} style={style} disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">-- UOM --</option>
      {value && !known && <option value={value}>{uomName(value)}</option>}
      {options.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
    </select>
  );
}
