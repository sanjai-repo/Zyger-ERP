import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { masterService } from '../services/masterService';

export interface UomOption {
  code: string;
  name: string;
}

/**
 * UOM value -> UOM name, for DISPLAY only. Documents store either the master code
 * (UOM-2026-0001) or a legacy short form (NOS / KG), so the lookup matches the code first and
 * then the name, case-insensitively, and falls back to the raw value so nothing renders blank.
 * The stored value is never changed; the code is only shown on the UOM master screen.
 */
export function useUomNames() {
  const query = useQuery({
    queryKey: ['master', 'uoms'],
    queryFn: ({ signal }) => masterService.getUoms(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const { byCode, byName } = useMemo(() => {
    const c = new Map<string, string>();
    const n = new Map<string, string>();
    (query.data ?? []).forEach((u: { code?: string; name?: string }) => {
      if (!u.code) return;
      const name = u.name || u.code;
      c.set(u.code.toLowerCase(), name);
      n.set(name.toLowerCase(), name);
    });
    return { byCode: c, byName: n };
  }, [query.data]);

  const uomName = useCallback(
    (value?: string | null) => {
      if (!value) return '';
      const key = String(value).toLowerCase();
      return byCode.get(key) ?? byName.get(key) ?? String(value);
    },
    [byCode, byName],
  );

  const options = useMemo<UomOption[]>(
    () => (query.data ?? []).filter((u: { code?: string }) => u.code).map((u: { code?: string; name?: string }) => ({ code: u.code as string, name: u.name || (u.code as string) })),
    [query.data],
  );

  return { uomName, options };
}
