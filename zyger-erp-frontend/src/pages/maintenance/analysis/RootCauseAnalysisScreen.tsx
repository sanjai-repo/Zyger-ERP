import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';

interface RCA {
  id: number; rcaNumber: string; machineCode: string; breakdownId: number; breakdownNumber: string;
  problemDescription: string; immediateCause: string; rootCause: string; contributingCause: string;
  correctiveAction: string; preventiveAction: string; responsiblePerson: string; targetDate: string;
  verificationDate: string; verifiedBy: string; status: string; remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  OPEN: { color: '#2563eb', bg: '#dbeafe' }, IN_PROGRESS: { color: '#f59e0b', bg: '#fef3c7' },
  VERIFIED: { color: '#22c55e', bg: '#d4edda' }, CLOSED: { color: '#6b7280', bg: '#f3f4f6' },
  CANCELLED: { color: '#991b1b', bg: '#fde2e2' },
};

interface RootCauseCodeMaster { id: number; code: string; description: string; }

export default function RootCauseAnalysisScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<RCA[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RCA | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [actionNote, setActionNote] = useState('');
  const [actionTarget, setActionTarget] = useState<{ id: number; action: string } | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  const [rootCauseCodes, setRootCauseCodes] = useState<RootCauseCodeMaster[]>([]);

  const load = async () => {
    setLoading(true);
    try { const { data } = await apiClient.get('/v1/maintenance/rca'); setRows(Array.isArray(data) ? data : data.content ?? []); }
    catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    apiClient.get('/v1/maintenance/root-cause-codes').then(({ data }) => setRootCauseCodes(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const save = async () => {
    if (!String(form.machineCode ?? '').trim() && !String(form.breakdownId ?? '').trim()) { toast('Machine or Breakdown reference required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/maintenance/rca/${editId}`, form); toast('RCA updated.'); }
      else { await apiClient.post('/v1/maintenance/rca', form); toast('RCA created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/maintenance/rca/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try {
      await apiClient.post(`/v1/maintenance/rca/${id}/actions/${act}`, actionNote ? { note: actionNote } : undefined);
      toast(`RCA ${act}.`); setActionNote(''); setActionTarget(null); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));
  const filtered = rows.filter((r) => !search || (r.rcaNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.machineCode ?? '').toLowerCase().includes(search.toLowerCase()) || (r.rootCause ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head"><h1>Root Cause Analysis</h1><p>Identify and resolve recurring equipment failure root causes</p></div>

      {actionTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}
          onClick={() => { setActionTarget(null); setActionNote(''); }}>
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 12, padding: 20, minWidth: 380, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>{actionTarget.action.toUpperCase()} RCA</h3>
            <label className="fld"><span>Note {actionTarget.action === 'verify' ? '*' : ''}</span>
              <textarea className="in" rows={3} placeholder="Enter note..." value={actionNote} onChange={(e) => setActionNote(e.target.value)} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={() => { setActionTarget(null); setActionNote(''); }}>Cancel</button>
              <button className="btn btn-p" onClick={() => action(actionTarget.id, actionTarget.action)} disabled={busy}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Root Cause Analysis</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Machine Code *</span><input className="in" value={String(form.machineCode ?? '')} onChange={(e) => set('machineCode', e.target.value)} /></label>
            <label className="fld"><span>Breakdown Number</span><input className="in" value={String(form.breakdownNumber ?? '')} onChange={(e) => set('breakdownNumber', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: '1 / -1' }}><span>Problem Description</span><textarea className="in" rows={2} value={String(form.problemDescription ?? '')} onChange={(e) => set('problemDescription', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: '1 / -1' }}><span>Immediate Cause</span><textarea className="in" rows={2} value={String(form.immediateCause ?? '')} onChange={(e) => set('immediateCause', e.target.value)} /></label>
            <label className="fld"><span>Root Cause Code</span>
              <select className="in" value={String(form.rootCauseCodeId ?? '')} onChange={(e) => set('rootCauseCodeId', e.target.value)}>
                <option value="">Select...</option>
                {rootCauseCodes.map((rc) => <option key={rc.id} value={rc.id}>{rc.code} — {rc.description}</option>)}
              </select>
            </label>
            <label className="fld" style={{ gridColumn: '1 / -1' }}><span>Root Cause (5 Whys)</span><textarea className="in" rows={3} value={String(form.rootCause ?? '')} onChange={(e) => set('rootCause', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: '1 / -1' }}><span>Contributing Cause</span><textarea className="in" rows={2} value={String(form.contributingCause ?? '')} onChange={(e) => set('contributingCause', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: '1 / -1' }}><span>Corrective Action</span><textarea className="in" rows={2} value={String(form.correctiveAction ?? '')} onChange={(e) => set('correctiveAction', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: '1 / -1' }}><span>Preventive Action</span><textarea className="in" rows={2} value={String(form.preventiveAction ?? '')} onChange={(e) => set('preventiveAction', e.target.value)} /></label>
            <label className="fld"><span>Responsible Person</span><input className="in" value={String(form.responsiblePerson ?? '')} onChange={(e) => set('responsiblePerson', e.target.value)} /></label>
            <label className="fld"><span>Target Date</span><input className="in" type="date" value={String(form.targetDate ?? '').slice(0, 10)} onChange={(e) => set('targetDate', e.target.value)} /></label>
            <label className="fld"><span>Remarks</span><input className="in" value={String(form.remarks ?? '')} onChange={(e) => set('remarks', e.target.value)} /></label>
          </div>
          <div className="actbar">
            <span className="lft">{editId && <button className="btn" onClick={() => { setForm({}); setEditId(null); setTab('list'); }} disabled={busy}>Cancel</button>}</span>
            <button className="btn" onClick={() => { setForm({}); setEditId(null); setTab('list'); }}>Back</button>
            <button className="btn btn-p" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create'}</button>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <div className="panel">
          <div className="toolbar" style={{ gap: '8px', justifyContent: 'flex-start' }}>
            <input className="in" placeholder="Search RCA..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '250px' }} />
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }}>+ New RCA</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>RCA No</th><th>Machine</th><th>Problem</th><th>Root Cause</th><th>Responsible</th><th>Target Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><span className="material-symbols-rounded">description</span> No RCA records.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.rcaNumber}</b></td>
                      <td>{r.machineCode ?? '-'}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.problemDescription ?? '-'}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.rootCause ?? '-'}</td>
                      <td>{r.responsiblePerson ?? '-'}</td>
                      <td>{r.targetDate ?? '-'}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td style={{ position: 'relative' }}>
                        <button className="ibtn" onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === r.id ? null : r.id); }}>
                          <span className="material-symbols-rounded">more_vert</span>
                        </button>
                        {openActionMenu === r.id && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 160, padding: '4px 0' }} onClick={(e) => e.stopPropagation()}>
                            {r.status === 'OPEN' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setActionTarget({ id: r.id, action: 'verify' }); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#22c55e' }}>verified</span> Verify</button>}
                            {r.status === 'VERIFIED' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'close'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#6b7280' }}>lock</span> Close</button>}
                            {r.status === 'CLOSED' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'reopen'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#2563eb' }}>reopen_in_new</span> Reopen</button>}
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                            <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setForm(r as unknown as Record<string, unknown>); setEditId(r.id); setTab('form'); }}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>edit</span> Edit</button>
                            <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setDeleteTarget(r); }}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>delete</span> Delete</button>
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

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.rcaNumber ?? ''}`} body="Permanently delete?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
