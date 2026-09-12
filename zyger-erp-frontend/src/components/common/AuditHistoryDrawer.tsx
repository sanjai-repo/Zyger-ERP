import { useEffect, useState } from 'react';
import apiClient from '../../api/axiosClient';
import { formatDate } from '../../utils/format';

interface AuditLogEntry {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  changedBy?: string;
  changedAt: string;
}

interface AuditHistoryDrawerProps {
  open: boolean;
  entityType: string;
  entityId?: number | string;
  onClose: () => void;
}

export default function AuditHistoryDrawer({ open, entityType, entityId, onClose }: AuditHistoryDrawerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const url = entityId
      ? `/master/audit-logs?entityType=${entityType}&entityId=${entityId}`
      : `/master/audit-logs?entityType=${entityType}`;
    apiClient.get(url)
      .then((res) => setLogs(Array.isArray(res.data) ? res.data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [open, entityType, entityId]);

  if (!open) return null;

  const actionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return { icon: 'add_circle', color: 'var(--green)' };
      case 'UPDATE': return { icon: 'edit', color: 'var(--blue)' };
      case 'DELETE': return { icon: 'delete', color: 'var(--red)' };
      case 'ACTIVATE': return { icon: 'check_circle', color: 'var(--green)' };
      case 'DEACTIVATE': return { icon: 'cancel', color: 'var(--yellow)' };
      default: return { icon: 'info', color: 'var(--muted)' };
    }
  };

  return (
    <div className="mwrap" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 640, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 6 }}>history</span>
            Audit History
          </h3>
          <button className="btn btn-sm" onClick={onClose}>
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          {entityType}{entityId ? ` #${entityId}` : ''} — {logs.length} change{logs.length !== 1 ? 's' : ''} recorded
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 24, display: 'block', margin: '0 auto 6px', animation: 'spin 1s linear infinite' }}>refresh</span>
              Loading...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 32, display: 'block', margin: '0 auto 8px', opacity: 0.3 }}>history</span>
              No audit records found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {logs.map((log) => {
                const { icon, color } = actionIcon(log.action);
                return (
                  <div key={log.id} style={{
                    display: 'flex', gap: 12, padding: '10px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color, marginTop: 2 }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {log.action}
                        {log.fieldName && <span style={{ color: 'var(--muted)' }}> — {log.fieldName}</span>}
                      </div>
                      {(log.oldValue || log.newValue) && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {log.oldValue && <span style={{ textDecoration: 'line-through', marginRight: 6 }}>{log.oldValue}</span>}
                          {log.oldValue && log.newValue && <span style={{ marginRight: 6 }}>→</span>}
                          {log.newValue && <span style={{ fontWeight: 500 }}>{log.newValue}</span>}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {log.changedBy || 'system'} · {formatDate(log.changedAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
