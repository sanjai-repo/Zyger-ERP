/**
 * IndexedDB-based offline queue for shop-floor data entry.
 * Stores inspection measurements and breakdown intimations while offline,
 * then syncs them to the server when connectivity returns.
 */

const DB_NAME = 'zyger-erp-offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'pending-sync';

export interface OfflineEntry {
  id: string;
  type: 'inspection-measurement' | 'breakdown-intimation' | 'production-entry' | 'idle-time' | 'production-log';
  endpoint: string;
  method: 'POST' | 'PUT';
  body: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(entry: Omit<OfflineEntry, 'id' | 'createdAt' | 'attempts'>): Promise<OfflineEntry> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const record: OfflineEntry = {
      ...entry,
      id: `${entry.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    const req = store.add(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPending(): Promise<OfflineEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removeEntry(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function syncPendingEntries(
  fetchFn: (url: string, opts: RequestInit) => Promise<Response>
): Promise<{ synced: number; failed: number }> {
  const entries = await getAllPending();
  let synced = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      const resp = await fetchFn(entry.endpoint, {
        method: entry.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.body),
      });

      if (resp.ok) {
        await removeEntry(entry.id);
        synced++;
      } else if (resp.status >= 400 && resp.status < 500) {
        // Client error — don't retry, remove to avoid infinite loop
        await removeEntry(entry.id);
        failed++;
      }
      // Server error (5xx) — keep in queue for retry
    } catch {
      // Network error — keep in queue
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Start background sync when online.
 * Calls the server's queued endpoints to replay stored entries.
 */
export function startBackgroundSync(fetchFn: (url: string, opts: RequestInit) => Promise<Response>) {
  if (!navigator.onLine) return;

  const syncOnce = async () => {
    const count = await getPendingCount();
    if (count === 0) return;
    await syncPendingEntries(fetchFn);
  };

  // Sync on reconnect
  window.addEventListener('online', syncOnce);

  // Periodic sync every 30s if online
  const interval = setInterval(() => {
    if (navigator.onLine) syncOnce();
  }, 30000);

  return () => {
    window.removeEventListener('online', syncOnce);
    clearInterval(interval);
  };
}
