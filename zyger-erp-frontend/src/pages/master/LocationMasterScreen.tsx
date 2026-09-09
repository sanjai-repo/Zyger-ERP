import { useEffect, useState } from 'react';
import apiClient from '../../api/axiosClient';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';

interface Location {
  id: number; code: string; name?: string; description?: string;
  type?: string; active: boolean;
}

export default function LocationMasterScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/inventory/locations');
      setRows(data);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  const openNew = async () => {
    setForm({ active: true });
    setEditId(null);
    try {
      const { data } = await apiClient.get('/master/locations/next-code');
      setForm((c) => ({ ...c, code: data.code }));
    } catch { /* fallback */ }
  };

  useEffect(() => { load(); openNew(); }, []);

  const save = async () => {
    if (!String(form.code ?? '').trim()) { toast('Code is required.', 'error'); return; }
    if (!String(form.description ?? form.name ?? '').trim()) { toast('Description is required.', 'error'); return; }
    setBusy(true);
    try {
      const payload = { ...form, description: form.description || form.name };
      if (editId) {
        await apiClient.put(`/inventory/locations/${editId}`, payload);
        toast('Location updated.');
      } else {
        await apiClient.post('/inventory/locations', payload);
        toast('Location created.');
      }
      openNew(); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };


  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/inventory/locations/${deleteTarget.id}`);
      toast('Location deleted.');
      setDeleteTarget(null); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  return (
    <>
      <div className="pg-head">
        <h1>Location Master</h1>
        <p>Manage warehouses and storage locations</p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2><span className="material-symbols-rounded">add</span> {editId ? 'Edit' : 'Add'} Location</h2>
        </div>
        <div className="fgrid">
          <label className="fld">
            <span>Code *</span>
            <input className="in" value={String(form.code ?? '')} onChange={(e) => setForm((c) => ({ ...c, code: e.target.value }))} />
          </label>
          <label className="fld">
            <span>Description *</span>
            <input className="in" value={String(form.description ?? form.name ?? '')} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
          </label>
          <label className="fld">
            <span>Type</span>
            <select className="in" value={String(form.type ?? '')} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))}>
              <option value="">Select...</option>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="STORE">Store</option>
              <option value="PRODUCTION">Production Floor</option>
              <option value="QC">Quality Check Area</option>
              <option value="SCRAP">Scrap Area</option>
            </select>
          </label>
          <label className="fld">
            <span>Active</span>
            <select className="in" value={String(form.active ?? 'true')} onChange={(e) => setForm((c) => ({ ...c, active: e.target.value === 'true' }))}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        </div>
        <div className="actbar" style={{ justifyContent: 'flex-end' }}>
          {editId && <button className="btn" onClick={() => { setForm({}); setEditId(null); }} disabled={busy}>Cancel</button>}
          <button className="btn btn-p" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create'}</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <span style={{ color: '#888', fontSize: 13 }}>{rows.length} locations</span>
        </div>
        <div className="twrap">
          {loading ? (
            <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th className="num">S.No</th><th>Code</th><th>Description</th><th>Type</th><th>Active</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty"><span className="material-symbols-rounded">description</span> No locations.</div></td></tr>
                ) : rows.map((r, idx) => (
                  <tr key={r.id}>
                    <td className="num mut">{idx + 1}</td>
                    <td>{r.code}</td>
                    <td>{r.description || r.name || ''}</td>
                    <td>{r.type ?? ''}</td>
                    <td>{r.active ? 'Yes' : 'No'}</td>
                    <td>
                      <button className="ibtn" title="Edit" onClick={() => { setForm(r as unknown as Record<string, unknown>); setEditId(r.id); }}>
                        <span className="material-symbols-rounded">edit</span>
                      </button>
                      <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(r)}>
                        <span className="material-symbols-rounded">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.code ?? ''}`} body="Permanently delete this location?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
