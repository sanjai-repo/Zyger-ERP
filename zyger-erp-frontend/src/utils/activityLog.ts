export interface ActivityLogEntry {
  id: string;
  dateTime: string;
  module: 'Sales' | 'Purchase' | 'Inventory' | 'Quality' | 'Production' | 'Master';
  activity: string;
  refNo: string;
  party: string;
  user: string;
  status: string;
  timestamp: number;
}

const STORAGE_KEY = 'zyger_recent_activity_logs';

export function getInitialDefaultLogs(): ActivityLogEntry[] {
  return [];
}

export function getStoredActivityLogs(): ActivityLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialDefaultLogs();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getInitialDefaultLogs();
  } catch {
    return getInitialDefaultLogs();
  }
}

export function logSystemActivity(entry: {
  module: 'Sales' | 'Purchase' | 'Inventory' | 'Quality' | 'Production' | 'Master';
  activity: string;
  refNo?: string;
  party?: string;
  user?: string;
  status?: string;
  dateTime?: string;
}): ActivityLogEntry {
  const currentLogs = getStoredActivityLogs();
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = `Today, ${timeStr}`;

  const refNumber = entry.refNo || 'N/A';
  const newLog: ActivityLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    dateTime: entry.dateTime || dateStr,
    module: entry.module,
    activity: entry.activity,
    refNo: refNumber,
    party: entry.party || 'System',
    user: entry.user || 'System',
    status: entry.status || 'CREATED',
    timestamp: now.getTime(),
  };

  const filtered = currentLogs.filter(l => !refNumber || l.refNo !== refNumber);
  const updatedLogs = [newLog, ...filtered].slice(0, 50);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    window.dispatchEvent(new Event('zyger-activity-log-updated'));
  } catch (e) {
    console.error('Failed to save activity log:', e);
  }

  return newLog;
}
