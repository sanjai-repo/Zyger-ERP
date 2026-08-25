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
}

interface ToolRectification {
  id: number;
  rectificationNumber: string;
  serviceId: number;
  serviceNumber: string;
  toolId: string;
  technicianCode: string;
  rootCause: string;
  correctiveAction: string;
  serviceStart: string;
  serviceEnd: string;
  partsUsed: string;
  serviceCost: number;
  toolConditionAfter: string;
  result: string;
  status: string;
  remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' },
  OPEN: { color: '#2563eb', bg: '#dbeafe' },
  IN_PROGRESS: { color: '#f59e0b', bg: '#fef3c7' },
  COMPLETED: { color: '#22c55e', bg: '#d4edda' },
  CLOSED: { color: '#6b7280', bg: '#f3f4f6' },
  CANCELLED: { color: '#991b1b', bg: '#fde2e2' },
  PASS: { color: '#22c55e', bg: '#d4edda' },
  FAIL: { color: '#991b1b', bg: '#fde2e2' },
  PENDING: { color: '#f59e0b', bg: '#fef3c7' },
};

const CONDITIONS = ['GOOD', 'FAIR', 'POOR', 'DAMAGED'];

export default function ToolServiceRectificationScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ToolRectification[]>([]);
  const [services, setServices] = useState<ToolService[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ToolRectification | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/maintenance/tool-rectifications');
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  const loadServices = async () => {
    try {
      const { data } = await apiClient.get('/v1/maintenance/tool-services');
      setServices(Array.isArray(data) ? data : data.content ?? []);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); loadServices(); }, []);

  const save = async () => {
    if (!String(form.technicianCode ?? '').trim()) { toast('Technician Code is required.', 'error'); return; }
    if (!form.serviceId) { toast('Service is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/maintenance/tool-rectifications/${editId}`, form); toast('Rectification updated.'); }
      else { await apiClient.post('/v1/maintenance/tool-rectifications', form); toast('Rectification created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/maintenance/tool-rectifications/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try { await apiClient.post(`/v1/maintenance/tool-rectifications/${id}/actions/${act}`); toast(`Rectification ${act}.`); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const backToList = () => { setForm({}); setEditId(null); setTab('list'); };
  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const handleServiceChange = (serviceId: number) => {
    const svc = services.find((s) => s.id === serviceId);
    setForm((c) => ({ ...c, serviceId, serviceNumber: svc?.serviceNumber ?? '', toolId: svc?.toolId ?? '' }));
  };

  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  const filtered = rows.filter((r) => !search || (r.rectificationNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.serviceNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.toolId ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head"><h1>Tool Service Rectification</h1><p>Track and manage tool service rectifications</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Tool Service Rectification</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Rectification No</span><input className="in" value={String(form.rectificationNumber ?? '')} readOnly /></label>
            <label className="fld"><span>Service *</span>
              <select className="in" value={String(form.serviceId ?? '')} onChange={(e) => handleServiceChange(Number(e.target.value))} disabled={Boolean(editId)}>
                <option value="">Select...</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.serviceNumber}</option>)}
              </select>
            </label>
            <label className="fld"><span>Service No</span><input className="in" value={String(form.serviceNumber ?? '')} readOnly /></label>
            <label className="fld"><span>Tool ID</span><input className="in" value={String(form.toolId ?? '')} readOnly /></label>
            <label className="fld"><span>Technician Code *</span><input className="in" value={String(form.technicianCode ?? '')} onChange={(e) => set('technicianCode', e.target.value)} /></label>
            <label className="fld"><span>Root Cause</span><textarea className="in" rows={2} value={String(form.rootCause ?? '')} onChange={(e) => set('rootCause', e.target.value)} /></label>
            <label className="fld"><span>Corrective Action</span><textarea className="in" rows={2} value={String(form.correctiveAction ?? '')} onChange={(e) => set('correctiveAction', e.target.value)} /></label>
            <label className="fld"><span>Service Start</span><input className="in" type="datetime-local" value={String(form.serviceStart ?? '').slice(0, 16)} onChange={(e) => set('serviceStart', e.target.value)} /></label>
            <label className="fld"><span>Service End</span><input className="in" type="datetime-local" value={String(form.serviceEnd ?? '').slice(0, 16)} onChange={(e) => set('serviceEnd', e.target.value)} /></label>
            <label className="fld"><span>Parts Used</span><textarea className="in" rows={2} value={String(form.partsUsed ?? '')} onChange={(e) => set('partsUsed', e.target.value)} /></label>
            <label className="fld"><span>Service Cost</span><input className="in" type="number" value={String(form.serviceCost ?? 0)} onChange={(e) => set('serviceCost', Number(e.target.value))} /></label>
            <label className="fld"><span>Tool Condition After</span>
              <select className="in" value={String(form.toolConditionAfter ?? '')} onChange={(e) => set('toolConditionAfter', e.target.value)}>
                <option value="">Select...</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="fld"><span>Result</span>
              <select className="in" value={String(form.result ?? '')} onChange={(e) => set('result', e.target.value)}>
                <option value="">Select...</option>
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
                <option value="PENDING">PENDING</option>
              </select>
            </label>
            <label className="fld"><span>Status</span><input className="in" value={String(form.status ?? '')} readOnly /></label>
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
                <thead><tr><th>TSR No</th><th>Service No</th><th>Tool ID</th><th>Technician</th><th>Cost</th><th>Status</th><th>Result</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><span className="material-symbols-rounded">description</span> No rectifications.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.rectificationNumber}</b></td>
                      <td>{r.serviceNumber}</td>
                      <td>{r.toolId}</td>
                      <td>{r.technicianCode}</td>
                      <td>{r.serviceCost ?? 0}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td>{r.result ? <StatusBadge status={r.result} variant={SC} /> : '-'}</td>
                      <td>
                        <div style={{ position: 'relative' }}>
                          <button className="ibtn" title="Actions" onClick={() => setOpenActionMenu(openActionMenu === r.id ? null : r.id)}><span className="material-symbols-rounded">more_vert</span></button>
                          {openActionMenu === r.id && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.12)', zIndex: 10, minWidth: 140 }}>
                              {r.status === 'IN_PROGRESS' && <button className="ibtn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { action(r.id, 'complete'); setOpenActionMenu(null); }}>Complete</button>}
                              {r.status === 'COMPLETED' && r.result !== 'PASS' && <button className="ibtn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { action(r.id, 'pass'); setOpenActionMenu(null); }}>Pass</button>}
                              {r.status === 'COMPLETED' && r.result !== 'FAIL' && <button className="ibtn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { action(r.id, 'fail'); setOpenActionMenu(null); }}>Fail</button>}
                              {r.status === 'COMPLETED' && <button className="ibtn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { action(r.id, 'close'); setOpenActionMenu(null); }}>Close</button>}
                              <button className="ibtn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setForm(r as unknown as Record<string, unknown>); setEditId(r.id); setTab('form'); setOpenActionMenu(null); }}>Edit</button>
                              <button className="ibtn" style={{ width: '100%', textAlign: 'left', color: '#991b1b' }} onClick={() => { setDeleteTarget(r); setOpenActionMenu(null); }}>Delete</button>
                            </div>
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

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.rectificationNumber ?? ''}`} body="Permanently delete?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
