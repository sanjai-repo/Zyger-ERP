import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';

interface WaterConsumption {
  id: number;
  entryNumber: string;
  readingDate: string;
  meterNumber: string;
  openingReading: number;
  closingReading: number;
  consumption: number;
  unit: string;
  department: string;
  usageType: string;
  shiftCode: string;
  status: string;
  remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' },
  OPEN: { color: '#2563eb', bg: '#dbeafe' },
  VERIFIED: { color: '#22c55e', bg: '#d4edda' },
  APPROVED: { color: '#22c55e', bg: '#d4edda' },
  CANCELLED: { color: '#991b1b', bg: '#fde2e2' },
};

const USAGE_TYPES = ['PRODUCTION', 'COOLING', 'CLEANING', 'PROCESS', 'DOMESTIC', 'OTHER'];

export default function WaterConsumptionScreen() {
  const { toast } = useToast();
  const { can } = useAuth();
  const [rows, setRows] = useState<WaterConsumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WaterConsumption | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/maintenance/water-consumptions');
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.readingDate) { toast('Reading Date is required.', 'error'); return; }
    if (!String(form.meterNumber ?? '').trim()) { toast('Meter Number is required.', 'error'); return; }
    if (form.openingReading === undefined || form.openingReading === null || form.openingReading === '') { toast('Opening Reading is required.', 'error'); return; }
    if (form.closingReading === undefined || form.closingReading === null || form.closingReading === '') { toast('Closing Reading is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/maintenance/water-consumptions/${editId}`, form); toast('Entry updated.'); }
      else { await apiClient.post('/v1/maintenance/water-consumptions', form); toast('Entry created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/maintenance/water-consumptions/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try { await apiClient.post(`/v1/maintenance/water-consumptions/${id}/actions/${act}`); toast(`Entry ${act}.`); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const opening = Number(form.openingReading ?? 0);
  const closing = Number(form.closingReading ?? 0);
  const consumption = closing - opening;

  const filtered = rows.filter((r) => !search || (r.entryNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.meterNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.usageType ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head"><h1>Water Consumption</h1><p>Track and manage water meter readings</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Water Consumption Entry</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Entry No</span><input className="in" value={String(form.entryNumber ?? '')} readOnly /></label>
            <label className="fld"><span>Reading Date *</span><input className="in" type="date" value={String(form.readingDate ?? '').slice(0, 10)} onChange={(e) => set('readingDate', e.target.value)} /></label>
            <label className="fld"><span>Meter Number *</span><input className="in" value={String(form.meterNumber ?? '')} onChange={(e) => set('meterNumber', e.target.value)} /></label>
            <label className="fld"><span>Opening Reading *</span><input className="in" type="number" value={String(form.openingReading ?? '')} onChange={(e) => set('openingReading', Number(e.target.value))} /></label>
            <label className="fld"><span>Closing Reading *</span><input className="in" type="number" value={String(form.closingReading ?? '')} onChange={(e) => set('closingReading', Number(e.target.value))} /></label>
            <label className="fld"><span>Consumption</span><input className="in" value={closing >= opening ? consumption : ''} readOnly /></label>
            <label className="fld"><span>Unit</span><input className="in" value={String(form.unit ?? 'Liters')} onChange={(e) => set('unit', e.target.value)} /></label>
            <label className="fld"><span>Department</span><input className="in" value={String(form.department ?? '')} onChange={(e) => set('department', e.target.value)} /></label>
            <label className="fld"><span>Usage Type</span>
              <select className="in" value={String(form.usageType ?? '')} onChange={(e) => set('usageType', e.target.value)}>
                <option value="">Select...</option>
                {USAGE_TYPES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="fld"><span>Shift Code</span><input className="in" value={String(form.shiftCode ?? '')} onChange={(e) => set('shiftCode', e.target.value)} /></label>
            <label className="fld"><span>Status</span><input className="in" value={String(form.status ?? '')} readOnly /></label>
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
            <input className="in" placeholder="Search entries..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '250px' }} />
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }}>+ New Entry</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th className="num">S.No</th><th>WTC No</th><th>Date</th><th>Meter</th><th>Opening</th><th>Closing</th><th>Consumption</th><th>Usage Type</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={10}><div className="empty"><span className="material-symbols-rounded">description</span> No water entries.</div></td></tr> : filtered.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="num mut">{idx + 1}</td>
                      <td><b>{r.entryNumber}</b></td>
                      <td>{r.readingDate ?? '-'}</td>
                      <td>{r.meterNumber}</td>
                      <td>{r.openingReading}</td>
                      <td>{r.closingReading}</td>
                      <td>{r.consumption ?? '-'}</td>
                      <td>{r.usageType ?? '-'}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td>
                        <div style={{ position: 'relative' }}>
                          <button className="ibtn" title="Actions" onClick={() => setOpenActionMenu(openActionMenu === r.id ? null : r.id)}><span className="material-symbols-rounded">more_vert</span></button>
                          {openActionMenu === r.id && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.12)', zIndex: 10, minWidth: 140 }}>
                              {r.status === 'DRAFT' && <button className="ibtn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { action(r.id, 'verify'); setOpenActionMenu(null); }}>Verify</button>}
                              {r.status === 'VERIFIED' && can('maintenance', 'Approve') && <button className="ibtn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { action(r.id, 'approve'); setOpenActionMenu(null); }}>Approve</button>}
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

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.entryNumber ?? ''}`} body="Permanently delete?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
