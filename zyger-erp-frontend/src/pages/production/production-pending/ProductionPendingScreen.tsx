import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useTabs } from '../../../contexts/TabsContext';
import { getScreenComponent } from '../../../config/screenRegistry';
import { getApiErrorMessage } from '../../../utils/apiError';
import StatusBadge from '../../../components/common/StatusBadge';

interface PendingItem {
  jobCardNumber: string;
  workOrderNumber: string;
  partCode: string;
  partDescription: string;
  plannedQuantity: number;
  completedQuantity: number;
  pendingQuantity: number;
  status: string;
  priority: string;
  plannedStartDate: string;
  plannedEndDate: string;
  daysPending: number;
  overdue: boolean;
}

const SC: Record<string, { color: string; bg: string }> = {
  RELEASED: { color: '#2563eb', bg: '#dbeafe' }, IN_PROGRESS: { color: '#f59e0b', bg: '#fef3c7' },
  ON_HOLD: { color: '#ef4444', bg: '#f8d7da' },
};

const PR: Record<string, { color: string; bg: string }> = {
  LOW: { color: '#22c55e', bg: '#d4edda' }, MEDIUM: { color: '#f59e0b', bg: '#fef3c7' },
  HIGH: { color: '#ef4444', bg: '#f8d7da' }, URGENT: { color: '#991b1b', bg: '#fde2e2' },
};

export default function ProductionPendingScreen() {
  const { toast } = useToast();
  const { openTab } = useTabs();
  const [rows, setRows] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const openJobCard = (jobCardNumber: string) => {
    if (!jobCardNumber) return;
    openTab({
      id: `job-card-view-${jobCardNumber}`,
      label: `JC ${jobCardNumber}`,
      icon: 'assignment',
      component: getScreenComponent('job-card'),
      props: { initialSearch: jobCardNumber },
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/production/pending');
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.jobCardNumber ?? '').toLowerCase().includes(q) || (r.partCode ?? '').toLowerCase().includes(q) || (r.workOrderNumber ?? '').toLowerCase().includes(q);
  });

  const totalPending = filtered.reduce((s, r) => s + (r.pendingQuantity ?? 0), 0);
  const overdueCount = filtered.filter((r) => r.overdue).length;

  return (
    <>
      <div className="pg-head"><h1>Production Pending</h1><p>Real-time view of pending production jobs</p></div>

      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="fgrid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '16px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{filtered.length}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Pending Jobs</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{totalPending}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total Pending Qty</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{overdueCount}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Overdue Jobs</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{filtered.filter((r) => r.status === 'IN_PROGRESS').length}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>In Progress</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <input className="in" placeholder="Search pending jobs..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn" onClick={load}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>refresh</span> Refresh</button>
        </div>
        <div className="twrap">
          {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
            <table className="tbl">
              <thead>
                <tr>
                  <th className="num">S.No</th>
                  <th>Job Card</th>
                  <th>Work Order</th>
                  <th>Part Code</th>
                  <th>Description</th>
                  <th>Planned Qty</th>
                  <th>Completed</th>
                  <th>Pending Qty</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Days Pending</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={12}><div className="empty"><span className="material-symbols-rounded">check_circle</span> No pending production jobs.</div></td></tr>
                ) : filtered.sort((a, b) => (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0) || (b.pendingQuantity ?? 0) - (a.pendingQuantity ?? 0)).map((r, idx) => (
                  <tr key={r.jobCardNumber} style={r.overdue ? { background: 'rgba(239,68,68,0.05)' } : undefined}>
                    <td className="num mut">{idx + 1}</td>
                    <td>
                      <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); openJobCard(r.jobCardNumber); }}
                        style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                        title={`Open Job Card ${r.jobCardNumber}`}
                      >
                        {r.jobCardNumber}
                      </a>
                    </td>
                    <td>{r.workOrderNumber ?? '-'}</td>
                    <td>{r.partCode}</td>
                    <td>{r.partDescription ?? '-'}</td>
                    <td>{r.plannedQuantity}</td>
                    <td style={{ color: '#22c55e' }}>{r.completedQuantity}</td>
                    <td style={{ color: '#ef4444', fontWeight: 600 }}>{r.pendingQuantity}</td>
                    <td><StatusBadge status={r.status} variant={SC} /></td>
                    <td><span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: (PR[r.priority] ?? PR.MEDIUM).color, background: (PR[r.priority] ?? PR.MEDIUM).bg }}>{r.priority ?? 'MEDIUM'}</span></td>
                    <td style={r.overdue ? { color: '#ef4444', fontWeight: 600 } : undefined}>{r.plannedEndDate ? new Date(r.plannedEndDate).toLocaleDateString() : '-'}</td>
                    <td style={r.overdue ? { color: '#ef4444', fontWeight: 600 } : undefined}>{r.daysPending}d{r.overdue ? ' (OVERDUE)' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
