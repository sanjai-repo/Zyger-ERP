import { useStoreNames } from '../../hooks/useStoreNames';

interface Props {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}

/** Store picker: shows the store NAME, keeps the store CODE as the stored value. */
export default function StoreSelect({ value, onChange, disabled, className = 'in', placeholder = '-- Select Store --', style }: Props) {
  const { options, storeName } = useStoreNames();
  const known = options.some((o) => o.code === value);
  return (
    <select className={className} style={style} disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {value && !known && <option value={value}>{storeName(value)}</option>}
      {options.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
    </select>
  );
}
