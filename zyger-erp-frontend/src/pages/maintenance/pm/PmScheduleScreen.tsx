import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';

interface PmPlanOption { id: number; planNumber: string; machineCode: string; }
interface PmSchedule {
  id: number; scheduleNumber: string; planId: number; planNumber: string;
  machineCode: string; scheduledDate: string; dueDate: string; completedDate: string;
  assignedTo: string; status: string; priority: string; remarks: string;
}
interface MasterTechnician { id: number; firstName: string; lastName: string; designation: string; }

const SC: Record<string, { color: string; bg: string }> = {
  UPCOMING: { color: '#2563eb', bg: '#dbeafe' },
  SCHEDULED: { color: '#2563eb', bg: '#dbeafe' },
  IN_PROGRESS: { color: '#f59e0b', bg: '#fef3c7' },
  COMPLETED: { color: '#22c55e', bg: '#d4edda' },
  SKIPPED: { color: '#6b7280', bg: '#f3f4f6' },
  OVERDUE: { color: '#ef4444', bg: '#f8d7da' },
  CLOSED: { color: '#6b7280', bg: '#f3f4f6' },
};

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: '#991b1b', bg: '#fde2e2' },
  HIGH: { color: '#92400e', bg: '#fef3c7' },
  MEDIUM: { color: '#1d4ed8', bg: '#dbeafe' },
  LOW: { color: '#6b7280', bg: '#f3f4f6' },
};

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function PmScheduleScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PmSchedule[]>([]);
  const [plans, setPlans] = useState<PmPlanOption[]>([]);
  const [technicians, setTechnicians] = useState<MasterTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PmSchedule | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [res, planRes] = await Promise.all([
        apiClient.get('/v1/maintenance/pm-schedules'),
        apiClient.get('/v1/maintenance/pm-plans'),
      ]);
      setRows(Array.isArray(res.data) ? res.data : res.data.content ?? []);
      setPlans(Array.isArray(planRes.data) ? planRes.data : planRes.data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    apiClient.get('/v1/maintenance/technicians').then(({ data }) => setTechnicians(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const save = async () => {
    if (!String(form.dueDate ?? '').trim()) { toast('Due Date is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/maintenance/pm-schedules/${editId}`, form); toast('Schedule updated.'); }
      else { await apiClient.post('/v1/maintenance/pm-schedules', form); toast('Schedule created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/maintenance/pm-schedules/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try { await apiClient.post(`/v1/maintenance/pm-schedules/${id}/actions/${act}`); toast(`Schedule ${act}.`); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const backToList = () => { setForm({}); setEditId(null); setTab('list'); };
  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const handlePlanSelect = (val: string) => {
    const plan = plans.find((p) => String(p.id) === val);
    set('planId', val ? Number(val) : '');
    set('planNumber', plan?.planNumber ?? '');
    set('machineCode', plan?.machineCode ?? '');
  };

  const isOverdue = (r: PmSchedule) => {
    if (!r.dueDate || r.status === 'COMPLETED' || r.status === 'CLOSED' || r.status === 'SKIPPED') return false;
    return new Date(r.dueDate) < new Date(new Date().toDateString());
  };

  const filtered = rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(r.scheduleNumber ?? '').toLowerCase().includes(q) && !(r.planNumber ?? '').toLowerCase().includes(q) && !(r.machineCode ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const upcomingCount = rows.filter((r) => r.status === 'UPCOMING' || r.status === 'SCHEDULED').length;
  const overdueCount = rows.filter((r) => isOverdue(r)).length;
  const inProgressCount = rows.filter((r) => r.status === 'IN_PROGRESS').length;
  const completedCount = rows.filter((r) => r.status === 'COMPLETED').length;

  return (
    <>
      <div className="pg-head"><h1>PM Schedule</h1><p>Manage scheduled preventive maintenance tasks</p></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Schedules', value: rows.length, color: '#374151', bg: '#f9fafb' },
          { label: 'Upcoming', value: upcomingCount, color: '#2563eb', bg: '#eff6ff' },
          { label: 'In Progress', value: inProgressCount, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Overdue', value: overdueCount, color: '#ef4444', bg: '#fef2f2' },
          { label: 'Completed', value: completedCount, color: '#22c55e', bg: '#f0fdf4' },
        ].map((kpi) => (
          <div key={kpi.label} className="panel" style={{ padding: '12px 16px', background: kpi.bg }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} PM Schedule</h2></div>
          <div className="fgrid">
            <label className="fld"><span>PM Plan *</span>
              <select className="in" value={String(form.planId ?? '')} onChange={(e) => handlePlanSelect(e.target.value)}>
                <option value="">Select...</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.planNumber} — {p.machineCode}</option>)}
              </select>
            </label>
            <label className="fld"><span>Plan No</span><input className="in" value={String(form.planNumber ?? '')} readOnly style={{ background: '#f3f4f6' }} /></label>
            <label className="fld"><span>Machine Code</span><input className="in" value={String(form.machineCode ?? '')} readOnly style={{ background: '#f3f4f6' }} /></label>
            <label className="fld"><span>Scheduled Date</span><input className="in" type="date" value={String(form.scheduledDate ?? '').slice(0, 10)} onChange={(e) => set('scheduledDate', e.target.value)} /></label>
            <label className="fld"><span>Due Date *</span><input className="in" type="date" value={String(form.dueDate ?? '').slice(0, 10)} onChange={(e) => set('dueDate', e.target.value)} /></label>
            <label className="fld"><span>Assigned To</span>
              <select className="in" value={String(form.assignedTechnicianId ?? form.assignedTo ?? '')} onChange={(e) => set('assignedTechnicianId', e.target.value)}>
                <option value="">Select...</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.designation})</option>)}
              </select>
            </label>
            <label className="fld"><span>Priority</span>
              <select className="in" value={String(form.priority ?? '')} onChange={(e) => set('priority', e.target.value)}>
                <option value="">Select...</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="fld"><span>Remarks</span><input className="in" value={String(form.remarks ?? '')} onChange={(e) => set('remarks', e.target.value)} /></label>
          </div>
          <div className="actbar">
            <span className="lft"><button className="btn btn-sm" onClick={backToList}><span className="material-symbols-rounded">arrow_back</span> Back</button></span>
            <span className="rgt">
              {editId && <button className="btn btn-sm" onClick={backToList}>Cancel</button>}
              <button className="btn btn-sm btn-p" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create'}</button>
            </span>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <div className="panel">
          <div className="toolbar" style={{ gap: '8px', justifyContent: 'flex-start' }}>
            <input className="in" placeholder="Search schedules..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 250 }} />
            <select className="in" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 150 }}>
              <option value="">All Status</option>
              {Object.keys(SC).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }}>+ New Schedule</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Schedule No</th><th>Plan No</th><th>Machine</th><th>Due Date</th><th>Assigned</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><span className="material-symbols-rounded">description</span> No schedules.</div></td></tr> : filtered.map((r) => {
                    const overdue = isOverdue(r);
                    const pc = PRIORITY_COLORS[r.priority] ?? PRIORITY_COLORS.MEDIUM;
                    return (
                      <tr key={r.id} style={{ background: overdue ? '#fef2f2' : undefined }}>
                        <td><b>{r.scheduleNumber}</b></td>
                        <td>{r.planNumber ?? '-'}</td>
                        <td>{r.machineCode}</td>
                        <td style={{ color: overdue ? '#ef4444' : undefined, fontWeight: overdue ? 600 : undefined }}>
                          {overdue && <span className="material-symbols-rounded" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>warning</span>}
                          {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '-'}
                        </td>
                        <td>{r.assignedTo || '-'}</td>
                        <td>
                          <span style={{ background: pc.bg, color: pc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                            {r.priority || 'MEDIUM'}
                          </span>
                        </td>
                        <td><StatusBadge status={overdue && r.status !== 'COMPLETED' && r.status !== 'CLOSED' ? 'OVERDUE' : r.status} variant={SC} /></td>
                        <td style={{ position: 'relative' }}>
                          <button className="ibtn" title="Actions" onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === r.id ? null : r.id); }}>
                            <span className="material-symbols-rounded">more_vert</span>
                          </button>
                          {openActionMenu === r.id && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 180, padding: '4px 0' }} onClick={(e) => e.stopPropagation()}>
                              {(r.status === 'SCHEDULED' || r.status === 'UPCOMING') && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'start'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#f59e0b' }}>play_arrow</span> Start</button>}
                              {r.status === 'IN_PROGRESS' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'complete'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#22c55e' }}>check_circle</span> Complete</button>}
                              {(r.status === 'SCHEDULED' || r.status === 'UPCOMING') && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'skip'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#6b7280' }}>skip_next</span> Skip</button>}
                              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setForm(r as unknown as Record<string, unknown>); setEditId(r.id); setTab('form'); }}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>edit</span> Edit</button>
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
      )}

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.scheduleNumber ?? ''}`} body="Permanently delete this schedule?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
