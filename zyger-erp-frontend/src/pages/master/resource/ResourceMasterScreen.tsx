import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import StatusBadge from '../../../components/common/StatusBadge';

interface Resource {
  id: number;
  resourceCode: string;
  resourceName: string;
  resourceType: string;
  capacity: number;
  capacityUom: string;
  department?: string;
  status: string;
  active: boolean;
  hourlyRate?: number;
  description?: string;
}

const RESOURCE_TYPES = ['Machine', 'Labour', 'Tool', 'Vendor'];
const CAPACITY_UOMS = ['Pieces/Hour', 'Kg/Hour', 'Hours', 'Pieces/Day', 'Kg/Day', 'Units/Day'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

const initialForm = {
  resourceName: '', resourceType: 'Machine',
  capacity: 1, capacityUom: 'Pieces/Hour', department: '', status: 'Active',
  hourlyRate: 0, description: '',
};

export default function ResourceMasterScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [nextCode, setNextCode] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const fetchNextCode = async () => {
    try {
      const { data } = await apiClient.get('/master/resources/next-code');
      setNextCode(data.code || '');
    } catch { setNextCode(''); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/master/resources');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetchNextCode();
  }, []);

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.resourceName.trim()) { toast('Resource Name is mandatory.', 'error'); return; }
    if (!form.resourceType) { toast('Resource Type is mandatory.', 'error'); return; }
    if (!form.capacity || form.capacity <= 0) { toast('Capacity must be > 0.', 'error'); return; }
    if (!form.capacityUom) { toast('Capacity UOM is mandatory.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/master/resources/${editId}`, form);
        toast('Resource updated.');
      } else {
        await apiClient.post('/master/resources', form);
        toast('Resource created.');
      }
      setForm(initialForm); setEditId(null); setViewOnly(false); load(); fetchNextCode();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/master/resources/${deleteTarget.id}`);
      toast('Resource deleted.');
      setDeleteTarget(null); load(); fetchNextCode();
    } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const viewResource = (r: Resource) => {
    setViewOnly(true);
    setEditId(r.id);
    setForm({
      resourceName: r.resourceName,
      resourceType: r.resourceType, capacity: r.capacity,
      capacityUom: r.capacityUom, department: r.department ?? '', status: r.status || 'Active',
      hourlyRate: r.hourlyRate ?? 0, description: r.description ?? '',
    });
  };

  const editResource = (r: Resource) => {
    setViewOnly(false);
    setEditId(r.id);
    setForm({
      resourceName: r.resourceName,
      resourceType: r.resourceType, capacity: r.capacity,
      capacityUom: r.capacityUom, department: r.department ?? '', status: r.status || 'Active',
      hourlyRate: r.hourlyRate ?? 0, description: r.description ?? '',
    });
  };

  const resetForm = () => {
    setEditId(null);
    setViewOnly(false);
    setForm(initialForm);
    fetchNextCode();
  };

  return (
    <>
      <div className="pg-head">
        <h1>Resource Master</h1>
        <p>FRS §4.3 — Machines, Labour, Tools, Vendors with capacity and type</p>
      </div>

      <div className="panel">
        <div className="panel-h"><h2><span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#2563eb' }}>{viewOnly ? 'visibility' : editId ? 'edit' : 'add_circle'}</span> {viewOnly ? 'View' : editId ? 'Edit' : 'New'} Resource</h2></div>
        <div className="fgrid">
          <label className="fld"><span>Resource Code *</span><input className="in" value={editId ? (rows.find((r) => r.id === editId)?.resourceCode || '') : (nextCode || 'Loading...')} readOnly style={{ background: '#f9fafb' }} tabIndex={-1} /></label>
          <label className="fld"><span>Resource Name *</span><input className="in" value={form.resourceName} onChange={(e) => set('resourceName', e.target.value)} disabled={viewOnly} /></label>
          <label className="fld"><span>Resource Type *</span>
            <select className="in" value={form.resourceType} onChange={(e) => set('resourceType', e.target.value)} disabled={viewOnly}>
              {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="fld"><span>Capacity *</span><input className="in" type="number" min="0.01" step="0.01" value={form.capacity} onChange={(e) => set('capacity', parseFloat(e.target.value) || 0)} disabled={viewOnly} /></label>
          <label className="fld"><span>Capacity UOM *</span>
            <select className="in" value={form.capacityUom} onChange={(e) => set('capacityUom', e.target.value)} disabled={viewOnly}>
              {CAPACITY_UOMS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label className="fld"><span>Department</span><input className="in" value={form.department} onChange={(e) => set('department', e.target.value)} disabled={viewOnly} /></label>
          <label className="fld"><span>Status *</span>
            <select className="in" value={form.status} onChange={(e) => set('status', e.target.value)} disabled={viewOnly}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="fld"><span>Hourly Rate</span><input className="in" type="number" min="0" step="0.01" value={form.hourlyRate} onChange={(e) => set('hourlyRate', parseFloat(e.target.value) || 0)} disabled={viewOnly} /></label>
          <label className="fld" style={{ gridColumn: 'span 2' }}><span>Description</span><input className="in" value={form.description} onChange={(e) => set('description', e.target.value)} disabled={viewOnly} /></label>
        </div>
        <div className="actbar">
          <div className="lft">
            <button className="btn btn-sm" onClick={resetForm}><span className="material-symbols-rounded">arrow_back</span> Back</button>
          </div>
          {!viewOnly && (
            <div className="rgt">
              <button className="btn btn-sm btn-p" onClick={save} disabled={busy}><span className="material-symbols-rounded">save</span> {editId ? 'Update' : 'Save'}</button>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-h"><h2>Resources ({rows.length})</h2></div>
        {loading ? <div className="empty">Loading...</div> : (
          <table className="tbl">
            <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Capacity</th><th>UOM</th><th>Dept</th><th>Rate</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.resourceCode}</td><td>{r.resourceName}</td>
                  <td><StatusBadge status={r.resourceType} /></td>
                  <td>{r.capacity}</td><td>{r.capacityUom}</td>
                  <td>{r.department || '—'}</td>
                  <td>{r.hourlyRate ? `₹${r.hourlyRate}` : '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button className="ibtn" title="View" onClick={() => viewResource(r)}>
                        <span className="material-symbols-rounded">visibility</span>
                      </button>
                      <button className="ibtn" title="Edit" onClick={() => editResource(r)}>
                        <span className="material-symbols-rounded">edit</span>
                      </button>
                      <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(r)}>
                        <span className="material-symbols-rounded">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="empty">No resources found</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <div className="mwrap" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Resource</h3>
            <p>Delete <b>{deleteTarget.resourceName}</b> ({deleteTarget.resourceCode})?</p>
            <div className="acts">
              <button className="btn btn-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-sm btn-d" onClick={del} disabled={busy}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
