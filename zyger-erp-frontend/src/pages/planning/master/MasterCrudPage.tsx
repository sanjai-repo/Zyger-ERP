import { useEffect, useState } from 'react';
import { planningApi } from '../../../services/planning-api';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

interface MasterRow { id: number; code: string; name: string; [k: string]: unknown; }

interface MasterCrudPageProps {
  title: string;
  subtitle: string;
  apiMethod: 'getWorkCenters' | 'getMachines' | 'getOperations' | 'getShifts';
  fields: { key: string; label: string; type?: string; required?: boolean }[];
}

export default function MasterCrudPage({ title, subtitle, apiMethod, fields }: MasterCrudPageProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<MasterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const getResourcePath = () => {
    return apiMethod === 'getWorkCenters' ? 'work-centers'
      : apiMethod === 'getMachines' ? 'machines'
      : apiMethod === 'getOperations' ? 'operations'
      : 'shifts';
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await planningApi[apiMethod]();
      setRows(data as MasterRow[]);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  const openNew = async () => {
    setForm({});
    setEditId(null);
    try {
      const path = getResourcePath();
      const { data } = await apiClient.get(`/master/${path}/next-code`);
      if (data.code) setForm({ code: data.code });
    } catch { /* fallback */ }
  };

  useEffect(() => { load(); openNew(); }, []);

  const save = async () => {
    for (const f of fields) {
      if (f.required && !String(form[f.key] ?? '').trim()) {
        toast(`${f.label} is required.`, 'error');
        return;
      }
    }
    setBusy(true);
    try {
      const path = getResourcePath();
      if (editId) {
        await apiClient.put(`/master/${path}/${editId}`, form);
        toast(`${title} updated.`);
      } else {
        await apiClient.post(`/master/${path}`, form);
        toast(`${title} created.`);
      }
      openNew(); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const path = getResourcePath();
      await apiClient.delete(`/master/${path}/${deleteTarget.id}`);
      toast(`${title} deleted.`);
      setDeleteTarget(null); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  return (
    <>
      <div className="pg-head"><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="panel">
        <div className="panel-h"><h2><span className="material-symbols-rounded">add</span> {editId ? 'Edit' : 'Add'} {title}</h2></div>
        <div className="fgrid">
          {fields.map((f) => (
            <label key={f.key} className="fld">
              <span>{f.label}{f.required ? ' *' : ''}</span>
              <input className="in" type={f.type ?? 'text'} value={String(form[f.key] ?? '')} onChange={(e) => setForm((c) => ({ ...c, [f.key]: e.target.value }))} />
            </label>
          ))}
        </div>
        <div className="actbar">
          <div className="lft">
            <span className="material-symbols-rounded">lock</span>{editId ? 'Editing existing record' : 'Creating new record'}
          </div>
          <div className="rgt">
            {editId && <button className="btn btn-sm" onClick={() => { setForm({}); setEditId(null); }} disabled={busy}><span className="material-symbols-rounded">close</span> Cancel</button>}
            <button className="btn btn-sm btn-p" onClick={save} disabled={busy}><span className="material-symbols-rounded">save</span> {editId ? 'Update' : 'Create'}</button>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="toolbar">
          <div className="searchwrap">
            <span className="material-symbols-rounded">search</span>
            <input className="in" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="count">{rows.filter(r => !search || r.code?.toLowerCase().includes(search.toLowerCase()) || r.name?.toLowerCase().includes(search.toLowerCase())).length} records</span>
        </div>
        <div className="twrap">
          {loading ? (
            <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Code</th><th>Name</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.filter(r => !search || r.code?.toLowerCase().includes(search.toLowerCase()) || r.name?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                  <tr><td colSpan={3}><div className="empty"><span className="material-symbols-rounded">description</span> No records.</div></td></tr>
                ) : rows.filter(r => !search || r.code?.toLowerCase().includes(search.toLowerCase()) || r.name?.toLowerCase().includes(search.toLowerCase())).map((r) => (
                  <tr key={r.id}>
                    <td>{r.code}</td>
                    <td>{r.name}</td>
                    <td>
                      <button className="ibtn" title="Edit" onClick={() => { setForm(r); setEditId(r.id); }}><span className="material-symbols-rounded">edit</span></button>
                      <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(r)}><span className="material-symbols-rounded">delete</span></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.code ?? ''}`} body="Permanently delete this record?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
