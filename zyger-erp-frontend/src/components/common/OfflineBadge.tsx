import { useState, useEffect, useCallback } from 'react';
import { getPendingCount, syncPendingEntries } from '../../utils/offlineQueue';

interface OfflineBadgeProps {
  fetchFn: (url: string, opts: RequestInit) => Promise<Response>;
}

/**
 * Shows a floating badge with pending sync count when offline entries exist.
 * Auto-syncs when the browser comes back online.
 */
export default function OfflineBadge({ fetchFn }: OfflineBadgeProps) {
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const c = await getPendingCount();
      setCount(c);
    } catch {
      // IndexedDB not available
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const handleOnline = async () => {
      setSyncing(true);
      await syncPendingEntries(fetchFn);
      await refreshCount();
      setSyncing(false);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchFn, refreshCount]);

  if (count === 0 && !syncing) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 8,
        background: syncing
          ? 'linear-gradient(135deg, #1e1e2e, #313244)'
          : navigator.onLine
          ? 'rgba(166, 227, 161, 0.15)'
          : 'rgba(243, 139, 168, 0.15)',
        border: `1px solid ${syncing ? '#585b70' : navigator.onLine ? '#a6e3a1' : '#f38ba8'}`,
        color: syncing ? '#cdd6f4' : navigator.onLine ? '#a6e3a1' : '#f38ba8',
        fontSize: 12,
        fontWeight: 600,
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'all 0.2s ease',
      }}
    >
      <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
        {syncing ? 'sync' : navigator.onLine ? 'cloud_upload' : 'cloud_off'}
      </span>
      {syncing ? (
        <span>Syncing {count} entries...</span>
      ) : (
        <span>
          {navigator.onLine ? 'Online' : 'Offline'} • {count} pending sync{count !== 1 ? 's' : ''}
        </span>
      )}
      {syncing && (
        <span className="material-symbols-rounded" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }}>
          autorenew
        </span>
      )}
    </div>
  );
}
