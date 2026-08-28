import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';

interface BreakdownOption {
  id: number;
  breakdownNumber: string;
  machineCode: string;
}

interface Rectification {
  id: number;
  rectificationNumber: string;
  breakdownId: number;
  breakdownNumber: string;
  machineCode: string;
  technicianCode: string;
  failureCause: string;
  correctiveAction: string;
  sparePartsUsed: string;
  labourHours: number;
  startTime: string;
  endTime: string;
  downtimeMinutes: number;
  externalVendor: string;
  serviceCost: number;
  testingResult: string;
  status: string;
  remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' },
  OPEN: { color: '#2563eb', bg: '#dbeafe' },
  IN_PROGRESS: { color: '#f59e0b', bg: '#fef3c7' },
  COMPLETED: { color: '#22c55e', bg: '#d4edda' },
  CLOSED: { color: '#6b7280', bg: '#f3f4f6' },
};

const TESTING_RESULTS = ['PASS', 'FAIL', 'PENDING'];

export default function BreakdownRectificationScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Rectification[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rectification | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [res, bdRes] = await Promise.all([
        apiClient.get('/v1/maintenance/breakdown-rectifications'),
        apiClient.get('/v1/maintenance/breakdowns'),
      ]);
      setRows(Array.isArray(res.data) ? res.data : res.data.content ?? []);
      setBreakdowns(Array.isArray(bdRes.data) ? bdRes.data : bdRes.data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/maintenance/breakdown-rectifications/${editId}`, form); toast('Rectification updated.'); }
      else { await apiClient.post('/v1/maintenance/breakdown-rectifications', form); toast('Rectification created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/maintenance/breakdown-rectifications/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try { await apiClient.post(`/v1/maintenance/breakdown-rectifications/${id}/actions/${act}`); toast(`Rectification ${act}.`); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const backToList = () => { setForm({}); setEditId(null); setTab('list'); };
  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const handleBreakdownSelect = (val: string) => {
    const bd = breakdowns.find((b) => String(b.id) === val);
    set('breakdownId', val ? Number(val) : '');
    set('breakdownNumber', bd?.breakdownNumber ?? '');
    set('machineCode', bd?.machineCode ?? '');
  };

  const handleStartTimeChange = (val: string) => {
    set('startTime', val);
    const end = String(form.endTime ?? '');
    if (val && end) {
      const diff = (new Date(end).getTime() - new Date(val).getTime()) / 60000;
      set('downtimeMinutes', Math.max(0, Math.round(diff)));
    }
  };

  const handleEndTimeChange = (val: string) => {
    set('endTime', val);
    const start = String(form.startTime ?? '');
    if (start && val) {
      const diff = (new Date(val).getTime() - new Date(start).getTime()) / 60000;
      set('downtimeMinutes', Math.max(0, Math.round(diff)));
    }
  };

  const filtered = rows.filter((r) => !search || (r.rectificationNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.breakdownNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.machineCode ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head"><h1>Breakdown Rectification</h1><p>Record repair actions for machine breakdowns</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Rectification</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Breakdown *</span>
              <select className="in" value={String(form.breakdownId ?? '')} onChange={(e) => handleBreakdownSelect(e.target.value)}>
                <option value="">Select...</option>
                {breakdowns.map((b) => <option key={b.id} value={b.id}>{b.breakdownNumber}</option>)}
              </select>
            </label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Failure Cause</span><textarea className="in" rows={3} value={String(form.failureCause ?? '')} onChange={(e) => set('failureCause', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Corrective Action</span><textarea className="in" rows={3} value={String(form.correctiveAction ?? '')} onChange={(e) => set('correctiveAction', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Spare Parts Used</span><textarea className="in" rows={3} value={String(form.sparePartsUsed ?? '')} onChange={(e) => set('sparePartsUsed', e.target.value)} /></label>
            <label className="fld"><span>Labour Hours</span><input className="in" type="number" min={0} step="0.5" value={String(form.labourHours ?? '')} onChange={(e) => set('labourHours', Math.max(0, Number(e.target.value)))} /></label>
            <label className="fld"><span>Start Time</span><input className="in" type="datetime-local" value={String(form.startTime ?? '').slice(0, 16)} onChange={(e) => handleStartTimeChange(e.target.value)} /></label>
            <label className="fld"><span>End Time</span><input className="in" type="datetime-local" value={String(form.endTime ?? '').slice(0, 16)} onChange={(e) => handleEndTimeChange(e.target.value)} /></label>
            <label className="fld"><span>Downtime (min)</span><input className="in" type="number" value={String(form.downtimeMinutes ?? '')} readOnly style={{ background: '#f3f4f6' }} /></label>
            <label className="fld"><span>Service Cost</span><input className="in" type="number" min={0} step="0.01" value={String(form.serviceCost ?? '')} onChange={(e) => set('serviceCost', Math.max(0, Number(e.target.value)))} /></label>
            <label className="fld"><span>Testing Result</span>
              <select className="in" value={String(form.testingResult ?? '')} onChange={(e) => set('testingResult', e.target.value)}>
                <option value="">Select...</option>
                {TESTING_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
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
            <input className="in" placeholder="Search rectifications..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '250px' }} />
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }}>+ New Rectification</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>BDR No</th><th>Breakdown No</th><th>Machine</th><th>Technician</th><th>Downtime(min)</th><th>Status</th><th>Result</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><span className="material-symbols-rounded">description</span> No rectifications.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.rectificationNumber}</b></td>
                      <td>{r.breakdownNumber ?? '-'}</td>
                      <td>{r.machineCode}</td>
                      <td>{r.technicianCode}</td>
                      <td>{r.downtimeMinutes ?? '-'}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td>{r.testingResult ?? '-'}</td>
                      <td style={{ position: 'relative' }}>
                        <button className="ibtn" title="Actions" onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === r.id ? null : r.id); }}>
                          <span className="material-symbols-rounded">more_vert</span>
                        </button>
                        {openActionMenu === r.id && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 180, padding: '4px 0' }} onClick={(e) => e.stopPropagation()}>
                            {r.status === 'DRAFT' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'start'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#f59e0b' }}>play_arrow</span> Start</button>}
                            {r.status === 'IN_PROGRESS' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'complete'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#22c55e' }}>check_circle</span> Complete</button>}
                            {r.status === 'COMPLETED' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'pass'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#22c55e' }}>thumb_up</span> Pass</button>}
                            {r.status === 'COMPLETED' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'fail'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#ef4444' }}>thumb_down</span> Fail</button>}
                            {r.status === 'COMPLETED' && r.testingResult === 'PASS' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'close'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#6b7280' }}>lock</span> Close</button>}
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

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.rectificationNumber ?? ''}`} body="Permanently delete?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
