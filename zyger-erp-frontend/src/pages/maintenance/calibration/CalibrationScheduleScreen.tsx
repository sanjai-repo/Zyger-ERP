import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';

interface CalibrationSchedule {
  id: number;
  scheduleNumber: string;
  instrumentId: string;
  instrumentName: string;
  serialNumber: string;
  rangeValue: string;
  accuracy: string;
  location: string;
  department: string;
  calibrationFrequency: string;
  lastCalibrationDate: string;
  nextDueDate: string;
  calibrationAgency: string;
  calibrationStatus: string;
  status: string;
  remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' },
  ACTIVE: { color: '#2563eb', bg: '#dbeafe' },
  UPCOMING: { color: '#f59e0b', bg: '#fef3c7' },
  OVERDUE: { color: '#991b1b', bg: '#fde2e2' },
  VALID: { color: '#22c55e', bg: '#d4edda' },
  FAILED: { color: '#991b1b', bg: '#fde2e2' },
  APPROVED: { color: '#22c55e', bg: '#d4edda' },
  CANCELLED: { color: '#991b1b', bg: '#fde2e2' },
};

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF-YEARLY', 'YEARLY'];

export default function CalibrationScheduleScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CalibrationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalibrationSchedule | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/maintenance/calibration-schedules');
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!String(form.instrumentId ?? '').trim()) { toast('Instrument ID is required.', 'error'); return; }
    if (!String(form.instrumentName ?? '').trim()) { toast('Instrument Name is required.', 'error'); return; }
    if (!String(form.nextDueDate ?? '').trim()) { toast('Next Due Date is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/maintenance/calibration-schedules/${editId}`, form); toast('Schedule updated.'); }
      else { await apiClient.post('/v1/maintenance/calibration-schedules', form); toast('Schedule created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/maintenance/calibration-schedules/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try { await apiClient.post(`/v1/maintenance/calibration-schedules/${id}/actions/${act}`); toast(`Schedule ${act}.`); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));
  const filtered = rows.filter((r) => !search || (r.scheduleNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.instrumentName ?? '').toLowerCase().includes(search.toLowerCase()) || (r.instrumentId ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head"><h1>Calibration Schedule</h1><p>Manage instrument calibration schedules</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Calibration Schedule</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Schedule No</span><input className="in" value={String(form.scheduleNumber ?? '')} readOnly /></label>
            <label className="fld"><span>Instrument ID *</span><input className="in" value={String(form.instrumentId ?? '')} onChange={(e) => set('instrumentId', e.target.value)} /></label>
            <label className="fld"><span>Instrument Name *</span><input className="in" value={String(form.instrumentName ?? '')} onChange={(e) => set('instrumentName', e.target.value)} /></label>
            <label className="fld"><span>Serial Number</span><input className="in" value={String(form.serialNumber ?? '')} onChange={(e) => set('serialNumber', e.target.value)} /></label>
            <label className="fld"><span>Range</span><input className="in" value={String(form.rangeValue ?? '')} onChange={(e) => set('rangeValue', e.target.value)} /></label>
            <label className="fld"><span>Accuracy</span><input className="in" value={String(form.accuracy ?? '')} onChange={(e) => set('accuracy', e.target.value)} /></label>
            <label className="fld"><span>Location</span><input className="in" value={String(form.location ?? '')} onChange={(e) => set('location', e.target.value)} /></label>
            <label className="fld"><span>Department</span><input className="in" value={String(form.department ?? '')} onChange={(e) => set('department', e.target.value)} /></label>
            <label className="fld"><span>Frequency *</span>
              <select className="in" value={String(form.calibrationFrequency ?? '')} onChange={(e) => set('calibrationFrequency', e.target.value)}>
                <option value="">Select...</option>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f.replace(/-/g, ' ')}</option>)}
              </select>
            </label>
            <label className="fld"><span>Last Calibration Date</span><input className="in" type="date" value={String(form.lastCalibrationDate ?? '').slice(0, 10)} onChange={(e) => set('lastCalibrationDate', e.target.value)} /></label>
            <label className="fld"><span>Next Due Date *</span><input className="in" type="date" value={String(form.nextDueDate ?? '').slice(0, 10)} onChange={(e) => set('nextDueDate', e.target.value)} /></label>
            <label className="fld"><span>Calibration Agency</span><input className="in" value={String(form.calibrationAgency ?? '')} onChange={(e) => set('calibrationAgency', e.target.value)} /></label>
            <label className="fld"><span>Calibration Status</span><input className="in" value={String(form.calibrationStatus ?? '')} readOnly /></label>
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
            <input className="in" placeholder="Search schedules..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '250px' }} />
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }}>+ New Schedule</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th className="num">S.No</th><th>CLS No</th><th>Instrument</th><th>Serial No</th><th>Frequency</th><th>Next Due</th><th>Cal Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><span className="material-symbols-rounded">description</span> No schedules.</div></td></tr> : filtered.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="num mut">{idx + 1}</td>
                      <td><b>{r.scheduleNumber}</b></td>
                      <td>{r.instrumentName}</td>
                      <td>{r.serialNumber ?? '-'}</td>
                      <td>{(r.calibrationFrequency ?? '').replace(/-/g, ' ')}</td>
                      <td>{r.nextDueDate ?? '-'}</td>
                      <td><StatusBadge status={r.calibrationStatus ?? '-'} variant={SC} /></td>
                      <td>
                        <div style={{ position: 'relative' }}>
                          <button className="ibtn" title="Actions" onClick={() => setOpenActionMenu(openActionMenu === r.id ? null : r.id)}><span className="material-symbols-rounded">more_vert</span></button>
                          {openActionMenu === r.id && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.12)', zIndex: 10, minWidth: 160 }}>
                              {r.status === 'ACTIVE' && <button className="ibtn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { action(r.id, 'send-for-calibration'); setOpenActionMenu(null); }}>Send for Calibration</button>}
                              {r.status === 'ACTIVE' && <button className="ibtn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { action(r.id, 'mark-valid'); setOpenActionMenu(null); }}>Mark Valid</button>}
                              {r.status === 'ACTIVE' && <button className="ibtn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { action(r.id, 'mark-failed'); setOpenActionMenu(null); }}>Mark Failed</button>}
                              {r.status !== 'CANCELLED' && <button className="ibtn" style={{ width: '100%', textAlign: 'left', color: '#991b1b' }} onClick={() => { action(r.id, 'deactivate'); setOpenActionMenu(null); }}>Deactivate</button>}
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

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.scheduleNumber ?? ''}`} body="Permanently delete?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
