import React, { useEffect, useState, useCallback } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';
import { printDocument as printDoc } from '../../../utils/printDocument';
import { exportToCsv } from '../../../utils/csvExport';
import { enqueue } from '../../../utils/offlineQueue';
import { usePendingSyncCount } from '../../../hooks/usePendingSyncCount';
import { useTabs } from '../../../contexts/TabsContext';

interface LogSheet {
  id: number;
  logNumber: string;
  logDate: string;
  workOrderNumber: string;
  jobCardNumber: string;
  machineCode: string;
  operatorCode: string;
  shiftCode: string;
  status: string;
  remarks: string;
  activities?: Activity[];
}

interface Activity {
  id: number;
  activityType: string;
  startTime: string;
  endTime: string;
  duration: number;
  quantity: number;
  qtyCompletedDuringActivity?: number;
  relatedBreakdownId?: number;
  remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' }, VERIFIED: { color: '#2563eb', bg: '#dbeafe' },
  CLOSED: { color: '#22c55e', bg: '#d4edda' }, CANCELLED: { color: '#991b1b', bg: '#fde2e2' },
};

const ACT_TYPES = ['SETUP', 'PRODUCTION', 'TOOL_CHANGE', 'INSPECTION', 'MATERIAL_WAITING', 'MACHINE_BREAKDOWN', 'PROGRAM_WAITING', 'OPERATOR_WAITING', 'QUALITY_WAITING', 'MAINTENANCE', 'REWORK', 'CLEANING', 'OTHER'];

export default function ProductionLogScreen() {
  const { toast } = useToast();
  const { can } = useAuth();
  const pendingCount = usePendingSyncCount();
  const { closeTab } = useTabs();
  const backToList = () => closeTab('production-log');
  const [rows, setRows] = useState<LogSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LogSheet | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActs, setLoadingActs] = useState(false);
  const [actForm, setActForm] = useState<Record<string, unknown>>({});
  const [editActId, setEditActId] = useState<number | null>(null);
  const [deleteActTarget, setDeleteActTarget] = useState<Activity | null>(null);
  const [machines, setMachines] = useState<Array<{ code: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ username: string; fullName: string }>>([]);
  const [shifts, setShifts] = useState<Array<{ code: string; name: string }>>([]);

  const fetchMasters = useCallback(async () => {
    try {
      const [mRes, uRes, sRes] = await Promise.allSettled([
        apiClient.get('/master/machines', { params: { size: 200 } }),
        apiClient.get('/master/users', { params: { size: 200 } }),
        apiClient.get('/master/shifts', { params: { size: 100 } }),
      ]);
      if (mRes.status === 'fulfilled') setMachines((mRes.value.data?.content ?? mRes.value.data ?? []).filter((m: any) => m.active !== false));
      if (uRes.status === 'fulfilled') setUsers((uRes.value.data?.content ?? uRes.value.data ?? []).filter((u: any) => u.active !== false));
      if (sRes.status === 'fulfilled') setShifts(sRes.value.data?.content ?? sRes.value.data ?? []);
    } catch { /* ignore */ }
  }, []);

  const [tab, setTab] = useState<'list' | 'form'>('list');
  useEffect(() => { if (tab === 'form') fetchMasters(); }, [tab, fetchMasters]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/production/log-sheets');
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!navigator.onLine) {
      const id = await enqueue({
        type: 'production-log',
        endpoint: editId ? `/v1/production/log-sheets/${editId}` : '/v1/production/log-sheets',
        method: editId ? 'PUT' : 'POST',
        body: form as Record<string, unknown>,
      });
      toast(`Queued for sync (${id.id}).`, 'success');
      setForm({}); setEditId(null); setTab('list');
      return;
    }

    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/production/log-sheets/${editId}`, form); toast('Log sheet updated.'); }
      else { await apiClient.post('/v1/production/log-sheets', form); toast('Log sheet created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/production/log-sheets/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try { await apiClient.post(`/v1/production/log-sheets/${id}/actions/${act}`); toast(`Log sheet ${act}.`); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const loadActivities = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); setActivities([]); return; }
    setExpandedId(id);
    setLoadingActs(true);
    try {
      const { data } = await apiClient.get(`/v1/production/log-sheets/${id}/activities`);
      setActivities(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Failed.'), 'error'); setActivities([]); }
    setLoadingActs(false);
  };

  const saveAct = async () => {
    if (!expandedId) return;
    if (!String(actForm.activityType ?? '').trim()) { toast('Activity Type is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editActId) { await apiClient.put(`/v1/production/log-sheets/activities/${editActId}`, actForm); toast('Activity updated.'); }
      else { await apiClient.post(`/v1/production/log-sheets/${expandedId}/activities`, actForm); toast('Activity added.'); }
      setActForm({}); setEditActId(null); loadActivities(expandedId);
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const delAct = async () => {
    if (!deleteActTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/production/log-sheets/activities/${deleteActTarget.id}`); toast('Deleted.'); setDeleteActTarget(null); if (expandedId) loadActivities(expandedId); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));
  const setAct = (k: string, v: unknown) => setActForm((c) => ({ ...c, [k]: v }));

  const printDocument = (id: number | string, mode: 'print' | 'download' = 'print') => {
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    printDoc(`${base}/v1/production/log-sheets/${id}/print?download=${mode === 'download'}`, mode);
  };

  const filtered = rows.filter((r) => !search || (r.logNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.workOrderNumber ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head">
        <h1>Production Log Sheet {pendingCount > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d' }}><span className="material-symbols-rounded" style={{ fontSize: 14 }}>cloud_upload</span> Pending sync ({pendingCount})</span>}</h1>
        <p>Record shop-floor activities during production</p>
      </div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Log Sheet</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Log Date</span><input className="in" type="date" value={String(form.logDate ?? '').slice(0, 10)} onChange={(e) => set('logDate', e.target.value)} /></label>
            <label className="fld"><span>Work Order No</span><input className="in" value={String(form.workOrderNumber ?? '')} onChange={(e) => set('workOrderNumber', e.target.value)} /></label>
            <label className="fld"><span>Job Card No</span><input className="in" value={String(form.jobCardNumber ?? '')} onChange={(e) => set('jobCardNumber', e.target.value)} /></label>
            <label className="fld"><span>Machine Code</span>
              <select className="in" value={String(form.machineCode ?? '')} onChange={(e) => set('machineCode', e.target.value)}>
                <option value="">Select machine...</option>
                {machines.map((m) => <option key={m.code} value={m.code}>{m.code} - {m.name}</option>)}
                {Boolean(form.machineCode) && !machines.some((m) => m.code === String(form.machineCode)) && <option value={String(form.machineCode)}>{String(form.machineCode)}</option>}
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
            <input className="in" placeholder="Search log sheets..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="ibtn" title="Export CSV" onClick={() => exportToCsv(filtered as unknown as Record<string, unknown>[], [
              { key: 'logNumber', label: 'Doc No' },
              { key: 'logDate', label: 'Date' },
              { key: 'machineCode', label: 'Machine' },
              { key: 'operatorCode', label: 'Operator' },
              { key: 'shiftCode', label: 'Shift' },
              { key: 'status', label: 'Status' },
            ], 'production-log-sheets')}><span className="material-symbols-rounded">download</span></button>
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }} disabled={!can('production', 'Edit')}>+ New Log Sheet</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th style={{ width: 40 }}></th><th>Log No</th><th>Work Order</th><th>Machine</th><th>Operator</th><th>Shift</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><span className="material-symbols-rounded">description</span> No log sheets.</div></td></tr> : filtered.map((r) => (
                    <React.Fragment key={r.id}>
                      <tr onClick={() => loadActivities(r.id)} style={{ cursor: 'pointer' }}>
                        <td><span className="material-symbols-rounded">{expandedId === r.id ? 'expand_less' : 'expand_more'}</span></td>
                        <td><b>{r.logNumber}</b></td>
                        <td>{r.workOrderNumber ?? '-'}</td>
                        <td>{r.machineCode ?? '-'}</td>
                        <td>{r.operatorCode ?? '-'}</td>
                        <td>{r.shiftCode ?? '-'}</td>
                        <td><StatusBadge status={r.status} variant={SC} /></td>
                        <td>
                          {r.status === 'DRAFT' && can('production', 'Approve') && <button className="ibtn" title="Verify" onClick={(e) => { e.stopPropagation(); action(r.id, 'verify'); }}><span className="material-symbols-rounded">fact_check</span></button>}
                          {r.status === 'VERIFIED' && can('production', 'Approve') && <button className="ibtn" title="Close" onClick={(e) => { e.stopPropagation(); action(r.id, 'close'); }}><span className="material-symbols-rounded">lock</span></button>}
                          {r.status !== 'CLOSED' && can('production', 'Cancel') && <button className="ibtn" title="Cancel" onClick={(e) => { e.stopPropagation(); action(r.id, 'cancel'); }}><span className="material-symbols-rounded">block</span></button>}
                          {can('production', 'Edit') && <button className="ibtn" title="Edit" onClick={(e) => { e.stopPropagation(); setForm(r as unknown as Record<string, unknown>); setEditId(r.id); setTab('form'); }}><span className="material-symbols-rounded">edit</span></button>}
                          <button className="ibtn" title="Print" onClick={(e) => { e.stopPropagation(); printDocument(r.id, 'print'); }}><span className="material-symbols-rounded">print</span></button>
                          <button className="ibtn" title="Download PDF" onClick={(e) => { e.stopPropagation(); printDocument(r.id, 'download'); }}><span className="material-symbols-rounded">download</span></button>
                          {r.status === 'DRAFT' && can('production', 'Delete') && <button className="ibtn danger" title="Delete" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}><span className="material-symbols-rounded">delete</span></button>}
                        </td>
                      </tr>
                      {expandedId === r.id && (
                        <tr key={`${r.id}-acts`}>
                          <td colSpan={8}>
                            <div style={{ background: 'var(--card-bg, #f9fafb)', padding: 12, borderBottom: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <h4 style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Activities</h4>
                                <button className="btn btn-sm" onClick={() => { setActForm({}); setEditActId(null); }} disabled={!can('production', 'Edit')}>+ Add Activity</button>
                              </div>
                              {loadingActs ? <div className="empty">Loading...</div> : activities.length === 0 ? <div className="empty">No activities.</div> : (
                                <table className="tbl">
                                  <thead><tr><th>Type</th><th>Start</th><th>End</th><th>Duration (min)</th><th>Qty</th><th>Remarks</th><th>Actions</th></tr></thead>
                                  <tbody>
                                    {activities.map((a) => (
                                      <tr key={a.id}>
                                        <td>{a.activityType}</td>
                                        <td>{a.startTime ? new Date(a.startTime).toLocaleTimeString() : '-'}</td>
                                        <td>{a.endTime ? new Date(a.endTime).toLocaleTimeString() : '-'}</td>
                                        <td>{a.duration ?? '-'}</td>
                                        <td>{a.quantity ?? '-'}</td>
                                        <td>{a.remarks ?? '-'}</td>
                                        <td>
                                          {can('production', 'Edit') && <button className="ibtn" title="Edit" onClick={() => { setActForm(a as unknown as Record<string, unknown>); setEditActId(a.id); }}><span className="material-symbols-rounded">edit</span></button>}
                                          {can('production', 'Delete') && <button className="ibtn danger" title="Delete" onClick={() => setDeleteActTarget(a)}><span className="material-symbols-rounded">delete</span></button>}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {expandedId && (
        <div className="panel">
          <div className="panel-h"><h2>{editActId ? 'Edit' : 'Add'} Activity</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Activity Type *</span>
              <select className="in" value={String(actForm.activityType ?? 'PRODUCTION')} onChange={(e) => setAct('activityType', e.target.value)}>
                {ACT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="fld"><span>Start Time</span><input className="in" type="datetime-local" value={String(actForm.startTime ?? '').slice(0, 16)} onChange={(e) => { setAct('startTime', e.target.value); const end = String(actForm.endTime ?? '').slice(0, 16); if (e.target.value && end) { const diff = (new Date(end).getTime() - new Date(e.target.value).getTime()) / 60000; if (diff > 0) setAct('duration', Math.round(diff)); } }} /></label>
            <label className="fld"><span>End Time</span><input className="in" type="datetime-local" value={String(actForm.endTime ?? '').slice(0, 16)} onChange={(e) => { setAct('endTime', e.target.value); const start = String(actForm.startTime ?? '').slice(0, 16); if (start && e.target.value) { const diff = (new Date(e.target.value).getTime() - new Date(start).getTime()) / 60000; if (diff > 0) setAct('duration', Math.round(diff)); } }} /></label>
            <label className="fld"><span>Duration (min)</span><input className="in" type="number" value={String(actForm.duration ?? '')} onChange={(e) => setAct('duration', Number(e.target.value))} readOnly /></label>
            <label className="fld"><span>Quantity</span><input className="in" type="number" value={String(actForm.quantity ?? '')} onChange={(e) => setAct('quantity', Number(e.target.value))} /></label>
            <label className="fld"><span>Qty Completed</span><input className="in" type="number" value={String(actForm.qtyCompletedDuringActivity ?? '')} onChange={(e) => setAct('qtyCompletedDuringActivity', Number(e.target.value))} /></label>
            {actForm.activityType === 'MACHINE_BREAKDOWN' && (
              <label className="fld"><span>Breakdown Ref ID</span><input className="in" type="number" placeholder="Breakdown Intimation ID" value={String(actForm.relatedBreakdownId ?? '')} onChange={(e) => setAct('relatedBreakdownId', e.target.value ? Number(e.target.value) : null)} /></label>
            )}
            <label className="fld"><span>Remarks</span><input className="in" value={String(actForm.remarks ?? '')} onChange={(e) => setAct('remarks', e.target.value)} /></label>
          </div>
          <div className="actbar">
            <div className="lft">
              {editActId && <button className="btn btn-sm" onClick={() => { setActForm({}); setEditActId(null); }} disabled={busy}><span className="material-symbols-rounded">arrow_back</span> Cancel</button>}
            </div>
            <div className="rgt">
              <button className="btn btn-sm btn-p" onClick={saveAct} disabled={busy || !can('production', 'Edit')}>{editActId ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.logNumber ?? ''}`} body="Permanently delete?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
      <ConfirmActionModal open={Boolean(deleteActTarget)} title="Delete Activity" body="Permanently delete?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteActTarget(null)} onConfirm={delAct} />
    </>
  );
}
