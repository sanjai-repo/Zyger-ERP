import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { masterService } from '../services/masterService';

export interface StoreOption {
  code: string;
  name: string;
}

/**
 * Store code -> store name, everywhere the app DISPLAYS a store. The stored value stays the
 * code (stock, ledger and validation all key on it); only what the user sees changes, and the
 * code is shown solely on the Store Master screen. Reads store_master, then location_master
 * as a fallback for codes (RM-A-01 etc.) that have no store row, and finally the raw value so
 * nothing ever renders blank.
 */
export function useStoreNames() {
  const stores = useQuery({
    queryKey: ['master', 'stores'],
    queryFn: ({ signal }) => masterService.getStores(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
  const locations = useQuery({
    queryKey: ['master', 'locations'],
    queryFn: ({ signal }) => masterService.getLocations(signal).catch(() => []),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const map = useMemo(() => {
    const m: Record<string, string> = {};
    (locations.data ?? []).forEach((l: { code?: string; name?: string }) => { if (l.code) m[l.code] = l.name || l.code; });
    (stores.data ?? []).forEach((s) => { if (s.code) m[s.code] = s.name || s.code; });
    return m;
  }, [stores.data, locations.data]);

  const options = useMemo<StoreOption[]>(() => {
    const seen = new Set<string>();
    const out: StoreOption[] = [];
    [...(stores.data ?? []), ...((locations.data ?? []) as StoreOption[])].forEach((s) => {
      if (s.code && !seen.has(s.code)) { seen.add(s.code); out.push({ code: s.code, name: s.name || s.code }); }
    });
    return out;
  }, [stores.data, locations.data]);

  const storeName = useCallback(
    (code?: string | null) => (code ? map[code] ?? code : ''),
    [map],
  );

  return { storeName, options, map };
}
