import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';

interface PmPlan {
  id: number;
  planNumber: string;
  machineCode: string;
  maintenanceType: string;
  frequency: string;
  responsibleDepartment: string;
  responsibleTechnician: string;
  estimatedDurationHours: number;
  checklistItems: string;
  requiredSpareParts: string;
  requiredTools: string;
  safetyInstructions: string;
  instructions: string;
  lastMaintenanceDate: string;
  nextDueDate: string;
  status: string;
  remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' },
  ACTIVE: { color: '#22c55e', bg: '#d4edda' },
  INACTIVE: { color: '#6b7280', bg: '#f3f4f6' },
  COMPLETED: { color: '#2563eb', bg: '#dbeafe' },
  CLOSED: { color: '#6b7280', bg: '#f3f4f6' },
};

const MAINTENANCE_TYPES = ['PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'CONDITION_BASED'];
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF-YEARLY', 'YEARLY'];

interface MasterDepartment { id: number; name: string; }
interface MasterTechnician { id: number; firstName: string; lastName: string; designation: string; }

export default function PmPlanScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PmPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PmPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  const [departments, setDepartments] = useState<MasterDepartment[]>([]);
  const [technicians, setTechnicians] = useState<MasterTechnician[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/maintenance/pm-plans');
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    apiClient.get('/v1/maintenance/departments').then(({ data }) => setDepartments(Array.isArray(data) ? data : [])).catch(() => {});
    apiClient.get('/v1/maintenance/technicians').then(({ data }) => setTechnicians(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const save = async () => {
    if (!String(form.machineCode ?? '').trim()) { toast('Machine Code is required.', 'error'); return; }
    if (!String(form.nextDueDate ?? '').trim()) { toast('Next Due Date is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/maintenance/pm-plans/${editId}`, form); toast('PM Plan updated.'); }
      else { await apiClient.post('/v1/maintenance/pm-plans', form); toast('PM Plan created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/maintenance/pm-plans/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try { await apiClient.post(`/v1/maintenance/pm-plans/${id}/actions/${act}`); toast(`PM Plan ${act}.`); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const generateSchedule = async (id: number) => {
    setBusy(true);
    try { await apiClient.post(`/v1/maintenance/pm-plans/${id}/generate-schedule`); toast('Schedule generated.'); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Schedule generation failed.'), 'error'); }
    setBusy(false);
  };

  const backToList = () => { setForm({}); setEditId(null); setTab('list'); };
  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));
  const filtered = rows.filter((r) => !search || (r.planNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.machineCode ?? '').toLowerCase().includes(search.toLowerCase()) || (r.frequency ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head"><h1>PM Plan</h1><p>Define preventive maintenance plans for machines</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} PM Plan</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Machine Code *</span><input className="in" value={String(form.machineCode ?? '')} onChange={(e) => set('machineCode', e.target.value)} /></label>
            <label className="fld"><span>Maintenance Type</span>
              <select className="in" value={String(form.maintenanceType ?? '')} onChange={(e) => set('maintenanceType', e.target.value)}>
                <option value="">Select...</option>
                {MAINTENANCE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="fld"><span>Frequency</span>
              <select className="in" value={String(form.frequency ?? '')} onChange={(e) => set('frequency', e.target.value)}>
                <option value="">Select...</option>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="fld"><span>Responsible Department</span>
              <select className="in" value={String(form.responsibleDepartmentId ?? form.responsibleDepartment ?? '')} onChange={(e) => set('responsibleDepartmentId', e.target.value)}>
                <option value="">Select...</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="fld"><span>Responsible Technician</span>
              <select className="in" value={String(form.responsibleTechnicianId ?? form.responsibleTechnician ?? '')} onChange={(e) => set('responsibleTechnicianId', e.target.value)}>
                <option value="">Select...</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.designation})</option>)}
              </select>
            </label>
            <label className="fld"><span>Est. Duration (hrs)</span><input className="in" type="number" step="0.5" value={String(form.estimatedDurationHours ?? '')} onChange={(e) => set('estimatedDurationHours', Number(e.target.value))} /></label>
            <label className="fld"><span>Last Maintenance Date</span><input className="in" type="date" value={String(form.lastMaintenanceDate ?? '').slice(0, 10)} onChange={(e) => set('lastMaintenanceDate', e.target.value)} /></label>
            <label className="fld"><span>Next Due Date *</span><input className="in" type="date" value={String(form.nextDueDate ?? '').slice(0, 10)} onChange={(e) => set('nextDueDate', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Checklist Items</span><textarea className="in" rows={3} value={String(form.checklistItems ?? '')} onChange={(e) => set('checklistItems', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Required Spare Parts</span><textarea className="in" rows={3} value={String(form.requiredSpareParts ?? '')} onChange={(e) => set('requiredSpareParts', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Required Tools</span><textarea className="in" rows={3} value={String(form.requiredTools ?? '')} onChange={(e) => set('requiredTools', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Safety Instructions</span><textarea className="in" rows={3} value={String(form.safetyInstructions ?? '')} onChange={(e) => set('safetyInstructions', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Instructions</span><textarea className="in" rows={3} value={String(form.instructions ?? '')} onChange={(e) => set('instructions', e.target.value)} /></label>
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
            <input className="in" placeholder="Search PM plans..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '250px' }} />
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }}>+ New PM Plan</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Plan No</th><th>Machine</th><th>Frequency</th><th>Next Due</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={6}><div className="empty"><span className="material-symbols-rounded">description</span> No PM plans.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.planNumber}</b></td>
                      <td>{r.machineCode}</td>
                      <td>{(r.frequency ?? '').replace(/_/g, ' ')}</td>
                      <td>{r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString() : '-'}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td style={{ position: 'relative' }}>
                        <button className="ibtn" title="Actions" onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === r.id ? null : r.id); }}>
                          <span className="material-symbols-rounded">more_vert</span>
                        </button>
                        {openActionMenu === r.id && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 180, padding: '4px 0' }} onClick={(e) => e.stopPropagation()}>
                            {r.status === 'DRAFT' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'activate'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#22c55e' }}>check_circle</span> Activate</button>}
                            {r.status === 'ACTIVE' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'deactivate'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#6b7280' }}>block</span> Deactivate</button>}
                            {r.status === 'ACTIVE' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); generateSchedule(r.id); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#2563eb' }}>event</span> Generate Schedule</button>}
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

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.planNumber ?? ''}`} body="Permanently delete this PM plan?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
