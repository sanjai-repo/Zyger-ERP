import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';

interface BreakdownOption {
  id: number;
  breakdownNumber: string;
  machineCode: string;
  breakdownTime: string;
  cncAlarmCode: string;
  problemDescription: string;
  status: string;
}

interface Rectification {
  id: number;
  rectificationNumber: string;
  breakdownId: number;
  breakdownNumber: string;
  machineCode: string;
  failureCause: string;
  correctiveAction: string;
  sparePartsUsed: string;
  startTime: string;
  endTime: string;
  downtimeMinutes: number;
  externalVendor: string;
  vendorId?: number;
  serviceCost: number;
  testingResult: string;
  status: string;
  remarks: string;
}

interface Machine { id: number; code: string; name: string; }
interface Vendor { id: number; code: string; name: string; }

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' },
  OPEN: { color: '#2563eb', bg: '#dbeafe' },
  IN_PROGRESS: { color: '#f59e0b', bg: '#fef3c7' },
  COMPLETED: { color: '#22c55e', bg: '#d4edda' },
  CLOSED: { color: '#6b7280', bg: '#f3f4f6' },
};

const TESTING_RESULTS = ['PASS', 'FAIL', 'PENDING'];
const SERVICE_TYPES = ['BRAND SERVICE', 'EXTERNAL SERVICE'];

export default function BreakdownRectificationScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Rectification[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownOption[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [selBd, setSelBd] = useState<BreakdownOption | null>(null);
  const [serviceType, setServiceType] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rectification | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');

  const load = async () => {
    setLoading(true);
    try {
      const [res, bdRes] = await Promise.all([
        apiClient.get('/v1/maintenance/breakdown-rectifications'),
        apiClient.get('/v1/maintenance/breakdowns'),
      ]);
      setRows(Array.isArray(res.data) ? res.data : res.data.content ?? []);
      setBreakdowns((Array.isArray(bdRes.data) ? bdRes.data : bdRes.data.content ?? []).filter((b: BreakdownOption) => b.status !== 'CANCELLED'));
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    apiClient.get('/master/machines').then(({ data }) => setMachines(Array.isArray(data) ? data : [])).catch(() => {});
    apiClient.get('/v1/maintenance/vendors').then(({ data }) => setVendors(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const machineName = (code: string) => machines.find((m) => m.code === code)?.name ?? '-';

  const save = async () => {
    if (!form.breakdownId) { toast('Please select a breakdown.', 'error'); return; }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (serviceType === 'EXTERNAL SERVICE') {
        if (!form.vendorId) { toast('Please select an external vendor.', 'error'); return; }
        payload.vendorId = Number(form.vendorId);
        payload.externalVendor = null;
      } else if (serviceType === 'BRAND SERVICE') {
        payload.vendorId = null;
        payload.externalVendor = 'BRAND SERVICE';
      } else {
        payload.vendorId = null;
        payload.externalVendor = null;
      }
      if (editId) { await apiClient.put(`/v1/maintenance/breakdown-rectifications/${editId}`, payload); toast('Rectification updated.'); }
      else { await apiClient.post('/v1/maintenance/breakdown-rectifications', payload); toast('Rectification created.'); }
      setForm({}); setEditId(null); setSelBd(null); setServiceType(''); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/maintenance/breakdown-rectifications/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try { await apiClient.post(`/v1/maintenance/breakdown-rectifications/${id}/actions/${act}`); toast(`Rectification ${act}.`); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const backToList = () => { setForm({}); setEditId(null); setSelBd(null); setServiceType(''); setTab('list'); };
  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const handleBreakdownSelect = (val: string) => {
    const bd = breakdowns.find((b) => String(b.id) === val);
    set('breakdownId', val ? Number(val) : '');
    setSelBd(bd ?? null);
  };

  const openNew = () => { setForm({}); setEditId(null); setSelBd(null); setServiceType(''); setTab('form'); };

  const openEdit = (r: Rectification) => {
    setForm(r as unknown as Record<string, unknown>);
    setEditId(r.id);
    setSelBd(breakdowns.find((b) => b.id === r.breakdownId) ?? null);
    const ev = r.externalVendor ?? '';
    const vMatch = vendors.find((v) => v.code === ev || v.name === ev);
    if (ev === 'BRAND SERVICE') setServiceType('BRAND SERVICE');
    else if (vMatch) { setServiceType('EXTERNAL SERVICE'); set('vendorId', vMatch.id); }
    else if (ev) { setServiceType('EXTERNAL SERVICE'); set('vendorId', r.vendorId ?? ''); }
    else setServiceType('');
    setTab('form');
  };

  const handleStartTimeChange = (val: string) => {
    set('startTime', val);
    const end = String(form.endTime ?? '');
    if (val && end) {
      const diff = (new Date(end).getTime() - new Date(val).getTime()) / 60000;
      set('downtimeMinutes', Math.max(0, Math.round(diff)));
    }
  };

  const handleEndTimeChange = (val: string) => {
    set('endTime', val);
    const start = String(form.startTime ?? '');
    if (start && val) {
      const diff = (new Date(val).getTime() - new Date(start).getTime()) / 60000;
      set('downtimeMinutes', Math.max(0, Math.round(diff)));
    }
  };

  const filtered = rows.filter((r) => !search || (r.rectificationNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.breakdownNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.machineCode ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pg-head"><h1>Breakdown Rectification</h1><p>Record repair actions for machine breakdowns</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Rectification</h2></div>

          <div className="fgrid">
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Breakdown No. *</span>
              <select className="in" value={String(form.breakdownId ?? '')} onChange={(e) => handleBreakdownSelect(e.target.value)}>
                <option value="">Select breakdown...</option>
                {breakdowns.map((b) => <option key={b.id} value={b.id}>{b.breakdownNumber} — {b.machineCode}</option>)}
              </select>
            </label>
            {selBd && (
              <>
                <label className="fld"><span>Machine Name</span><input className="in" value={machineName(selBd.machineCode)} readOnly style={{ background: '#f3f4f6' }} /></label>
                <label className="fld"><span>Breakdown Time</span><input className="in" value={String(selBd.breakdownTime ?? '').slice(0, 5)} readOnly style={{ background: '#f3f4f6' }} /></label>
                <label className="fld"><span>CNC Alarm Code</span><input className="in" value={String(selBd.cncAlarmCode ?? '')} readOnly style={{ background: '#f3f4f6' }} /></label>
                <label className="fld"><span>Problem Description</span><textarea className="in" rows={3} value={String(selBd.problemDescription ?? '')} readOnly style={{ background: '#f3f4f6' }} /></label>
              </>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />
          <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 600 }}>Rectification</h3>

          <div className="fgrid">
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Failure Cause</span><textarea className="in" rows={3} value={String(form.failureCause ?? '')} onChange={(e) => set('failureCause', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Corrective Action</span><textarea className="in" rows={3} value={String(form.correctiveAction ?? '')} onChange={(e) => set('correctiveAction', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Spare Parts Used</span><textarea className="in" rows={3} value={String(form.sparePartsUsed ?? '')} onChange={(e) => set('sparePartsUsed', e.target.value)} /></label>
            <label className="fld"><span>Start Time</span><input className="in" type="datetime-local" value={String(form.startTime ?? '').slice(0, 16)} onChange={(e) => handleStartTimeChange(e.target.value)} /></label>
            <label className="fld"><span>End Time</span><input className="in" type="datetime-local" value={String(form.endTime ?? '').slice(0, 16)} onChange={(e) => handleEndTimeChange(e.target.value)} /></label>
            <label className="fld"><span>Downtime (min)</span><input className="in" type="number" value={String(form.downtimeMinutes ?? '')} readOnly style={{ background: '#f3f4f6' }} /></label>
            <label className="fld"><span>Service Type</span>
              <select className="in" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                <option value="">Select...</option>
                {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            {serviceType === 'EXTERNAL SERVICE' && (
              <label className="fld"><span>External Vendor *</span>
                <select className="in" value={String(form.vendorId ?? '')} onChange={(e) => set('vendorId', e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Select vendor...</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </label>
            )}
            <label className="fld"><span>Service Cost</span><input className="in" type="number" min={0} step="0.01" value={String(form.serviceCost ?? '')} onChange={(e) => set('serviceCost', Math.max(0, Number(e.target.value)))} /></label>
            <label className="fld"><span>Testing Result</span>
              <select className="in" value={String(form.testingResult ?? '')} onChange={(e) => set('testingResult', e.target.value)}>
                <option value="">Select...</option>
                {TESTING_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
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
            <input className="in" placeholder="Search rectifications..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '250px' }} />
            <button className="btn btn-p" onClick={openNew}>+ New Rectification</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>BDR No</th><th>Breakdown No</th><th>Machine</th><th>Downtime(min)</th><th>Service Cost</th><th>Status</th><th>Result</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><span className="material-symbols-rounded">description</span> No rectifications.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.rectificationNumber}</b></td>
                      <td>{r.breakdownNumber ?? '-'}</td>
                      <td>{r.machineCode}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{machineName(r.machineCode)}</div></td>
                      <td>{r.downtimeMinutes ?? '-'}</td>
                      <td>{r.serviceCost != null ? Number(r.serviceCost).toLocaleString() : '-'}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td>{r.testingResult ?? '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {r.status === 'DRAFT' && <button className="btn btn-sm" onClick={() => action(r.id, 'start')} disabled={busy}>Start</button>}
                          {r.status === 'IN_PROGRESS' && <button className="btn btn-sm" onClick={() => action(r.id, 'complete')} disabled={busy}>Complete</button>}
                          {r.status === 'COMPLETED' && <button className="btn btn-sm btn-g" onClick={() => action(r.id, 'pass')} disabled={busy}>Pass</button>}
                          {r.status === 'COMPLETED' && <button className="btn btn-sm btn-d" onClick={() => action(r.id, 'fail')} disabled={busy}>Fail</button>}
                          {r.status === 'COMPLETED' && r.testingResult === 'PASS' && <button className="btn btn-sm" onClick={() => action(r.id, 'close')} disabled={busy}>Case Close</button>}
                          {r.status === 'DRAFT' || r.status === 'IN_PROGRESS' || r.status === 'COMPLETED' ? (
                            <button className="ibtn" title="Edit" onClick={() => openEdit(r)}>
                              <span className="material-symbols-rounded">edit</span>
                            </button>
                          ) : null}
                          {r.status === 'DRAFT' && (
                            <button className="ibtn" title="Delete" onClick={() => setDeleteTarget(r)}>
                              <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>delete</span>
                            </button>
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
