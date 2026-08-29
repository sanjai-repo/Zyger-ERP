import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';

interface ToolService {
  id: number;
  serviceNumber: string;
  toolId: string;
  toolType: string;
  toolDescription: string;
  toolSerialNumber: string;
  currentLocation: string;
  reportedBy: string;
  serviceDate: string;
  problemDescription: string;
  serviceReason: string;
  toolCondition: string;
  priority: string;
  vendor: string;
  vendorId?: number;
  status: string;
  remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' },
  OPEN: { color: '#2563eb', bg: '#dbeafe' },
  ASSIGNED: { color: '#f59e0b', bg: '#fef3c7' },
  IN_PROGRESS: { color: '#f59e0b', bg: '#fef3c7' },
  COMPLETED: { color: '#22c55e', bg: '#d4edda' },
  CLOSED: { color: '#6b7280', bg: '#f3f4f6' },
  CANCELLED: { color: '#991b1b', bg: '#fde2e2' },
};

const TOOL_TYPES = ['CUTTING_TOOL', 'FIXTURE', 'TOOL_HOLDER', 'JIG', 'GAUGE', 'OTHER'];
const SERVICE_REASONS = ['SHARPENING', 'REPAIR', 'INSPECTION', 'REFURBISHMENT', 'REPLACEMENT', 'OTHER'];
const TOOL_CONDITIONS = ['GOOD', 'FAIR', 'POOR', 'DAMAGED'];
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
interface Vendor { id: number; code: string; name: string; }

export default function ToolServiceIntimationScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ToolService[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ToolService | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/maintenance/tool-services');
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    apiClient.get('/v1/maintenance/vendors').then(({ data }) => setVendors(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const save = async () => {
    if (!String(form.toolId ?? '').trim()) { toast('Tool ID is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/maintenance/tool-services/${editId}`, form); toast('Tool service updated.'); }
      else { await apiClient.post('/v1/maintenance/tool-services', form); toast('Tool service created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/maintenance/tool-services/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try { await apiClient.post(`/v1/maintenance/tool-services/${id}/actions/${act}`); toast(`Tool service ${act}.`); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const backToList = () => { setForm({}); setEditId(null); setTab('list'); };
  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));
  const filtered = rows.filter((r) => !search || (r.serviceNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.toolId ?? '').toLowerCase().includes(search.toLowerCase()) || (r.toolType ?? '').toLowerCase().includes(search.toLowerCase()) || (r.problemDescription ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head"><h1>Tool Service Intimation</h1><p>Track tool sharpening, repair and service requests</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Tool Service</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Tool ID *</span><input className="in" value={String(form.toolId ?? '')} onChange={(e) => set('toolId', e.target.value)} /></label>
            <label className="fld"><span>Tool Type</span>
              <select className="in" value={String(form.toolType ?? '')} onChange={(e) => set('toolType', e.target.value)}>
                <option value="">Select...</option>
                {TOOL_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="fld"><span>Tool Description</span><input className="in" value={String(form.toolDescription ?? '')} onChange={(e) => set('toolDescription', e.target.value)} /></label>
            <label className="fld"><span>Serial Number</span><input className="in" value={String(form.toolSerialNumber ?? '')} onChange={(e) => set('toolSerialNumber', e.target.value)} /></label>
            <label className="fld"><span>Current Location</span><input className="in" value={String(form.currentLocation ?? '')} onChange={(e) => set('currentLocation', e.target.value)} /></label>
            <label className="fld"><span>Reported By</span><input className="in" value={String(form.reportedBy ?? '')} onChange={(e) => set('reportedBy', e.target.value)} /></label>
            <label className="fld"><span>Service Date</span><input className="in" type="date" value={String(form.serviceDate ?? '').slice(0, 10)} onChange={(e) => set('serviceDate', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Problem Description</span><textarea className="in" rows={3} value={String(form.problemDescription ?? '')} onChange={(e) => set('problemDescription', e.target.value)} /></label>
            <label className="fld"><span>Service Reason</span>
              <select className="in" value={String(form.serviceReason ?? '')} onChange={(e) => set('serviceReason', e.target.value)}>
                <option value="">Select...</option>
                {SERVICE_REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="fld"><span>Tool Condition</span>
              <select className="in" value={String(form.toolCondition ?? '')} onChange={(e) => set('toolCondition', e.target.value)}>
                <option value="">Select...</option>
                {TOOL_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="fld"><span>Priority</span>
              <select className="in" value={String(form.priority ?? '')} onChange={(e) => set('priority', e.target.value)}>
                <option value="">Select...</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="fld"><span>Vendor</span>
              <select className="in" value={String(form.vendorId ?? '')} onChange={(e) => { const vid = e.target.value ? Number(e.target.value) : ''; set('vendorId', vid); const v = vendors.find((x) => x.id === vid); set('vendor', v ? v.name : null); }}>
                <option value="">Select vendor...</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
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
            <input className="in" placeholder="Search tool services..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '250px' }} />
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }}>+ New Tool Service</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>TSI No</th><th>Tool ID</th><th>Type</th><th>Problem</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">description</span> No tool services.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.serviceNumber}</b></td>
                      <td>{r.toolId}</td>
                      <td>{(r.toolType ?? '').replace(/_/g, ' ')}</td>
                      <td>{r.problemDescription ?? '-'}</td>
                      <td>{r.priority ?? '-'}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td style={{ position: 'relative' }}>
                        <button className="ibtn" title="Actions" onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === r.id ? null : r.id); }}>
                          <span className="material-symbols-rounded">more_vert</span>
                        </button>
                        {openActionMenu === r.id && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 180, padding: '4px 0' }} onClick={(e) => e.stopPropagation()}>
                            {r.status === 'OPEN' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'assign'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#f59e0b' }}>person_add</span> Assign</button>}
                            {r.status === 'ASSIGNED' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'start'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#f59e0b' }}>play_arrow</span> In-Progress</button>}
                            {r.status === 'IN_PROGRESS' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'close'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#22c55e' }}>check_circle</span> Close</button>}
                            {r.status !== 'CLOSED' && r.status !== 'CANCELLED' && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); action(r.id, 'cancel'); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#991b1b' }}>cancel</span> Cancel</button>}
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                            <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setForm(r as unknown as Record<string, unknown>); setEditId(r.id); setTab('form'); }}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>edit</span> Edit</button>
                            {(r.status === 'OPEN' || r.status === 'DRAFT') && <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', color: '#ef4444' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setDeleteTarget(r); }}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>delete</span> Delete</button>}
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

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.serviceNumber ?? ''}`} body="Permanently delete this tool service?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
