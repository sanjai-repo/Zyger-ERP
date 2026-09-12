import { useState, useEffect, useCallback } from 'react';
import { getPendingCount } from '../utils/offlineQueue';

export function usePendingSyncCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const c = await getPendingCount();
      setCount(c);
    } catch { setCount(0); }
  }, []);

  useEffect(() => { refresh(); const id = setInterval(refresh, 10000); return () => clearInterval(id); }, [refresh]);

  return count;
}
