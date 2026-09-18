import { useStoreNames } from '../../hooks/useStoreNames';

/** Renders a store's NAME for a stored store code (never the code itself). */
export default function StoreName({ code }: { code?: string | null }) {
  const { storeName } = useStoreNames();
  return <>{code ? storeName(code) : '—'}</>;
}
