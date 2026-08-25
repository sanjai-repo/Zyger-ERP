import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import QRScanInput from '../../../components/common/QRScanInput';
import StatusBadge from '../../../components/common/StatusBadge';
import { printDocument as printDoc } from '../../../utils/printDocument';
import { exportToCsv } from '../../../utils/csvExport';
import { enqueue } from '../../../utils/offlineQueue';
import { usePendingSyncCount } from '../../../hooks/usePendingSyncCount';
import { useTabs } from '../../../contexts/TabsContext';

interface ProductionEntry {
  id: number;
  entryNumber: string;
  workOrderNumber: string;
  jobCardNumber: string;
  subjobNumber: string;
  partCode: string;
  partDescription: string;
  operationCode: string;
  operationSequence: number;
  machineCode: string;
  operatorCode: string;
  shiftCode: string;
  productionDate: string;
  startTime: string;
  endTime: string;
  producedQuantity: number;
  goodQuantity: number;
  reworkQuantity: number;
  rejectedQuantity: number;
  scrapQuantity: number;
  status: string;
  qualityStatus: string;
  remarks: string;
}

interface MasterOption { id: number; code: string; name?: string; }

const SC: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' }, SUBMITTED: { color: '#2563eb', bg: '#dbeafe' },
  APPROVED: { color: '#22c55e', bg: '#d4edda' }, REJECTED: { color: '#ef4444', bg: '#f8d7da' },
  CANCELLED: { color: '#991b1b', bg: '#fde2e2' },
};

const QS: Record<string, { color: string; bg: string }> = {
  PENDING: { color: '#888', bg: '#e9ecef' }, PASS: { color: '#22c55e', bg: '#d4edda' },
  FAIL: { color: '#ef4444', bg: '#f8d7da' }, HOLD: { color: '#f59e0b', bg: '#fef3c7' },
};

export default function ProductionEntryScreen() {
  const { toast } = useToast();
  const { can } = useAuth();
  const pendingCount = usePendingSyncCount();
  const { closeTab } = useTabs();
  const backToList = () => closeTab('production-entry');
  const [rows, setRows] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductionEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [jcLookup, setJcLookup] = useState('');
  const [jcOptions, setJcOptions] = useState<Array<{ jobCardNumber: string; partCode: string; partDescription: string; machineCode: string; workOrderNumber: string; subjobs?: Array<{ subjobNumber: string; operationCode: string; machineCode: string; workCenterCode: string }> }>>([]);

  const [machines, setMachines] = useState<MasterOption[]>([]);
  const [operators, setOperators] = useState<MasterOption[]>([]);
  const [shifts, setShifts] = useState<MasterOption[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/production/entries');
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const fetchMasters = useCallback(async () => {
    try {
      const [mRes, _uRes, sRes] = await Promise.allSettled([
        apiClient.get('/api/master/machines', { params: { size: 200 } }),
        apiClient.get('/api/auth/signup').catch(() => ({ data: [] })),
        apiClient.get('/api/v2/master/shifts').catch(() => ({ data: [] })),
      ]);
      if (mRes.status === 'fulfilled') {
        const list = Array.isArray(mRes.value.data) ? mRes.value.data : mRes.value.data.content ?? [];
        setMachines(list.map((m: Record<string, unknown>) => ({ id: m.id as number, code: (m.machineCode ?? m.code ?? '') as string, name: (m.description ?? m.name ?? '') as string })));
      }
      if (sRes.status === 'fulfilled' && Array.isArray(sRes.value.data)) {
        setShifts(sRes.value.data.map((s: Record<string, unknown>) => ({ id: s.id as number, code: s.code as string, name: s.name as string })));
      }
      setOperators([]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (tab === 'form') fetchMasters(); }, [tab, fetchMasters]);

  useEffect(() => {
    if (tab === 'form' && !editId && shifts.length > 0 && !form.shiftCode) {
      const now = new Date();
      const h = now.getHours();
      const matched = shifts.find((s) => {
        if (!s.name) return false;
        const lower = s.name.toLowerCase();
        if (h >= 6 && h < 14 && (lower.includes('morning') || lower.includes('first') || lower.includes('a'))) return true;
        if (h >= 14 && h < 22 && (lower.includes('afternoon') || lower.includes('second') || lower.includes('b'))) return true;
        if ((h >= 22 || h < 6) && (lower.includes('night') || lower.includes('third') || lower.includes('c'))) return true;
        return false;
      });
      if (matched) set('shiftCode', matched.code);
      if (!form.productionDate) set('productionDate', now.toISOString().split('T')[0]);
    }
  }, [tab, editId, shifts, form.shiftCode]);

  const fetchJobCards = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/v1/production/job-cards', { params: { size: 50 } });
      setJcOptions(Array.isArray(data) ? data : data.content ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (tab === 'form' && !editId) fetchJobCards(); }, [tab, editId, fetchJobCards]);

  const handleJcSelect = (jcNumber: string) => {
    setJcLookup(jcNumber);
    const jc = jcOptions.find((j) => j.jobCardNumber === jcNumber);
    if (jc) {
      const firstSubjob = jc.subjobs?.[0];
      setForm((prev) => ({
        ...prev,
        jobCardNumber: jc.jobCardNumber,
        workOrderNumber: jc.workOrderNumber || prev.workOrderNumber || '',
        partCode: jc.partCode || prev.partCode || '',
        partDescription: jc.partDescription || prev.partDescription || '',
        machineCode: firstSubjob?.machineCode || jc.machineCode || prev.machineCode || '',
        operationCode: firstSubjob?.operationCode || prev.operationCode || '',
        productionDate: prev.productionDate || new Date().toISOString().split('T')[0],
      }));
      toast('Job card details auto-filled.');
    }
  };

  const save = async () => {
    if (!String(form.workOrderNumber ?? '').trim()) { toast('Work Order Number is required.', 'error'); return; }
    if (!String(form.partCode ?? '').trim()) { toast('Part Code is required.', 'error'); return; }

    if (!navigator.onLine) {
      const id = await enqueue({
        type: 'production-entry',
        endpoint: editId ? `/v1/production/entries/${editId}` : '/v1/production/entries',
        method: editId ? 'PUT' : 'POST',
        body: form as Record<string, unknown>,
      });
      toast(`Queued for sync (${id.id}). Will submit when online.`, 'success');
      setForm({}); setEditId(null); setTab('list');
      return;
    }

    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/v1/production/entries/${editId}`, form);
        toast('Production entry updated.');
      } else {
        await apiClient.post('/v1/production/entries', form);
        toast('Production entry created.');
      }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/v1/production/entries/${deleteTarget.id}`);
      toast('Entry deleted.'); setDeleteTarget(null); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    try {
      await apiClient.post(`/v1/production/entries/${id}/actions/${act}`);
      toast(`Entry ${act}.`); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const printDocument = (id: number | string, mode: 'print' | 'download' = 'print') => {
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    printDoc(`${base}/v1/production/entries/${id}/print?download=${mode === 'download'}`, mode);
  };

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.entryNumber ?? '').toLowerCase().includes(q) || (r.partCode ?? '').toLowerCase().includes(q) || (r.workOrderNumber ?? '').toLowerCase().includes(q);
  });

  const produced = Number(form.producedQuantity ?? 0);
  const good = Number(form.goodQuantity ?? 0);
  const rework = Number(form.reworkQuantity ?? 0);
  const rejected = Number(form.rejectedQuantity ?? 0);
  const scrap = Number(form.scrapQuantity ?? 0);
  const subTotal = good + rework + rejected + scrap;
  const reconciliationOk = produced === 0 || subTotal === produced;

  return (
    <>
      <div className="pg-head">
        <h1>Production Entry {pendingCount > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d' }}><span className="material-symbols-rounded" style={{ fontSize: 14 }}>cloud_upload</span> Pending sync ({pendingCount})</span>}</h1>
        <p>Record actual production against work orders and job cards</p>
      </div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Production Entry</h2></div>

          {!editId && jcOptions.length > 0 && (
            <div style={{ padding: '0 16px 12px', background: '#f0f7ff', borderRadius: 8, marginBottom: 12, border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#2563eb' }}>link</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#1e40af' }}>Quick Fill from Job Card</span>
              </div>
              <select className="in" value={jcLookup} onChange={(e) => handleJcSelect(e.target.value)}>
                <option value="">Select Job Card to auto-fill fields...</option>
                {jcOptions.map((jc) => (
                  <option key={jc.jobCardNumber} value={jc.jobCardNumber}>{jc.jobCardNumber} | {jc.partCode} | {jc.partDescription || 'N/A'}</option>
                ))}
              </select>
            </div>
          )}

          <QRScanInput
            label="Scan Work Order / Job Card"
            placeholder="Scan or type WO/JC number…"
            onScan={(code) => {
              const jc = jcOptions.find((j) => j.jobCardNumber === code);
              if (jc) { handleJcSelect(code); return; }
              set('workOrderNumber', code);
              toast(`Work Order set to ${code}. Select a Job Card to auto-fill.`);
            }}
          />

          <div className="fgrid">
            <label className="fld"><span>Work Order No *</span><input className="in" value={String(form.workOrderNumber ?? '')} onChange={(e) => set('workOrderNumber', e.target.value)} /></label>
            <label className="fld"><span>Job Card No</span><input className="in" value={String(form.jobCardNumber ?? '')} onChange={(e) => set('jobCardNumber', e.target.value)} /></label>
            <label className="fld"><span>Subjob No</span><input className="in" value={String(form.subjobNumber ?? '')} onChange={(e) => set('subjobNumber', e.target.value)} /></label>
            <label className="fld"><span>Part Code *</span><input className="in" value={String(form.partCode ?? '')} onChange={(e) => set('partCode', e.target.value)} /></label>
            <label className="fld"><span>Part Description</span><input className="in" value={String(form.partDescription ?? '')} onChange={(e) => set('partDescription', e.target.value)} /></label>
            <label className="fld"><span>Operation Code</span><input className="in" value={String(form.operationCode ?? '')} onChange={(e) => set('operationCode', e.target.value)} /></label>
            <label className="fld"><span>Machine</span>
              <select className="in" value={String(form.machineCode ?? '')} onChange={(e) => set('machineCode', e.target.value)}>
                <option value="">Select Machine...</option>
                {machines.map((m) => <option key={m.id} value={m.code}>{m.code} {m.name ? `- ${m.name}` : ''}</option>)}
              </select>
            </label>
            <label className="fld"><span>Operator</span>
              <select className="in" value={String(form.operatorCode ?? '')} onChange={(e) => set('operatorCode', e.target.value)}>
                <option value="">Select Operator...</option>
                {operators.map((o) => <option key={o.id} value={o.code}>{o.code} {o.name ? `- ${o.name}` : ''}</option>)}
              </select>
            </label>
            <label className="fld"><span>Shift</span>
              <select className="in" value={String(form.shiftCode ?? '')} onChange={(e) => set('shiftCode', e.target.value)}>
                <option value="">Select Shift...</option>
                {shifts.map((s) => <option key={s.id} value={s.code}>{s.code} - {s.name}</option>)}
              </select>
            </label>
            <label className="fld"><span>Production Date</span><input className="in" type="date" value={String(form.productionDate ?? '').slice(0, 10)} onChange={(e) => set('productionDate', e.target.value)} /></label>
            <label className="fld"><span>Start Time</span><input className="in" type="time" value={String(form.startTime ?? '').slice(0, 5)} onChange={(e) => set('startTime', e.target.value)} /></label>
            <label className="fld"><span>End Time</span><input className="in" type="time" value={String(form.endTime ?? '').slice(0, 5)} onChange={(e) => set('endTime', e.target.value)} /></label>
            <label className="fld"><span>Produced Qty</span><input className="in" type="number" value={String(form.producedQuantity ?? '')} onChange={(e) => set('producedQuantity', Number(e.target.value))} /></label>
            <label className="fld"><span>Good Qty</span><input className="in" type="number" value={String(form.goodQuantity ?? '')} onChange={(e) => set('goodQuantity', Number(e.target.value))} /></label>
            <label className="fld"><span>Rework Qty</span><input className="in" type="number" value={String(form.reworkQuantity ?? '')} onChange={(e) => set('reworkQuantity', Number(e.target.value))} /></label>
            <label className="fld"><span>Rejected Qty</span><input className="in" type="number" value={String(form.rejectedQuantity ?? '')} onChange={(e) => set('rejectedQuantity', Number(e.target.value))} /></label>
            <label className="fld"><span>Scrap Qty</span><input className="in" type="number" value={String(form.scrapQuantity ?? '')} onChange={(e) => set('scrapQuantity', Number(e.target.value))} /></label>
            <label className="fld"><span>Remarks</span><input className="in" value={String(form.remarks ?? '')} onChange={(e) => set('remarks', e.target.value)} /></label>
          </div>

          {produced > 0 && (
            <div style={{ padding: '8px 16px', marginTop: 8, borderRadius: 6, fontSize: 13, background: reconciliationOk ? '#d4edda' : '#f8d7da', color: reconciliationOk ? '#155724' : '#721c24', border: `1px solid ${reconciliationOk ? '#c3e6cb' : '#f5c6cb'}` }}>
              <b>Qty Reconciliation:</b> Good({good}) + Rework({rework}) + Rejected({rejected}) + Scrap({scrap}) = {subTotal} {reconciliationOk ? `= Produced(${produced}) OK` : `!= Produced(${produced}) ERROR: must sum to ${produced}`}
            </div>
          )}

          <div className="actbar">
            <div className="lft">
              <button className="btn btn-sm" onClick={backToList} disabled={busy}><span className="material-symbols-rounded">arrow_back</span> Back</button>
            </div>
            <div className="rgt">
              {editId && <button className="btn btn-sm" onClick={() => { setForm({}); setEditId(null); setTab('list'); }} disabled={busy}>Cancel</button>}
              {can('production', 'Edit') && <button className="btn btn-sm btn-p" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create'}</button>}
            </div>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <div className="panel">
          <div className="toolbar">
            <input className="in" placeholder="Search entries..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="ibtn" title="Export CSV" onClick={() => exportToCsv(filtered as unknown as Record<string, unknown>[], [
              { key: 'entryNumber', label: 'Doc No' },
              { key: 'productionDate', label: 'Date' },
              { key: 'partCode', label: 'Part' },
              { key: 'machineCode', label: 'Machine' },
              { key: 'operationCode', label: 'Operation' },
              { key: 'goodQuantity', label: 'Good Qty' },
              { key: 'reworkQuantity', label: 'Rework Qty' },
              { key: 'rejectedQuantity', label: 'Rejected Qty' },
              { key: 'scrapQuantity', label: 'Scrap Qty' },
              { key: 'producedQuantity', label: 'Produced Qty' },
              { key: 'status', label: 'Status' },
            ], 'production-entries')}><span className="material-symbols-rounded">download</span></button>
            <button className="btn btn-p" onClick={() => { setForm({}); setEditId(null); setTab('form'); }} disabled={!can('production', 'Edit')}>+ New Entry</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Entry No</th><th>Work Order</th><th>Part Code</th><th>Machine</th><th>Operator</th><th>Produced</th><th>Good</th><th>Scrap</th><th>Status</th><th>Quality</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={11}><div className="empty"><span className="material-symbols-rounded">description</span> No entries.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.entryNumber}</b></td>
                      <td>{r.workOrderNumber}</td>
                      <td>{r.partCode}</td>
                      <td>{r.machineCode ?? '-'}</td>
                      <td>{r.operatorCode ?? '-'}</td>
                      <td>{r.producedQuantity}</td>
                      <td style={{ color: '#22c55e' }}>{r.goodQuantity}</td>
                      <td style={{ color: r.scrapQuantity > 0 ? '#ef4444' : undefined }}>{r.scrapQuantity}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td><span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: (QS[r.qualityStatus] ?? QS.PENDING).color, background: (QS[r.qualityStatus] ?? QS.PENDING).bg }}>{r.qualityStatus}</span></td>
                      <td>
                        {r.status === 'DRAFT' && can('production', 'Edit') && <button className="ibtn" title="Submit" onClick={() => action(r.id, 'submit')}><span className="material-symbols-rounded">send</span></button>}
                        {r.status === 'SUBMITTED' && <>{can('production', 'Approve') && <button className="ibtn" title="Approve" onClick={() => action(r.id, 'approve')}><span className="material-symbols-rounded">check_circle</span></button>}{can('production', 'Reject') && <button className="ibtn" title="Reject" onClick={() => action(r.id, 'reject')}><span className="material-symbols-rounded">cancel</span></button>}</>}
                        {r.status === 'APPROVED' && r.qualityStatus === 'PENDING' && <><button className="ibtn" title="Quality Pass" onClick={() => action(r.id, 'quality-pass')}><span className="material-symbols-rounded">verified</span></button><button className="ibtn" title="Quality Fail" onClick={() => action(r.id, 'quality-fail')}><span className="material-symbols-rounded">gpp_bad</span></button><button className="ibtn" title="Quality Hold" onClick={() => action(r.id, 'quality-hold')}><span className="material-symbols-rounded">pause_circle</span></button></>}
                        {can('production', 'Edit') && <button className="ibtn" title="Edit" onClick={() => { setForm(r as unknown as Record<string, unknown>); setEditId(r.id); setTab('form'); }}><span className="material-symbols-rounded">edit</span></button>}
                        <button className="ibtn" title="Print" onClick={() => printDocument(r.id, 'print')}><span className="material-symbols-rounded">print</span></button>
                        <button className="ibtn" title="Download PDF" onClick={() => printDocument(r.id, 'download')}><span className="material-symbols-rounded">download</span></button>
                        {r.status === 'DRAFT' && can('production', 'Delete') && <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(r)}><span className="material-symbols-rounded">delete</span></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.entryNumber ?? ''}`} body="Permanently delete this entry?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
