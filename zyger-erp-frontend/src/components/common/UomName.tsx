import { useUomNames } from '../../hooks/useUomNames';

/** Renders a UOM's NAME for a stored UOM value (never the master code). */
export default function UomName({ value }: { value?: string | null }) {
  const { uomName } = useUomNames();
  return <>{value ? uomName(value) : ''}</>;
}
