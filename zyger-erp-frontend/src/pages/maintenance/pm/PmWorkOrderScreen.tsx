import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import StatusBadge from '../../../components/common/StatusBadge';

interface WorkOrder {
  id: number; workOrderNumber: string; scheduleId: number | null; scheduleNumber: string;
  planNumber: string; machineCode: string; title: string; description: string;
  priority: string; status: string; assignedTo: string; assignedTechnicianId: number | null;
  releasedDate: string; startedAt: string; completedAt: string; verifiedBy: string;
  verdict: string; remarks: string; createdAt: string;
}
interface MasterTechnician { id: number; firstName: string; lastName: string; designation: string; }

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#6b7280', bg: '#f3f4f6' },
  RELEASED: { color: '#2563eb', bg: '#dbeafe' },
  ASSIGNED: { color: '#7c3aed', bg: '#ede9fe' },
  IN_PROGRESS: { color: '#f59e0b', bg: '#fef3c7' },
  COMPLETED: { color: '#22c55e', bg: '#d4edda' },
  VERIFIED: { color: '#0d9488', bg: '#ccfbf1' },
  CANCELLED: { color: '#6b7280', bg: '#f3f4f6' },
};

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: '#991b1b', bg: '#fde2e2' },
  HIGH: { color: '#92400e', bg: '#fef3c7' },
  MEDIUM: { color: '#1d4ed8', bg: '#dbeafe' },
  LOW: { color: '#6b7280', bg: '#f3f4f6' },
};

export default function PmWorkOrderScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [schedules, setSchedules] = useState<{ id: number; scheduleNumber: string; machineCode: string; status: string }[]>([]);
  const [technicians, setTechnicians] = useState<MasterTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [scheduleId, setScheduleId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  const [assignFor, setAssignFor] = useState<number | null>(null);
  const [verifyFor, setVerifyFor] = useState<number | null>(null);
  const [assignTech, setAssignTech] = useState('');
  const [verifyVerdict, setVerifyVerdict] = useState('PASS');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/v1/maintenance/work-orders');
      setRows(Array.isArray(res.data) ? res.data : res.data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    apiClient.get('/v1/maintenance/pm-schedules').then(({ data }) => setSchedules(Array.isArray(data) ? data : [])).catch(() => {});
    apiClient.get('/v1/maintenance/technicians').then(({ data }) => setTechnicians(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const release = async () => {
    if (!scheduleId) { toast('Select a PM schedule to release.', 'error'); return; }
    setBusy(true);
    try {
      await apiClient.post('/v1/maintenance/work-orders', { scheduleId: Number(scheduleId), title, description });
      toast('Work order released.');
      setReleaseOpen(false); setScheduleId(''); setTitle(''); setDescription('');
      load();
    } catch (e) { toast(getApiErrorMessage(e, 'Release failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string, body?: Record<string, unknown>) => {
    try {
      await apiClient.post(`/v1/maintenance/work-orders/${id}/actions/${act}`, body ?? {});
      toast(`Work order ${act.toLowerCase()}d.`);
      load();
    } catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const doAssign = async () => {
    if (assignFor == null || !assignTech) { toast('Select a technician.', 'error'); return; }
    await action(assignFor, 'assign', { assignedTechnicianId: Number(assignTech) });
    setAssignFor(null); setAssignTech('');
  };

  const doVerify = async () => {
    if (verifyFor == null) return;
    await action(verifyFor, 'verify', { verdict: verifyVerdict });
    setVerifyFor(null); setVerifyVerdict('PASS');
  };

  const filtered = rows.filter((r) => !statusFilter || r.status === statusFilter);

  const counts = {
    total: rows.length,
    released: rows.filter((r) => r.status === 'RELEASED' || r.status === 'ASSIGNED').length,
    inProgress: rows.filter((r) => r.status === 'IN_PROGRESS').length,
    completed: rows.filter((r) => r.status === 'COMPLETED').length,
    verified: rows.filter((r) => r.status === 'VERIFIED').length,
  };

  return (
    <>
      <div className="pg-head"><h1>PM Work Order</h1><p>Releasable, assignable preventive maintenance tasks</p></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Work Orders', value: counts.total, color: '#374151', bg: '#f9fafb' },
          { label: 'Open / Assigned', value: counts.released, color: '#2563eb', bg: '#eff6ff' },
          { label: 'In Progress', value: counts.inProgress, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Completed', value: counts.completed, color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Verified', value: counts.verified, color: '#0d9488', bg: '#ccfbf1' },
        ].map((kpi) => (
          <div key={kpi.label} className="panel" style={{ padding: '12px 16px', background: kpi.bg }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {releaseOpen && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-h"><h2>Release PM Work Order</h2></div>
          <div className="fgrid">
            <label className="fld"><span>PM Schedule *</span>
              <select className="in" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
                <option value="">Select schedule...</option>
                {schedules.filter((s) => s.status !== 'COMPLETED').map((s) => (
                  <option key={s.id} value={s.id}>{s.scheduleNumber} — {s.machineCode}</option>
                ))}
              </select>
            </label>
            <label className="fld"><span>Title</span><input className="in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional title" /></label>
            <label className="fld" style={{ gridColumn: '1 / -1' }}><span>Description</span><textarea className="in" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          </div>
          <div className="actbar">
            <span className="lft"><button className="btn btn-sm" onClick={() => setReleaseOpen(false)}>Cancel</button></span>
            <span className="rgt"><button className="btn btn-sm btn-p" onClick={release} disabled={busy}>Release</button></span>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="toolbar" style={{ gap: '8px', justifyContent: 'flex-start' }}>
          <select className="in" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 160 }}>
            <option value="">All Status</option>
            {Object.keys(SC).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-p" onClick={() => setReleaseOpen(true)}>+ Release New</button>
        </div>
        <div className="twrap">
          {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
            <table className="tbl">
              <thead><tr><th>WO No</th><th>Machine</th><th>Title</th><th>Assigned</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">description</span> No work orders.</div></td></tr> : filtered.map((r) => {
                  const pc = PRIORITY_COLORS[r.priority] ?? PRIORITY_COLORS.MEDIUM;
                  return (
                    <tr key={r.id}>
                      <td><b>{r.workOrderNumber}</b></td>
                      <td>{r.machineCode}</td>
                      <td>{r.title || '-'}</td>
                      <td>{r.assignedTo || '-'}</td>
                      <td><span style={{ background: pc.bg, color: pc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{r.priority || 'MEDIUM'}</span></td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td style={{ position: 'relative' }}>
                        <button className="ibtn" title="Actions" onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === r.id ? null : r.id); }}>
                          <span className="material-symbols-rounded">more_vert</span>
                        </button>
                        {openActionMenu === r.id && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 200, padding: '4px 0' }} onClick={(e) => e.stopPropagation()}>
                            {(r.status === 'RELEASED' || r.status === 'ASSIGNED') && <MenuItem icon="assignment_ind" color="#7c3aed" label="Assign Technician" onClick={() => { setOpenActionMenu(null); setAssignFor(r.id); }} />}
                            {(r.status === 'RELEASED' || r.status === 'ASSIGNED') && <MenuItem icon="play_arrow" color="#f59e0b" label="Start" onClick={() => { setOpenActionMenu(null); action(r.id, 'start'); }} />}
                            {r.status === 'IN_PROGRESS' && <MenuItem icon="check_circle" color="#22c55e" label="Complete" onClick={() => { setOpenActionMenu(null); action(r.id, 'complete'); }} />}
                            {r.status === 'COMPLETED' && <MenuItem icon="verified" color="#0d9488" label="Verify" onClick={() => { setOpenActionMenu(null); setVerifyFor(r.id); }} />}
                            {r.status !== 'COMPLETED' && r.status !== 'VERIFIED' && <><hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} /><MenuItem icon="cancel" color="#ef4444" label="Cancel" onClick={() => { setOpenActionMenu(null); action(r.id, 'cancel'); }} /></>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {assignFor != null && (
        <div className="panel" style={{ margin: '16px 0' }}>
          <div className="panel-h"><h2>Assign Technician</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Technician *</span>
              <select className="in" value={assignTech} onChange={(e) => setAssignTech(e.target.value)}>
                <option value="">Select...</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.designation})</option>)}
              </select>
            </label>
          </div>
          <div className="actbar">
            <span className="lft"><button className="btn btn-sm" onClick={() => setAssignFor(null)}>Cancel</button></span>
            <span className="rgt"><button className="btn btn-sm btn-p" onClick={doAssign}>Assign</button></span>
          </div>
        </div>
      )}

      {verifyFor != null && (
        <div className="panel" style={{ margin: '16px 0' }}>
          <div className="panel-h"><h2>Verify Work Order</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Verdict *</span>
              <select className="in" value={verifyVerdict} onChange={(e) => setVerifyVerdict(e.target.value)}>
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
              </select>
            </label>
          </div>
          <div className="actbar">
            <span className="lft"><button className="btn btn-sm" onClick={() => setVerifyFor(null)}>Cancel</button></span>
            <span className="rgt"><button className="btn btn-sm btn-p" onClick={doVerify}>Verify</button></span>
          </div>
        </div>
      )}
    </>
  );
}

function MenuItem({ icon, color, label, onClick }: { icon: string; color: string; label: string; onClick: () => void }) {
  return (
    <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      onClick={onClick}>
      <span className="material-symbols-rounded" style={{ fontSize: 18, color }}>{icon}</span> {label}
    </button>
  );
}
