import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import StatusBadge from '../../../components/common/StatusBadge';

interface NotificationLog {
  id: number;
  recipient: string;
  channel: string;
  subject: string;
  body: string;
  sourceType: string;
  sourceId: number;
  status: string;
  sentAt: string;
  readAt: string;
  errorMessage: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  SENT: { color: '#2563eb', bg: '#dbeafe' },
  DELIVERED: { color: '#22c55e', bg: '#d4edda' },
  FAILED: { color: '#dc2626', bg: '#fef2f2' },
  PENDING: { color: '#f59e0b', bg: '#fef3c7' },
  READ: { color: '#6b7280', bg: '#f3f4f6' },
};

const CHANNEL_ICONS: Record<string, string> = {
  EMAIL: 'email',
  SMS: 'sms',
  IN_APP: 'notifications',
  WHATSAPP: 'chat',
};

export default function NotificationLogPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (channelFilter) params.set('sourceType', channelFilter);
      const url = params.toString() ? `/v1/maintenance/notifications?${params.toString()}` : '/v1/maintenance/notifications';
      const { data } = await apiClient.get(url);
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [channelFilter, statusFilter]);

  const filtered = rows.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (!(r.subject ?? '').toLowerCase().includes(q) && !(r.recipient ?? '').toLowerCase().includes(q) && !(r.body ?? '').toLowerCase().includes(q)) return false;
    }
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  const markRead = async (id: number) => {
    try {
      await apiClient.put(`/v1/maintenance/notifications/${id}`, { readAt: new Date().toISOString() });
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, readAt: new Date().toISOString(), status: 'READ' } : r));
    } catch (e) { toast(getApiErrorMessage(e, 'Failed.'), 'error'); }
  };

  const unreadCount = rows.filter((r) => !r.readAt && r.status !== 'READ').length;

  return (
    <>
      <div className="pg-head">
        <div className="pg-head-text">
          <h3>Notification Log</h3>
          <p>{unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'All notifications read'}</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 12, padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="in" placeholder="Search notifications..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 250 }} />
          <select className="in" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} style={{ width: 130 }}>
            <option value="">All Channels</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
            <option value="IN_APP">In-App</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
          <select className="in" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 130 }}>
            <option value="">All Status</option>
            <option value="SENT">Sent</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
            <option value="READ">Read</option>
          </select>
          <button className="btn" onClick={() => { setSearch(''); setChannelFilter(''); setStatusFilter(''); }}>Clear</button>
        </div>
      </div>

      {loading ? <p style={{ padding: 16, color: '#888' }}>Loading...</p> : (
        <div className="panel" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>notifications_off</span>
              No notifications found.
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Channel</th>
                  <th>Subject</th>
                  <th>Recipient</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Sent At</th>
                  <th>Read At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const isExpanded = expandedId === r.id;
                  const isUnread = !r.readAt && r.status !== 'READ';
                  return (
                    <>
                      <tr
                        key={r.id}
                        style={{ cursor: 'pointer', background: isUnread ? '#f8fafc' : undefined, fontWeight: isUnread ? 600 : undefined }}
                        onClick={() => { setExpandedId(isExpanded ? null : r.id); if (isUnread) markRead(r.id); }}
                      >
                        <td>
                          <span className="material-symbols-rounded" style={{ fontSize: 18, color: r.status === 'FAILED' ? '#dc2626' : '#2563eb' }}>
                            {CHANNEL_ICONS[r.channel] ?? 'notifications'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>{r.channel}</td>
                        <td>{r.subject || '(no subject)'}</td>
                        <td style={{ fontSize: 12 }}>{r.recipient}</td>
                        <td style={{ fontSize: 12 }}>{r.sourceType}{r.sourceId ? ` #${r.sourceId}` : ''}</td>
                        <td><StatusBadge status={r.status} variant={SC} /></td>
                        <td style={{ fontSize: 12 }}>{r.sentAt ? new Date(r.sentAt).toLocaleString() : '-'}</td>
                        <td style={{ fontSize: 12 }}>{r.readAt ? new Date(r.readAt).toLocaleString() : '-'}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${r.id}-detail`}>
                          <td colSpan={8} style={{ padding: '12px 20px', background: '#f9fafb', borderTop: 'none' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                              <div>
                                <strong style={{ fontSize: 12, color: '#6b7280' }}>Subject</strong>
                                <p style={{ margin: '4px 0 0', fontSize: 13 }}>{r.subject || '-'}</p>
                              </div>
                              <div>
                                <strong style={{ fontSize: 12, color: '#6b7280' }}>Recipient</strong>
                                <p style={{ margin: '4px 0 0', fontSize: 13 }}>{r.recipient}</p>
                              </div>
                              <div style={{ gridColumn: '1 / -1' }}>
                                <strong style={{ fontSize: 12, color: '#6b7280' }}>Body</strong>
                                <div style={{ margin: '4px 0 0', fontSize: 13, whiteSpace: 'pre-wrap', background: '#fff', padding: 12, borderRadius: 6, border: '1px solid var(--border, #e5e7eb)' }}>
                                  {r.body || '(empty)'}
                                </div>
                              </div>
                              {r.errorMessage && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <strong style={{ fontSize: 12, color: '#dc2626' }}>Error</strong>
                                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#dc2626' }}>{r.errorMessage}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
