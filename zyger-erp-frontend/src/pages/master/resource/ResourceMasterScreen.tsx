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
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/master/resources');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
      setForm(initialForm); setEditId(null); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/master/resources/${deleteTarget.id}`);
      toast('Resource inactivated.');
      setDeleteTarget(null); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const edit = (r: Resource) => {
    setEditId(r.id);
    setForm({
      resourceName: r.resourceName,
      resourceType: r.resourceType, capacity: r.capacity,
      capacityUom: r.capacityUom, department: r.department ?? '', status: r.status || 'Active',
      hourlyRate: r.hourlyRate ?? 0, description: r.description ?? '',
    });
  };

  return (
    <>
      <div className="pg-head">
        <h1>Resource Master</h1>
        <p>FRS §4.3 — Machines, Labour, Tools, Vendors with capacity and type</p>
      </div>

      <div className="panel">
        <div className="panel-h"><h2><span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#2563eb' }}>{editId ? 'edit' : 'add_circle'}</span> {editId ? 'Edit' : 'New'} Resource</h2></div>
        <div className="fgrid">
          <label className="fld"><span>Resource Code</span><input className="in" value={editId ? (rows.find((r) => r.id === editId)?.resourceCode || '') : 'Auto-generated'} readOnly style={{ background: '#f9fafb' }} tabIndex={-1} /></label>
          <label className="fld"><span>Resource Name *</span><input className="in" value={form.resourceName} onChange={(e) => set('resourceName', e.target.value)} /></label>
          <label className="fld"><span>Resource Type *</span>
            <select className="in" value={form.resourceType} onChange={(e) => set('resourceType', e.target.value)}>
              {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="fld"><span>Capacity *</span><input className="in" type="number" min="0.01" step="0.01" value={form.capacity} onChange={(e) => set('capacity', parseFloat(e.target.value) || 0)} /></label>
          <label className="fld"><span>Capacity UOM *</span>
            <select className="in" value={form.capacityUom} onChange={(e) => set('capacityUom', e.target.value)}>
              {CAPACITY_UOMS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label className="fld"><span>Department</span><input className="in" value={form.department} onChange={(e) => set('department', e.target.value)} /></label>
          <label className="fld"><span>Status *</span>
            <select className="in" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="fld"><span>Hourly Rate</span><input className="in" type="number" min="0" step="0.01" value={form.hourlyRate} onChange={(e) => set('hourlyRate', parseFloat(e.target.value) || 0)} /></label>
          <label className="fld" style={{ gridColumn: 'span 2' }}><span>Description</span><input className="in" value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
        </div>
        <div className="actbar">
          <div className="lft">
            <button className="btn btn-sm" onClick={() => { setEditId(null); setForm(initialForm); }}><span className="material-symbols-rounded">arrow_back</span> Back</button>
          </div>
          <div className="rgt">
            <button className="btn btn-sm btn-p" onClick={save} disabled={busy}><span className="material-symbols-rounded">save</span> {editId ? 'Update' : 'Save'}</button>
          </div>
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
                    <button className="btn sm" onClick={() => edit(r)}>Edit</button>
                    <button className="btn sm danger" onClick={() => setDeleteTarget(r)}>Inactivate</button>
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
            <h3>Inactivate Resource</h3>
            <p>Inactivate <b>{deleteTarget.resourceName}</b>? It will be hidden from new selections but retained on existing records.</p>
            <div className="acts">
              <button className="btn btn-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-sm btn-d" onClick={del} disabled={busy}>Inactivate</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
