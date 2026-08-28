import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import StatusBadge from '../../../components/common/StatusBadge';

interface RequestLine { id?: number; sparePartId: number | null; itemCode: string; itemName: string; uom: string; requestedQty: number; issuedQty: number; availableQty: number; unitCost: number; lineStatus: string; inventoryTxnId: number | null; }
interface SpareRequest {
  id: number; requestNumber: string; sourceType: string; sourceId: number | null; referenceNumber: string;
  machineCode: string; requestedBy: string; requestedDate: string; status: string;
  approvedBy: string; approvedAt: string; rejectedReason: string; remarks: string;
  lines: RequestLine[];
}

const SC: Record<string, { color: string; bg: string }> = {
  PENDING: { color: '#f59e0b', bg: '#fef3c7' },
  APPROVED: { color: '#2563eb', bg: '#dbeafe' },
  PARTIALLY_ISSUED: { color: '#7c3aed', bg: '#ede9fe' },
  ISSUED: { color: '#22c55e', bg: '#d4edda' },
  REJECTED: { color: '#ef4444', bg: '#f8d7da' },
  CANCELLED: { color: '#6b7280', bg: '#f3f4f6' },
};

interface DraftLine { itemCode: string; itemName: string; requestedQty: number; }

export default function SpareRequestScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<SpareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [lines, setLines] = useState<DraftLine[]>([{ itemCode: '', itemName: '', requestedQty: 1 }]);
  const [busy, setBusy] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SpareRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/v1/maintenance/spare-requests');
      setRows(Array.isArray(res.data) ? res.data : res.data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setField = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const save = async () => {
    const validLines = lines.filter((l) => l.itemCode && l.requestedQty > 0);
    if (validLines.length === 0) { toast('Add at least one line with an item code and qty.', 'error'); return; }
    setBusy(true);
    try {
      await apiClient.post('/v1/maintenance/spare-requests', { ...form, lines: validLines });
      toast('Spare request created.');
      setForm({}); setLines([{ itemCode: '', itemName: '', requestedQty: 1 }]); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const approve = async (id: number) => {
    try { await apiClient.post(`/v1/maintenance/spare-requests/${id}/approve`); toast('Request approved / issued.'); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const doReject = async () => {
    if (!rejectTarget) return;
    setBusy(true);
    try { await apiClient.post(`/v1/maintenance/spare-requests/${rejectTarget.id}/reject`, { reason: rejectReason }); toast('Request rejected.'); setRejectTarget(null); setRejectReason(''); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
    setBusy(false);
  };

  const cancel = async (id: number) => {
    try { await apiClient.post(`/v1/maintenance/spare-requests/${id}/cancel`); toast('Request cancelled.'); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
  };

  const updateLine = (i: number, k: keyof DraftLine, v: string | number) => {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  };

  const filtered = rows.filter((r) => !statusFilter || r.status === statusFilter);

  const pendingCount = rows.filter((r) => r.status === 'PENDING').length;
  const issuedCount = rows.filter((r) => r.status === 'ISSUED' || r.status === 'PARTIALLY_ISSUED').length;
  const rejectedCount = rows.filter((r) => r.status === 'REJECTED').length;

  return (
    <>
      <div className="pg-head"><h1>Spare Request / Issue</h1><p>Request replacement spares from inventory, approve and issue</p></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Requests', value: rows.length, color: '#374151', bg: '#f9fafb' },
          { label: 'Pending', value: pendingCount, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Issued', value: issuedCount, color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Rejected', value: rejectedCount, color: '#ef4444', bg: '#fef2f2' },
        ].map((kpi) => (
          <div key={kpi.label} className="panel" style={{ padding: '12px 16px', background: kpi.bg }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>New Spare Request</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Source Type</span>
              <select className="in" value={String(form.sourceType ?? '')} onChange={(e) => setField('sourceType', e.target.value)}>
                <option value="">Select...</option>
                <option value="BREAKDOWN">Breakdown</option>
                <option value="PM">Preventive Maintenance</option>
                <option value="TOOLING">Tooling</option>
                <option value="CALIBRATION">Calibration</option>
              </select>
            </label>
            <label className="fld"><span>Source ID</span><input className="in" type="number" value={String(form.sourceId ?? '')} onChange={(e) => setField('sourceId', e.target.value)} /></label>
            <label className="fld"><span>Reference No</span><input className="in" value={String(form.referenceNumber ?? '')} onChange={(e) => setField('referenceNumber', e.target.value)} /></label>
            <label className="fld"><span>Machine Code</span><input className="in" value={String(form.machineCode ?? '')} onChange={(e) => setField('machineCode', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: '1 / -1' }}><span>Remarks</span><input className="in" value={String(form.remarks ?? '')} onChange={(e) => setField('remarks', e.target.value)} /></label>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="panel-h"><h2>Lines</h2></div>
            <table className="tbl">
              <thead><tr><th>Item Code *</th><th>Item Name</th><th>Qty *</th><th></th></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td><input className="in" value={l.itemCode} onChange={(e) => updateLine(i, 'itemCode', e.target.value)} placeholder="e.g. ITM-AUTO-501" /></td>
                    <td><input className="in" value={l.itemName} onChange={(e) => updateLine(i, 'itemName', e.target.value)} /></td>
                    <td><input className="in" type="number" min={1} value={l.requestedQty} onChange={(e) => updateLine(i, 'requestedQty', Number(e.target.value))} style={{ width: 100 }} /></td>
                    <td>{lines.length > 1 && <button className="ibtn" title="Remove" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}><span className="material-symbols-rounded">delete</span></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn btn-sm" onClick={() => setLines((ls) => [...ls, { itemCode: '', itemName: '', requestedQty: 1 }])}>+ Add Line</button>
          </div>

          <div className="actbar">
            <span className="lft"><button className="btn btn-sm" onClick={() => setTab('list')}><span className="material-symbols-rounded">arrow_back</span> Back</button></span>
            <span className="rgt"><button className="btn btn-sm btn-p" onClick={save} disabled={busy}>Create Request</button></span>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <div className="panel">
          <div className="toolbar" style={{ gap: '8px', justifyContent: 'flex-start' }}>
            <select className="in" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 170 }}>
              <option value="">All Status</option>
              {Object.keys(SC).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn btn-p" onClick={() => { setForm({}); setLines([{ itemCode: '', itemName: '', requestedQty: 1 }]); setTab('form'); }}>+ New Request</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Request No</th><th>Source</th><th>Machine</th><th>Lines</th><th>Requested By</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">description</span> No requests.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.requestNumber}</b></td>
                      <td>{r.sourceType ? `${r.sourceType}${r.sourceId ? ' #' + r.sourceId : ''}` : '-'}</td>
                      <td>{r.machineCode || '-'}</td>
                      <td style={{ maxWidth: 260 }}>
                        {r.lines.map((l, i) => (
                          <div key={i} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span>{l.itemCode}</span>
                            <span style={{ whiteSpace: 'nowrap' }}>
                              <b>{l.issuedQty}</b>/{l.requestedQty}
                              {l.availableQty != null && <>&nbsp;(avail {l.availableQty})</>}
                            </span>
                          </div>
                        ))}
                      </td>
                      <td>{r.requestedBy}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td style={{ position: 'relative' }}>
                        <button className="ibtn" title="Actions" onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === r.id ? null : r.id); }}>
                          <span className="material-symbols-rounded">more_vert</span>
                        </button>
                        {openActionMenu === r.id && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 180, padding: '4px 0' }} onClick={(e) => e.stopPropagation()}>
                            {r.status === 'PENDING' && <MenuItem icon="check_circle" color="#22c55e" label="Approve & Issue" onClick={() => { setOpenActionMenu(null); approve(r.id); }} />}
                            {r.status === 'PENDING' && <MenuItem icon="cancel" color="#ef4444" label="Reject" onClick={() => { setOpenActionMenu(null); setRejectTarget(r); }} />}
                            {r.status !== 'ISSUED' && r.status !== 'REJECTED' && r.status !== 'CANCELLED' && <><hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} /><MenuItem icon="close" color="#6b7280" label="Cancel" onClick={() => { setOpenActionMenu(null); cancel(r.id); }} /></>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="panel" style={{ margin: '16px 0' }}>
          <div className="panel-h"><h2>Reject {rejectTarget.requestNumber}</h2></div>
          <div className="fgrid">
            <label className="fld" style={{ gridColumn: '1 / -1' }}><span>Reason</span><input className="in" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></label>
          </div>
          <div className="actbar">
            <span className="lft"><button className="btn btn-sm" onClick={() => setRejectTarget(null)}>Cancel</button></span>
            <span className="rgt"><button className="btn btn-sm btn-p" onClick={doReject} disabled={busy}>Reject</button></span>
          </div>
        </div>
      )}
    </>
  );
}

function MenuItem({ icon, color, label, onClick }: { icon: string; color: string; label: string; onClick: () => void }) {
  return (
    <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      onClick={onClick}>
      <span className="material-symbols-rounded" style={{ fontSize: 18, color }}>{icon}</span> {label}
    </button>
  );
}
