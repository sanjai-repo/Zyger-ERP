import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';

interface PmPlanOption {
  id: number;
  planNumber: string;
  machineCode: string;
}

interface PmSchedule {
  id: number;
  scheduleNumber: string;
  planId: number;
  planNumber: string;
  machineCode: string;
  scheduledDate: string;
  dueDate: string;
  completedDate: string;
  assignedTo: string;
  status: string;
  priority: string;
  remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' },
  SCHEDULED: { color: '#2563eb', bg: '#dbeafe' },
  IN_PROGRESS: { color: '#f59e0b', bg: '#fef3c7' },
  COMPLETED: { color: '#22c55e', bg: '#d4edda' },
  SKIPPED: { color: '#6b7280', bg: '#f3f4f6' },
  OVERDUE: { color: '#ef4444', bg: '#f8d7da' },
  CLOSED: { color: '#6b7280', bg: '#f3f4f6' },
};

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function PmScheduleScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PmSchedule[]>([]);
  const [plans, setPlans] = useState<PmPlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PmSchedule | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
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

  const filtered = rows.filter((r) => !search || (r.scheduleNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.planNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.machineCode ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head"><h1>PM Schedule</h1><p>Manage scheduled preventive maintenance tasks</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} PM Schedule</h2></div>
          <div className="fgrid">
            <label className="fld"><span>PM Plan *</span>
              <select className="in" value={String(form.planId ?? '')} onChange={(e) => handlePlanSelect(e.target.value)}>
                <option value="">Select...</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.planNumber}</option>)}
              </select>
            </label>
            <label className="fld"><span>Plan No</span><input className="in" value={String(form.planNumber ?? '')} readOnly style={{ background: '#f3f4f6' }} /></label>
            <label className="fld"><span>Machine Code</span><input className="in" value={String(form.machineCode ?? '')} readOnly style={{ background: '#f3f4f6' }} /></label>
            <label className="fld"><span>Scheduled Date</span><input className="in" type="date" value={String(form.scheduledDate ?? '').slice(0, 10)} onChange={(e) => set('scheduledDate', e.target.value)} /></label>
            <label className="fld"><span>Due Date *</span><input className="in" type="date" value={String(form.dueDate ?? '').slice(0, 10)} onChange={(e) => set('dueDate', e.target.value)} /></label>
            <label className="fld"><span>Assigned To</span><input className="in" value={String(form.assignedTo ?? '')} onChange={(e) => set('assignedTo', e.target.value)} /></label>
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
            <input className="in" placeholder="Search schedules..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '250px' }} />
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }}>+ New Schedule</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Schedule No</th><th>Plan No</th><th>Machine</th><th>Due Date</th><th>Completed</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">description</span> No schedules.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.scheduleNumber}</b></td>
                      <td>{r.planNumber ?? '-'}</td>
                      <td>{r.machineCode}</td>
                      <td>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '-'}</td>
                      <td>{r.completedDate ? new Date(r.completedDate).toLocaleDateString() : '-'}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td style={{ position: 'relative' }}>
                        <button className="ibtn" title="Actions" onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === r.id ? null : r.id); }}>
                          <span className="material-symbols-rounded">more_vert</span>
                        </button>
                        {openActionMenu === r.id && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 180, padding: '4px 0' }} onClick={(e) => e.stopPropagation()}>
                            {r.status === 'SCHEDULED' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'start'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#f59e0b' }}>play_arrow</span> Start</button>}
                            {r.status === 'IN_PROGRESS' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'complete'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#22c55e' }}>check_circle</span> Complete</button>}
                            {r.status === 'SCHEDULED' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'skip'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#6b7280' }}>skip_next</span> Skip</button>}
                            {r.status === 'OVERDUE' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'start'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#ef4444' }}>warning</span> Start Overdue</button>}
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                            <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setForm(r as unknown as Record<string, unknown>); setEditId(r.id); setTab('form'); }}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>edit</span> Edit</button>
                            {r.status === 'DRAFT' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', color: '#ef4444' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setDeleteTarget(r); }}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>delete</span> Delete</button>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
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
