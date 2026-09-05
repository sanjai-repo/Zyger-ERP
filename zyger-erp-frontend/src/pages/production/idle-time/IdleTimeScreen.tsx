import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';
import { exportToCsv } from '../../../utils/csvExport';
import { enqueue } from '../../../utils/offlineQueue';
import { usePendingSyncCount } from '../../../hooks/usePendingSyncCount';
import { useTabs } from '../../../contexts/TabsContext';

interface IdleTime {
  id: number;
  entryNumber: string;
  entryDate: string;
  machineCode: string;
  workCenterCode: string;
  operatorCode: string;
  shiftCode: string;
  startTime: string;
  endTime: string;
  duration: number;
  idleReason: string;
  workOrderNumber: string;
  jobCardNumber: string;
  status: string;
  remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' }, VERIFIED: { color: '#22c55e', bg: '#d4edda' },
  CANCELLED: { color: '#991b1b', bg: '#fde2e2' },
};

const IDLE_REASONS_DEFAULT = ['MATERIAL_WAITING', 'TOOL_WAITING', 'PROGRAM_WAITING', 'OPERATOR_WAITING', 'QUALITY_WAITING', 'MAINTENANCE_WAITING', 'MACHINE_SETUP_DELAY', 'DRAWING_WAITING', 'PLANNING_DELAY', 'NO_JOB', 'POWER_FAILURE', 'OTHER'];

export default function IdleTimeScreen() {
  const { toast } = useToast();
  const { can } = useAuth();
  const pendingCount = usePendingSyncCount();
  const { closeTab } = useTabs();
  const backToList = () => closeTab('idle-time');
  const [rows, setRows] = useState<IdleTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IdleTime | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [machines, setMachines] = useState<Array<{ code: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ username: string; fullName: string }>>([]);
  const [shifts, setShifts] = useState<Array<{ code: string; name: string }>>([]);
  const [workCenters, setWorkCenters] = useState<Array<{ code: string; name: string }>>([]);
  const [idleReasons, setIdleReasons] = useState<Array<{ code: string; description: string }>>([]);

  const fetchMasters = useCallback(async () => {
    try {
      const [mRes, uRes, sRes, wRes, irRes] = await Promise.allSettled([
        apiClient.get('/master/machines', { params: { size: 200 } }),
        apiClient.get('/master/users', { params: { size: 200 } }),
        apiClient.get('/master/shifts', { params: { size: 100 } }),
        apiClient.get('/master/work-centers', { params: { size: 100 } }),
        apiClient.get('/v2/master/idle-reasons', { params: { size: 100 } }),
      ]);
      if (mRes.status === 'fulfilled') setMachines((mRes.value.data?.content ?? mRes.value.data ?? []).filter((m: any) => m.active !== false));
      if (uRes.status === 'fulfilled') setUsers((uRes.value.data?.content ?? uRes.value.data ?? []).filter((u: any) => u.active !== false));
      if (sRes.status === 'fulfilled') setShifts(sRes.value.data?.content ?? sRes.value.data ?? []);
      if (wRes.status === 'fulfilled') setWorkCenters(wRes.value.data?.content ?? wRes.value.data ?? []);
      if (irRes.status === 'fulfilled') {
        const reasons = (irRes.value.data?.content ?? irRes.value.data ?? []).filter((r: any) => r.active !== false);
        setIdleReasons(reasons.length > 0 ? reasons : IDLE_REASONS_DEFAULT.map((c) => ({ code: c, description: c.replace(/_/g, ' ') })));
      } else {
        setIdleReasons(IDLE_REASONS_DEFAULT.map((c) => ({ code: c, description: c.replace(/_/g, ' ') })));
      }
    } catch { setIdleReasons(IDLE_REASONS_DEFAULT.map((c) => ({ code: c, description: c.replace(/_/g, ' ') }))); }
  }, []);

  useEffect(() => { if (tab === 'form') fetchMasters(); }, [tab, fetchMasters]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/production/idle-time');
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!String(form.machineCode ?? '').trim()) { toast('Machine Code is required.', 'error'); return; }
    if (!String(form.idleReason ?? '').trim()) { toast('Idle Reason is required.', 'error'); return; }

    if (!navigator.onLine) {
      const id = await enqueue({
        type: 'idle-time',
        endpoint: editId ? `/v1/production/idle-time/${editId}` : '/v1/production/idle-time',
        method: editId ? 'PUT' : 'POST',
        body: form as Record<string, unknown>,
      });
      toast(`Queued for sync (${id.id}).`, 'success');
      setForm({}); setEditId(null); setTab('list');
      return;
    }

    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/production/idle-time/${editId}`, form); toast('Idle time updated.'); }
      else { await apiClient.post('/v1/production/idle-time', form); toast('Idle time created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/production/idle-time/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    if (actionBusyId !== null) return;
    setActionBusyId(id);
    try { await apiClient.post(`/v1/production/idle-time/${id}/actions/${act}`); toast(`Idle time ${act}.`); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
    setActionBusyId(null);
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));
  const filtered = rows.filter((r) => !search || (r.entryNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.machineCode ?? '').toLowerCase().includes(search.toLowerCase()) || (r.idleReason ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head">
        <h1>Idle Time {pendingCount > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d' }}><span className="material-symbols-rounded" style={{ fontSize: 14 }}>cloud_upload</span> Pending sync ({pendingCount})</span>}</h1>
        <p>Record machine downtime and idle periods</p>
      </div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Idle Time</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Entry Date</span><input className="in" type="date" value={String(form.entryDate ?? '').slice(0, 10)} onChange={(e) => set('entryDate', e.target.value)} /></label>
            <label className="fld"><span>Machine Code *</span>
              <select className="in" value={String(form.machineCode ?? '')} onChange={(e) => set('machineCode', e.target.value)}>
                <option value="">Select machine...</option>
                {machines.map((m) => <option key={m.code} value={m.code}>{m.code} - {m.name}</option>)}
                {Boolean(form.machineCode) && !machines.some((m) => m.code === form.machineCode) && <option value={String(form.machineCode)}>{String(form.machineCode)}</option>}
              </select>
            </label>
            <label className="fld"><span>Work Center</span>
              <select className="in" value={String(form.workCenterCode ?? '')} onChange={(e) => set('workCenterCode', e.target.value)}>
                <option value="">Select...</option>
                {workCenters.map((w) => <option key={w.code} value={w.code}>{w.code} - {w.name}</option>)}
              </select>
            </label>
            <label className="fld"><span>Operator Code</span>
              <select className="in" value={String(form.operatorCode ?? '')} onChange={(e) => set('operatorCode', e.target.value)}>
                <option value="">Select operator...</option>
                {users.map((u) => <option key={u.username} value={u.username}>{u.username} - {u.fullName || u.username}</option>)}
              </select>
            </label>
            <label className="fld"><span>Shift Code</span>
              <select className="in" value={String(form.shiftCode ?? '')} onChange={(e) => set('shiftCode', e.target.value)}>
                <option value="">Select shift...</option>
                {shifts.map((s) => <option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
              </select>
            </label>
            <label className="fld"><span>Start Time</span><input className="in" type="datetime-local" value={String(form.startTime ?? '').slice(0, 16)} onChange={(e) => { set('startTime', e.target.value); const end = String(form.endTime ?? '').slice(0, 16); if (e.target.value && end) { const diff = (new Date(end).getTime() - new Date(e.target.value).getTime()) / 60000; if (diff > 0) set('duration', Math.round(diff)); } }} /></label>
            <label className="fld"><span>End Time</span><input className="in" type="datetime-local" value={String(form.endTime ?? '').slice(0, 16)} onChange={(e) => { set('endTime', e.target.value); const start = String(form.startTime ?? '').slice(0, 16); if (start && e.target.value) { const diff = (new Date(e.target.value).getTime() - new Date(start).getTime()) / 60000; if (diff > 0) set('duration', Math.round(diff)); } }} /></label>
            <label className="fld"><span>Duration (min)</span><input className="in" type="number" value={String(form.duration ?? '')} readOnly /></label>
            <label className="fld"><span>Idle Reason *</span>
              <select className="in" value={String(form.idleReason ?? '')} onChange={(e) => set('idleReason', e.target.value)}>
                <option value="">Select...</option>
                {idleReasons.map((r) => <option key={r.code} value={r.code}>{r.description ?? r.code.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="fld"><span>Work Order No</span><input className="in" value={String(form.workOrderNumber ?? '')} onChange={(e) => set('workOrderNumber', e.target.value)} /></label>
            <label className="fld"><span>Job Card No</span><input className="in" value={String(form.jobCardNumber ?? '')} onChange={(e) => set('jobCardNumber', e.target.value)} /></label>
            <label className="fld"><span>Remarks</span><input className="in" value={String(form.remarks ?? '')} onChange={(e) => set('remarks', e.target.value)} /></label>
          </div>
          <div className="actbar">
            <div className="lft">
              <button className="btn btn-sm" onClick={backToList} disabled={busy}><span className="material-symbols-rounded">arrow_back</span> Back</button>
            </div>
            <div className="rgt">
              {editId && <button className="btn btn-sm" onClick={() => { setForm({}); setEditId(null); setTab('list'); }} disabled={busy}>Cancel</button>}
              <button className="btn btn-sm btn-p" onClick={save} disabled={busy || !can('production', 'Edit')}>{editId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <div className="panel">
          <div className="toolbar">
            <input className="in" placeholder="Search idle time..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="ibtn" title="Export CSV" onClick={() => exportToCsv(filtered as unknown as Record<string, unknown>[], [
              { key: 'entryNumber', label: 'Doc No' },
              { key: 'entryDate', label: 'Date' },
              { key: 'machineCode', label: 'Machine' },
              { key: 'workCenterCode', label: 'Work Center' },
              { key: 'operatorCode', label: 'Operator' },
              { key: 'shiftCode', label: 'Shift' },
              { key: 'idleReason', label: 'Reason' },
              { key: 'startTime', label: 'Start' },
              { key: 'endTime', label: 'End' },
              { key: 'duration', label: 'Duration min' },
              { key: 'status', label: 'Status' },
            ], 'idle-time')}><span className="material-symbols-rounded">download</span></button>
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }} disabled={!can('production', 'Edit')}>+ New Idle Entry</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Entry No</th><th>Machine</th><th>Operator</th><th>Reason</th><th>Duration (min)</th><th>Work Order</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><span className="material-symbols-rounded">description</span> No idle entries.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.entryNumber}</b></td>
                      <td>{r.machineCode}</td>
                      <td>{r.operatorCode ?? '-'}</td>
                      <td>{(r.idleReason ?? '').replace(/_/g, ' ')}</td>
                      <td>{r.duration ?? '-'}</td>
                      <td>{r.workOrderNumber ?? '-'}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td>
                        {r.status === 'DRAFT' && can('production', 'Approve') && <button className="ibtn" title="Verify" disabled={actionBusyId === r.id} onClick={() => action(r.id, 'verify')}><span className="material-symbols-rounded">fact_check</span></button>}
                        {r.status === 'DRAFT' && can('production', 'Cancel') && <button className="ibtn" title="Cancel" disabled={actionBusyId === r.id} onClick={() => action(r.id, 'cancel')}><span className="material-symbols-rounded">block</span></button>}
                        {can('production', 'Edit') && <button className="ibtn" title="Edit" onClick={() => { setForm(r as unknown as Record<string, unknown>); setEditId(r.id); setTab('form'); }}><span className="material-symbols-rounded">edit</span></button>}
                        {r.status === 'DRAFT' && can('production', 'Delete') && <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(r)}><span className="material-symbols-rounded">delete</span></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.entryNumber ?? ''}`} body="Permanently delete?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
