import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';

interface PmScheduleOption {
  id: number;
  scheduleNumber: string;
  planNumber: string;
  machineCode: string;
}

interface PmCompletion {
  id: number;
  completionNumber: string;
  scheduleId: number;
  scheduleNumber: string;
  planNumber: string;
  machineCode: string;
  technicianCode: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  checklistCompleted: string;
  measurementsRecorded: string;
  sparePartsUsed: string;
  labourHours: number;
  result: string;
  supervisor: string;
  verified: boolean;
  nextDueDate: string;
  status: string;
  remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' },
  SUBMITTED: { color: '#2563eb', bg: '#dbeafe' },
  COMPLETED: { color: '#22c55e', bg: '#d4edda' },
  VERIFIED: { color: '#0d9488', bg: '#ccfbf1' },
  FAILED: { color: '#ef4444', bg: '#f8d7da' },
};

const RESULTS = ['PASS', 'PASS_WITH_OBSERVATION', 'REQUIRES_REPAIR', 'FAILED'];

export default function PmCompletionScreen() {
  const { toast } = useToast();
  const { can } = useAuth();
  const [rows, setRows] = useState<PmCompletion[]>([]);
  const [schedules, setSchedules] = useState<PmScheduleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PmCompletion | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');

  const load = async () => {
    setLoading(true);
    try {
      const [res, schRes] = await Promise.all([
        apiClient.get('/v1/maintenance/pm-completions'),
        apiClient.get('/v1/maintenance/pm-schedules'),
      ]);
      setRows(Array.isArray(res.data) ? res.data : res.data.content ?? []);
      setSchedules(Array.isArray(schRes.data) ? schRes.data : schRes.data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/maintenance/pm-completions/${editId}`, form); toast('Completion updated.'); }
      else { await apiClient.post('/v1/maintenance/pm-completions', form); toast('Completion created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/maintenance/pm-completions/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try { await apiClient.post(`/v1/maintenance/pm-completions/${id}/actions/${act}`); toast(`Completion ${act}.`); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const backToList = () => { setForm({}); setEditId(null); setTab('list'); };
  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const handleScheduleSelect = (val: string) => {
    const sch = schedules.find((s) => String(s.id) === val);
    set('scheduleId', val ? Number(val) : '');
    set('scheduleNumber', sch?.scheduleNumber ?? '');
    set('planNumber', sch?.planNumber ?? '');
    set('machineCode', sch?.machineCode ?? '');
  };

  const filtered = rows.filter((r) => !search || (r.completionNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.scheduleNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.machineCode ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head"><h1>PM Completion</h1><p>Record and verify preventive maintenance completion</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} PM Completion</h2></div>
          <div className="fgrid">
            <label className="fld"><span>PM Schedule *</span>
              <select className="in" value={String(form.scheduleId ?? '')} onChange={(e) => handleScheduleSelect(e.target.value)}>
                <option value="">Select...</option>
                {schedules.map((s) => <option key={s.id} value={s.id}>{s.scheduleNumber}</option>)}
              </select>
            </label>
            <label className="fld"><span>Schedule No</span><input className="in" value={String(form.scheduleNumber ?? '')} readOnly style={{ background: '#f3f4f6' }} /></label>
            <label className="fld"><span>Plan No</span><input className="in" value={String(form.planNumber ?? '')} readOnly style={{ background: '#f3f4f6' }} /></label>
            <label className="fld"><span>Machine Code</span><input className="in" value={String(form.machineCode ?? '')} readOnly style={{ background: '#f3f4f6' }} /></label>
            <label className="fld"><span>Technician Code</span><input className="in" value={String(form.technicianCode ?? '')} onChange={(e) => set('technicianCode', e.target.value)} /></label>
            <label className="fld"><span>Start Time</span><input className="in" type="datetime-local" value={String(form.startTime ?? '').slice(0, 16)} onChange={(e) => set('startTime', e.target.value)} /></label>
            <label className="fld"><span>End Time</span><input className="in" type="datetime-local" value={String(form.endTime ?? '').slice(0, 16)} onChange={(e) => set('endTime', e.target.value)} /></label>
            <label className="fld"><span>Duration (hrs)</span><input className="in" type="number" min={0} step="0.5" value={String(form.durationHours ?? '')} onChange={(e) => set('durationHours', Math.max(0, Number(e.target.value)))} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Checklist Completed</span><textarea className="in" rows={3} value={String(form.checklistCompleted ?? '')} onChange={(e) => set('checklistCompleted', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Measurements Recorded</span><textarea className="in" rows={3} value={String(form.measurementsRecorded ?? '')} onChange={(e) => set('measurementsRecorded', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Spare Parts Used</span><textarea className="in" rows={3} value={String(form.sparePartsUsed ?? '')} onChange={(e) => set('sparePartsUsed', e.target.value)} /></label>
            <label className="fld"><span>Labour Hours</span><input className="in" type="number" min={0} step="0.5" value={String(form.labourHours ?? '')} onChange={(e) => set('labourHours', Math.max(0, Number(e.target.value)))} /></label>
            <label className="fld"><span>Result</span>
              <select className="in" value={String(form.result ?? '')} onChange={(e) => set('result', e.target.value)}>
                <option value="">Select...</option>
                {RESULTS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="fld"><span>Supervisor</span><input className="in" value={String(form.supervisor ?? '')} onChange={(e) => set('supervisor', e.target.value)} /></label>
            <label className="fld"><span>Verified</span>
              <select className="in" value={String(form.verified ?? 'false')} onChange={(e) => set('verified', e.target.value === 'true')}>
                <option value="false">No</option><option value="true">Yes</option>
              </select>
            </label>
            <label className="fld"><span>Next Due Date</span><input className="in" type="date" value={String(form.nextDueDate ?? '').slice(0, 10)} onChange={(e) => set('nextDueDate', e.target.value)} /></label>
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
            <input className="in" placeholder="Search completions..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '250px' }} />
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }}>+ New Completion</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>PMC No</th><th>Schedule No</th><th>Machine</th><th>Technician</th><th>Result</th><th>Status</th><th>Verified</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><span className="material-symbols-rounded">description</span> No completions.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.completionNumber}</b></td>
                      <td>{r.scheduleNumber ?? '-'}</td>
                      <td>{r.machineCode}</td>
                      <td>{r.technicianCode ?? '-'}</td>
                      <td>{(r.result ?? '-').replace(/_/g, ' ')}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td>{r.verified ? <span className="material-symbols-rounded" style={{ color: '#22c55e', fontSize: 18 }}>check_circle</span> : <span className="material-symbols-rounded" style={{ color: '#ccc', fontSize: 18 }}>radio_button_unchecked</span>}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {r.status === 'DRAFT' && can('maintenance', 'Edit') && <button className="btn btn-sm" onClick={() => action(r.id, 'submit')} disabled={busy}>Submit</button>}
                          {r.status === 'SUBMITTED' && <button className="btn btn-sm btn-g" onClick={() => action(r.id, 'complete')} disabled={busy}>Complete</button>}
                          {r.status === 'SUBMITTED' && <button className="btn btn-sm btn-d" onClick={() => action(r.id, 'fail')} disabled={busy}>Fail</button>}
                          {r.status === 'COMPLETED' && !r.verified && <button className="btn btn-sm" onClick={() => action(r.id, 'verify')} disabled={busy}>Verify</button>}
                          <button className="ibtn" title="Edit" onClick={() => { setForm(r as unknown as Record<string, unknown>); setEditId(r.id); setTab('form'); }}>
                            <span className="material-symbols-rounded">edit</span>
                          </button>
                          {r.status === 'DRAFT' && (
                            <button className="ibtn" title="Delete" onClick={() => setDeleteTarget(r)}>
                              <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.completionNumber ?? ''}`} body="Permanently delete this completion record?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
