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
}

interface CalibrationEntry {
  id: number;
  calibrationNumber: string;
  scheduleId: number;
  scheduleNumber: string;
  instrumentId: string;
  instrumentName: string;
  calibrationDate: string;
  calibrationAgency: string;
  certificateNumber: string;
  standardUsed: string;
  observedValues: string;
  permissibleLimits: string;
  result: string;
  nextDueDate: string;
  calibrationCost: number;
  status: string;
  remarks: string;
}

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' },
  PASS: { color: '#22c55e', bg: '#d4edda' },
  FAIL: { color: '#991b1b', bg: '#fde2e2' },
  PENDING: { color: '#f59e0b', bg: '#fef3c7' },
  VERIFIED: { color: '#22c55e', bg: '#d4edda' },
  APPROVED: { color: '#22c55e', bg: '#d4edda' },
};

export default function CalibrationEntryScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CalibrationEntry[]>([]);
  const [schedules, setSchedules] = useState<CalibrationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalibrationEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/maintenance/calibration-entries');
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  const loadSchedules = async () => {
    try {
      const { data } = await apiClient.get('/v1/maintenance/calibration-schedules');
      setSchedules(Array.isArray(data) ? data : data.content ?? []);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); loadSchedules(); }, []);

  const save = async () => {
    if (!form.calibrationDate) { toast('Calibration Date is required.', 'error'); return; }
    if (!String(form.calibrationAgency ?? '').trim()) { toast('Calibration Agency is required.', 'error'); return; }
    if (!form.nextDueDate) { toast('Next Due Date is required.', 'error'); return; }
    if (!form.scheduleId) { toast('Schedule is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) { await apiClient.put(`/v1/maintenance/calibration-entries/${editId}`, form); toast('Entry updated.'); }
      else { await apiClient.post('/v1/maintenance/calibration-entries', form); toast('Entry created.'); }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/maintenance/calibration-entries/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try { await apiClient.post(`/v1/maintenance/calibration-entries/${id}/actions/${act}`); toast(`Entry ${act}.`); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const handleScheduleChange = (scheduleId: number) => {
    const sch = schedules.find((s) => s.id === scheduleId);
    setForm((c) => ({ ...c, scheduleId, scheduleNumber: sch?.scheduleNumber ?? '', instrumentId: sch?.instrumentId ?? '', instrumentName: sch?.instrumentName ?? '' }));
  };

  const filtered = rows.filter((r) => !search || (r.calibrationNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.instrumentName ?? '').toLowerCase().includes(search.toLowerCase()) || (r.instrumentId ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head"><h1>Calibration Entry</h1><p>Record calibration results and certificates</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Calibration Entry</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Calibration No</span><input className="in" value={String(form.calibrationNumber ?? '')} readOnly /></label>
            <label className="fld"><span>Schedule *</span>
              <select className="in" value={String(form.scheduleId ?? '')} onChange={(e) => handleScheduleChange(Number(e.target.value))} disabled={Boolean(editId)}>
                <option value="">Select...</option>
                {schedules.map((s) => <option key={s.id} value={s.id}>{s.scheduleNumber} - {s.instrumentName}</option>)}
              </select>
            </label>
            <label className="fld"><span>Schedule No</span><input className="in" value={String(form.scheduleNumber ?? '')} readOnly /></label>
            <label className="fld"><span>Instrument ID</span><input className="in" value={String(form.instrumentId ?? '')} readOnly /></label>
            <label className="fld"><span>Instrument Name</span><input className="in" value={String(form.instrumentName ?? '')} readOnly /></label>
            <label className="fld"><span>Calibration Date *</span><input className="in" type="date" value={String(form.calibrationDate ?? '').slice(0, 10)} onChange={(e) => set('calibrationDate', e.target.value)} /></label>
            <label className="fld"><span>Calibration Agency *</span><input className="in" value={String(form.calibrationAgency ?? '')} onChange={(e) => set('calibrationAgency', e.target.value)} /></label>
            <label className="fld"><span>Certificate Number</span><input className="in" value={String(form.certificateNumber ?? '')} onChange={(e) => set('certificateNumber', e.target.value)} /></label>
            <label className="fld"><span>Standard Used</span><input className="in" value={String(form.standardUsed ?? '')} onChange={(e) => set('standardUsed', e.target.value)} /></label>
            <label className="fld"><span>Observed Values</span><textarea className="in" rows={2} value={String(form.observedValues ?? '')} onChange={(e) => set('observedValues', e.target.value)} /></label>
            <label className="fld"><span>Permissible Limits</span><textarea className="in" rows={2} value={String(form.permissibleLimits ?? '')} onChange={(e) => set('permissibleLimits', e.target.value)} /></label>
            <label className="fld"><span>Result</span>
              <select className="in" value={String(form.result ?? '')} onChange={(e) => set('result', e.target.value)}>
                <option value="">Select...</option>
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
              </select>
            </label>
            <label className="fld"><span>Next Due Date *</span><input className="in" type="date" value={String(form.nextDueDate ?? '').slice(0, 10)} onChange={(e) => set('nextDueDate', e.target.value)} /></label>
            <label className="fld"><span>Calibration Cost</span><input className="in" type="number" min={0} step="0.01" value={String(form.calibrationCost ?? 0)} onChange={(e) => set('calibrationCost', Math.max(0, Number(e.target.value)))} /></label>
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
                <thead><tr><th>CLE No</th><th>Instrument</th><th>Date</th><th>Agency</th><th>Certificate</th><th>Result</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><span className="material-symbols-rounded">description</span> No calibration entries.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.calibrationNumber}</b></td>
                      <td>{r.instrumentName}</td>
                      <td>{r.calibrationDate ?? '-'}</td>
                      <td>{r.calibrationAgency}</td>
                      <td>{r.certificateNumber ?? '-'}</td>
                      <td>{r.result ? <StatusBadge status={r.result} variant={SC} /> : '-'}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td>
                        <div style={{ position: 'relative' }}>
                          <button className="ibtn" title="Actions" onClick={() => setOpenActionMenu(openActionMenu === r.id ? null : r.id)}><span className="material-symbols-rounded">more_vert</span></button>
                          {openActionMenu === r.id && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.12)', zIndex: 10, minWidth: 140 }}>
                              {r.status === 'DRAFT' && r.result !== 'PASS' && <button className="ibtn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { action(r.id, 'pass'); setOpenActionMenu(null); }}>Pass</button>}
                              {r.status === 'DRAFT' && r.result !== 'FAIL' && <button className="ibtn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { action(r.id, 'fail'); setOpenActionMenu(null); }}>Fail</button>}
                              {r.status === 'DRAFT' && <button className="ibtn" style={{ width: '100%', textAlign: 'left' }} onClick={() => { action(r.id, 'submit'); setOpenActionMenu(null); }}>Submit</button>}
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

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.calibrationNumber ?? ''}`} body="Permanently delete?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
