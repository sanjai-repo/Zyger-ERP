import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import QRScanInput from '../../../components/common/QRScanInput';
import StatusBadge from '../../../components/common/StatusBadge';

interface Breakdown {
  id: number;
  breakdownNumber: string;
  breakdownDate: string;
  breakdownTime: string;
  machineCode: string;
  machineStatus: string;
  reportedBy: string;
  operatorCode: string;
  shiftCode: string;
  breakdownCategory: string;
  cncAlarmCode: string;
  problemDescription: string;
  productionImpact: string;
  priority: string;
  assignedTo: string;
  diagnosis: string;
  status: string;
  remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  OPEN: { color: '#2563eb', bg: '#dbeafe' },
  ASSIGNED: { color: '#f59e0b', bg: '#fef3c7' },
  DIAGNOSED: { color: '#0d9488', bg: '#ccfbf1' },
  CLOSED: { color: '#22c55e', bg: '#d4edda' },
  CANCELLED: { color: '#991b1b', bg: '#fde2e2' },
};

const MACHINE_STATUSES = ['RUNNING', 'STOPPED', 'DEGRADED'];
const CATEGORIES = ['MECHANICAL', 'ELECTRICAL', 'HYDRAULIC', 'PNEUMATIC', 'CNC_CONTROL', 'SOFTWARE_PROGRAM', 'LUBRICATION', 'TOOLING', 'COOLING', 'OTHER'];
const IMPACTS = ['NONE', 'MINOR', 'MODERATE', 'SEVERE', 'CRITICAL'];
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function BreakdownIntimationScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Breakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Breakdown | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  const [actionTarget, setActionTarget] = useState<{ id: number; action: string } | null>(null);
  const [actionNote, setActionNote] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/maintenance/breakdowns');
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!String(form.machineCode ?? '').trim()) { toast('Machine Code is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/maintenance/breakdowns/${editId}`, form); toast('Breakdown updated.'); }
      else { await apiClient.post('/v1/maintenance/breakdowns', form); toast('Breakdown created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/maintenance/breakdowns/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string, note?: string) => {
    setBusy(true);
    try {
      await apiClient.post(`/v1/maintenance/breakdowns/${id}/actions/${act}`, note ? { note } : undefined);
      toast(`Breakdown ${act}.`); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
    setBusy(false);
  };

  const backToList = () => { setForm({}); setEditId(null); setTab('list'); };
  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));
  const filtered = rows.filter((r) => !search || (r.breakdownNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.machineCode ?? '').toLowerCase().includes(search.toLowerCase()) || (r.breakdownCategory ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head"><h1>Breakdown Intimation</h1><p>Record and track machine breakdowns</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Breakdown</h2></div>
          <QRScanInput label="Scan Machine QR" placeholder="Scan or type machine code…" onScan={(code) => set('machineCode', code)} />
          <div className="fgrid">
            <label className="fld"><span>Breakdown Date</span><input className="in" type="date" value={String(form.breakdownDate ?? '').slice(0, 10)} onChange={(e) => set('breakdownDate', e.target.value)} /></label>
            <label className="fld"><span>Breakdown Time</span><input className="in" type="time" value={String(form.breakdownTime ?? '').slice(0, 5)} onChange={(e) => set('breakdownTime', e.target.value)} /></label>
            <label className="fld"><span>Machine Code *</span><input className="in" value={String(form.machineCode ?? '')} onChange={(e) => set('machineCode', e.target.value)} /></label>
            <label className="fld"><span>Machine Status</span>
              <select className="in" value={String(form.machineStatus ?? '')} onChange={(e) => set('machineStatus', e.target.value)}>
                <option value="">Select...</option>
                {MACHINE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="fld"><span>Reported By</span><input className="in" value={String(form.reportedBy ?? '')} onChange={(e) => set('reportedBy', e.target.value)} /></label>
            <label className="fld"><span>Operator Code</span><input className="in" value={String(form.operatorCode ?? '')} onChange={(e) => set('operatorCode', e.target.value)} /></label>
            <label className="fld"><span>Shift Code</span><input className="in" value={String(form.shiftCode ?? '')} onChange={(e) => set('shiftCode', e.target.value)} /></label>
            <label className="fld"><span>Breakdown Category</span>
              <select className="in" value={String(form.breakdownCategory ?? '')} onChange={(e) => set('breakdownCategory', e.target.value)}>
                <option value="">Select...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="fld"><span>CNC Alarm Code</span><input className="in" value={String(form.cncAlarmCode ?? '')} onChange={(e) => set('cncAlarmCode', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Problem Description</span><textarea className="in" rows={3} value={String(form.problemDescription ?? '')} onChange={(e) => set('problemDescription', e.target.value)} /></label>
            <label className="fld"><span>Production Impact</span>
              <select className="in" value={String(form.productionImpact ?? '')} onChange={(e) => set('productionImpact', e.target.value)}>
                <option value="">Select...</option>
                {IMPACTS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>
            <label className="fld"><span>Priority</span>
              <select className="in" value={String(form.priority ?? '')} onChange={(e) => set('priority', e.target.value)}>
                <option value="">Select...</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="fld"><span>Assigned To</span><input className="in" value={String(form.assignedTo ?? '')} onChange={(e) => set('assignedTo', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Diagnosis</span><textarea className="in" rows={3} value={String(form.diagnosis ?? '')} onChange={(e) => set('diagnosis', e.target.value)} /></label>
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
            <input className="in" placeholder="Search breakdowns..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '250px' }} />
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }}>+ New Breakdown</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>BDI No</th><th>Machine</th><th>Category</th><th>Priority</th><th>Status</th><th>Reported By</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">description</span> No breakdowns.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.breakdownNumber}</b></td>
                      <td>{r.machineCode}</td>
                      <td>{(r.breakdownCategory ?? '').replace(/_/g, ' ')}</td>
                      <td>{r.priority ?? '-'}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td>{r.reportedBy ?? '-'}</td>
                      <td style={{ position: 'relative' }}>
                        <button className="ibtn" title="Actions" onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === r.id ? null : r.id); }}>
                          <span className="material-symbols-rounded">more_vert</span>
                        </button>
                        {openActionMenu === r.id && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 180, padding: '4px 0' }} onClick={(e) => e.stopPropagation()}>
                            {r.status === 'OPEN' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setActionTarget({ id: r.id, action: 'assign' }); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#f59e0b' }}>person_add</span> Assign</button>}
                            {r.status === 'ASSIGNED' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setActionTarget({ id: r.id, action: 'diagnose' }); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#0d9488' }}>search</span> Diagnose</button>}
                            {(r.status === 'OPEN' || r.status === 'ASSIGNED' || r.status === 'DIAGNOSED') && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'close'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#22c55e' }}>check_circle</span> Close</button>}
                            {(r.status === 'OPEN' || r.status === 'ASSIGNED' || r.status === 'DIAGNOSED') && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'cancel'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#991b1b' }}>cancel</span> Cancel</button>}
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                            <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setForm(r as unknown as Record<string, unknown>); setEditId(r.id); setTab('form'); }}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>edit</span> Edit</button>
                            {(r.status === 'OPEN') && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', color: '#ef4444' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setDeleteTarget(r); }}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>delete</span> Delete</button>}
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

      {actionTarget && (
        <div className="search-pop" onClick={() => setActionTarget(null)}>
          <div className="search-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 12px' }}>{actionTarget.action.charAt(0).toUpperCase() + actionTarget.action.slice(1)} Breakdown</h3>
            <label className="fld"><span>Note (optional)</span>
              <input className="in" value={actionNote} onChange={(e) => setActionNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { action(actionTarget.id, actionTarget.action, actionNote); setActionTarget(null); setActionNote(''); } }} autoFocus />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={() => { setActionTarget(null); setActionNote(''); }}>Cancel</button>
              <button className="btn btn-p" onClick={() => { action(actionTarget.id, actionTarget.action, actionNote); setActionTarget(null); setActionNote(''); }} disabled={busy}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.breakdownNumber ?? ''}`} body="Permanently delete?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
