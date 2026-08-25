import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useTabs } from '../../../contexts/TabsContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

const SCREEN_ID = 'cost-estimation';

interface ReconcileResult {
  estimationNumber: string;
  itemCode: string;
  workOrders: string[];
  estimated: { material: number; machine: number; total: number };
  actual: { machine: number; total: number };
  variance: { machine: number; total: number };
  variancePercent?: { machine: number; total: number };
}

interface CostEstimation {
  id: number;
  estimationNumber?: string;
  itemCode: string;
  itemDescription?: string;
  customerName?: string;
  customerId?: number;
  soId?: number;
  soNumber?: string;
  batchQty?: number;
  bomId?: number;
  routeId?: number;
  estimationVersion?: number;
  currencyCode?: string;
  exchangeRate?: number;
  profitMarginPercent?: number;
  profitAmount?: number;
  validUpto?: string;
  preparedBy?: string;
  approvedBy?: string;
  status: string;
  remarks?: string;
  totalMaterialCost?: number;
  totalMachineCost?: number;
  totalLabourCost?: number;
  totalToolingCost?: number;
  totalSubcontractCost?: number;
  totalOverheadCost?: number;
  scrapAllowanceCost?: number;
  totalManufacturingCost?: number;
  estimatedSellingPrice?: number;
  actualMaterialCost?: number;
  actualMachineCost?: number;
  actualLabourCost?: number;
  actualTotalCost?: number;
  varianceMaterial?: number;
  varianceMachine?: number;
  varianceTotal?: number;
}

interface CostLine {
  id: number;
  lineType: string;
  componentCode?: string;
  componentDescription?: string;
  uom?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
  machineCode?: string;
  machineDescription?: string;
  setupTime?: number;
  runTime?: number;
  operationDescription?: string;
}

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  DRAFT:      { color: '#888',    bg: '#e9ecef' },
  SUBMITTED:  { color: '#6f42c1', bg: '#e8daef' },
  APPROVED:   { color: '#28a745', bg: '#d4edda' },
  OBSOLETE:   { color: '#dc3545', bg: '#f8d7da' },
};

const fmt = (v?: number) => v != null ? `$${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

const formatCurrency = (val: unknown) => {
  if (val == null || val === '') return '—';
  return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function CostEstimationScreen() {
  const { toast } = useToast();
  const { closeTab } = useTabs();
  const [rows, setRows] = useState<CostEstimation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CostEstimation | null>(null);
  const [actionTarget, setActionTarget] = useState<{ est: CostEstimation; action: string } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lines, setLines] = useState<CostLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [reconcileTarget, setReconcileTarget] = useState<number | null>(null);
  const [reconcileResult, setReconcileResult] = useState<ReconcileResult | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [componentTypes, setComponentTypes] = useState<Array<{code: string; name: string}>>([]);

  useEffect(() => {
    apiClient.get('/v1/planning/cost-component-types').then(({ data }) => {
      setComponentTypes(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      const { data } = await apiClient.get(`/v1/planning/cost-estimations?${params}`);
      const items = data.content ?? (Array.isArray(data) ? data : []);
      setRows(items);
      setTotal(data.totalElements ?? items.length);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load cost estimations.'), 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const save = async () => {
    if (!String(form.itemCode ?? '').trim()) { toast('Item code is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/v1/planning/cost-estimations/${editId}`, form);
        toast('Cost estimation updated.');
      } else {
        await apiClient.post('/v1/planning/cost-estimations', form);
        toast('Cost estimation created.');
      }
      setForm({}); setEditId(null); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Save failed.'), 'error');
    }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/v1/planning/cost-estimations/${deleteTarget.id}`);
      toast('Deleted.');
      setDeleteTarget(null); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Delete failed.'), 'error');
    }
    setBusy(false);
  };

  const calculate = async (est: CostEstimation) => {
    setBusy(true);
    try {
      await apiClient.post(`/v1/planning/cost-estimations/${est.id}/calculate`);
      toast('Cost estimation calculated.');
      load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Calculate failed.'), 'error');
    }
    setBusy(false);
  };

  const reconcile = async (est: CostEstimation) => {
    setReconcileTarget(est.id);
    setReconcileLoading(true);
    setReconcileResult(null);
    try {
      const { data } = await apiClient.post(`/v1/planning/cost-estimations/${est.id}/reconcile`);
      setReconcileResult(data);
      toast('Reconciliation complete.');
      load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Reconciliation failed.'), 'error');
    }
    setReconcileLoading(false);
  };

  const reconcileClose = () => { setReconcileTarget(null); setReconcileResult(null); };

  const performAction = async () => {
    if (!actionTarget) return;
    setBusy(true);
    try {
      await apiClient.post(`/v1/planning/cost-estimations/${actionTarget.est.id}/actions/${actionTarget.action}`);
      toast(`Action "${actionTarget.action}" performed.`);
      setActionTarget(null); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Action failed.'), 'error');
    }
    setBusy(false);
  };

  const toggleLines = async (est: CostEstimation) => {
    if (expandedId === est.id) { setExpandedId(null); setLines([]); return; }
    setExpandedId(est.id);
    setLinesLoading(true);
    try {
      const { data } = await apiClient.get(`/v1/planning/cost-estimations/${est.id}/lines`);
      setLines(data.content ?? (Array.isArray(data) ? data : []));
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load cost lines.'), 'error');
      setLines([]);
    }
    setLinesLoading(false);
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  return (
    <>
      <div className="pg-head">
        <h1>Cost Estimation</h1>
        <p>Estimate product costs and pricing</p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{editId ? 'Edit' : 'Add'} Cost Estimation</h2>
        </div>
        <div className="fgrid">
          <label className="fld">
            <span>Item Code *</span>
            <input className="in" value={String(form.itemCode ?? '')} onChange={(e) => set('itemCode', e.target.value)} />
          </label>
          <label className="fld">
            <span>Item Description</span>
            <input className="in" value={String(form.itemDescription ?? '')} onChange={(e) => set('itemDescription', e.target.value)} />
          </label>
          <label className="fld">
            <span>Customer Name</span>
            <input className="in" value={String(form.customerName ?? '')} onChange={(e) => set('customerName', e.target.value)} />
          </label>
          <label className="fld">
            <span>Customer ID</span>
            <input className="in" type="number" value={String(form.customerId ?? '')} onChange={(e) => set('customerId', e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="fld">
            <span>SO Number</span>
            <input className="in" value={String(form.soNumber ?? '')} onChange={(e) => set('soNumber', e.target.value)} />
          </label>
          <label className="fld">
            <span>SO ID</span>
            <input className="in" type="number" value={String(form.soId ?? '')} onChange={(e) => set('soId', e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="fld">
            <span>Batch Qty</span>
            <input className="in" type="number" step="1" value={String(form.batchQty ?? '')} onChange={(e) => set('batchQty', e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="fld">
            <span>BOM ID</span>
            <input className="in" type="number" value={String(form.bomId ?? '')} onChange={(e) => set('bomId', e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="fld">
            <span>Route ID</span>
            <input className="in" type="number" value={String(form.routeId ?? '')} onChange={(e) => set('routeId', e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="fld">
            <span>Est Version</span>
            <input className="in" type="number" value={String(form.estimationVersion ?? '')} onChange={(e) => set('estimationVersion', e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="fld">
            <span>Currency Code</span>
            <input className="in" value={String(form.currencyCode ?? '')} onChange={(e) => set('currencyCode', e.target.value)} />
          </label>
          <label className="fld">
            <span>Exchange Rate</span>
            <input className="in" type="number" step="0.0001" value={String(form.exchangeRate ?? '')} onChange={(e) => set('exchangeRate', e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="fld">
            <span>Profit Margin %</span>
            <input className="in" type="number" step="0.01" value={String(form.profitMarginPercent ?? '')} onChange={(e) => set('profitMarginPercent', e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="fld">
            <span>Valid Upto</span>
            <input className="in" type="date" value={String(form.validUpto ?? '')} onChange={(e) => set('validUpto', e.target.value)} />
          </label>
          <label className="fld">
            <span>Prepared By</span>
            <input className="in" value={String(form.preparedBy ?? '')} onChange={(e) => set('preparedBy', e.target.value)} />
          </label>
          <label className="fld">
            <span>Approved By</span>
            <input className="in" value={String(form.approvedBy ?? '')} onChange={(e) => set('approvedBy', e.target.value)} />
          </label>
          <label className="fld">
            <span>Status</span>
            <select className="in" value={String(form.status ?? 'DRAFT')} onChange={(e) => set('status', e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="OBSOLETE">Obsolete</option>
            </select>
          </label>
          <label className="fld">
            <span>Remarks</span>
            <textarea className="in" rows={2} value={String(form.remarks ?? '')} onChange={(e) => set('remarks', e.target.value)} />
          </label>
        </div>
        <div className="actbar">
          <div className="lft">
            <button type="button" className="btn btn-sm" onClick={() => closeTab(SCREEN_ID)} disabled={busy}><span className="material-symbols-rounded">arrow_back</span> Back</button>
            <span className="material-symbols-rounded">lock</span>{'Cost Estimations'}
          </div>
          <div className="rgt">
            {editId && <button type="button" className="btn btn-sm" onClick={() => { setForm({}); setEditId(null); }} disabled={busy}>Cancel</button>}
            <button type="button" className="btn btn-sm btn-p" onClick={save} disabled={busy}><span className="material-symbols-rounded">save</span> {editId ? 'Update' : 'Create'}</button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <div className="searchwrap">
            <span className="material-symbols-rounded">search</span>
            <input className="in" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="count">{total} estimations</span>
        </div>
        <div className="twrap">
          {loading ? (
            <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Item Code</th>
                  <th>Description</th>
                  <th>Customer</th>
                  <th>Batch Qty</th>
                  <th>Total Cost</th>
                  <th>Selling Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={9}><div className="empty"><span className="material-symbols-rounded">search_off</span> No cost estimations.</div></td></tr>
                ) : rows.map((r) => {
                  const sc = STATUS_COLORS[r.status] ?? { color: '#888', bg: '#e9ecef' };
                  return (
                    <>
                      <tr key={r.id} onClick={() => toggleLines(r)} style={{ cursor: 'pointer' }}>
                        <td>
                          <span className="material-symbols-rounded">{expandedId === r.id ? 'expand_less' : 'expand_more'}</span>
                        </td>
                        <td>{r.itemCode}</td>
                        <td>{r.itemDescription ?? '—'}</td>
                        <td>{r.customerName ?? '—'}</td>
                        <td>{r.batchQty ?? '—'}</td>
                        <td>{fmt(r.totalManufacturingCost)}</td>
                        <td>{fmt(r.estimatedSellingPrice)}</td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: sc.color, background: sc.bg }}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          <button className="ibtn" title="Calculate" onClick={(e) => { e.stopPropagation(); calculate(r); }}>
                            <span className="material-symbols-rounded">functions</span>
                          </button>
                          <button className="ibtn" title="Reconcile vs Actual" onClick={(e) => { e.stopPropagation(); reconcile(r); }}>
                            <span className="material-symbols-rounded">compare_arrows</span>
                          </button>
                          <button className="ibtn" title="Submit" onClick={(e) => { e.stopPropagation(); setActionTarget({ est: r, action: 'submit' }); }}>
                            <span className="material-symbols-rounded">send</span>
                          </button>
                          <button className="ibtn" title="Approve" onClick={(e) => { e.stopPropagation(); setActionTarget({ est: r, action: 'approve' }); }}>
                            <span className="material-symbols-rounded">check_circle</span>
                          </button>
                          <button className="ibtn" title="Edit" onClick={(e) => { e.stopPropagation(); setForm(r as unknown as Record<string, unknown>); setEditId(r.id); }}>
                            <span className="material-symbols-rounded">edit</span>
                          </button>
                          <button className="ibtn danger" title="Delete" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}>
                            <span className="material-symbols-rounded">delete</span>
                          </button>
                        </td>
                      </tr>
                      {expandedId === r.id && (
                        <tr key={`${r.id}-lines`}>
                          <td colSpan={9}>
                            <div style={{ background: '#f9fafb', padding: 12, borderBottom: '1px solid #e5e7eb' }}>
                              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>Cost Breakdown</h4>
                              {linesLoading ? (
                                <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading lines...</div>
                              ) : lines.length === 0 ? (
                                <div className="empty"><span className="material-symbols-rounded">info</span> No cost lines. Click Calculate first.</div>
                              ) : (
                                <table className="tbl">
                                  <thead>
                                    <tr>
                                      <th>Type</th>
                                      <th>Code</th>
                                      <th>Description</th>
                                      <th>UOM</th>
                                      <th>Qty</th>
                                      <th>Rate</th>
                                      <th>Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lines.map((ln, idx) => (
                                      <tr key={ln.id}>
                                        <td>
                                          <select className="in" value={String(ln.lineType ?? '')} onChange={(e) => {
                                            const val = e.target.value;
                                            setLines((c) => c.map((l, i) => i === idx ? { ...l, lineType: val } : l));
                                          }}>
                                            <option value="">Select...</option>
                                            {componentTypes.map((ct) => <option key={ct.code} value={ct.code}>{ct.name}</option>)}
                                          </select>
                                        </td>
                                        <td>{ln.componentCode ?? ln.machineCode ?? '—'}</td>
                                        <td>{ln.componentDescription ?? ln.operationDescription ?? '—'}</td>
                                        <td>{ln.uom ?? '—'}</td>
                                        <td>{ln.quantity ?? '—'}</td>
                                        <td>{fmt(ln.rate)}</td>
                                        <td>{fmt(ln.amount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                              {(r.actualMachineCost != null && r.actualMachineCost !== 0) && (
                                <div style={{ marginTop: 8, padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                  <b style={{ fontSize: 12 }}>Actual vs Estimated:</b>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4, fontSize: 12 }}>
                                    <div>Estimated: <b>{fmt(r.totalManufacturingCost)}</b></div>
                                    <div>Actual: <b>{fmt(r.actualTotalCost)}</b></div>
                                    <div>Variance: <b style={{ color: (r.varianceTotal ?? 0) > 0 ? '#dc3545' : '#28a745' }}>{fmt(r.varianceTotal)}</b></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {total > PAGE_SIZE && (
          <div className="pager">
            <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span className="sp">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
            <button className="btn btn-sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      {/* FRS §3.10: Summary Panel */}
      <div className="panel">
        <div className="panel-h"><h2><span className="material-symbols-rounded">summarize</span> Cost Summary</h2></div>
        <div className="fgrid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <label className="fld"><span>Total Material Cost</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{formatCurrency(form.totalMaterialCost)}</span></label>
          <label className="fld"><span>Total Machine Cost</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{formatCurrency(form.totalMachineCost)}</span></label>
          <label className="fld"><span>Total Labour Cost</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{formatCurrency(form.totalLabourCost)}</span></label>
          <label className="fld"><span>Total Tooling Cost</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{formatCurrency(form.totalToolingCost)}</span></label>
          <label className="fld"><span>Total Subcontract Cost</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{formatCurrency(form.totalSubcontractCost)}</span></label>
          <label className="fld"><span>Total Overhead Cost</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{formatCurrency(form.totalOverheadCost)}</span></label>
          <label className="fld"><span>Scrap Allowance Cost</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{formatCurrency(form.scrapAllowanceCost)}</span></label>
          <label className="fld"><span style={{ fontWeight: 700 }}>Total Manufacturing Cost</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#eff6ff', borderRadius: 4, fontWeight: 700, color: '#1e40af' }}>{formatCurrency(form.totalManufacturingCost)}</span></label>
          <label className="fld"><span>Profit Margin %</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{String(form.profitMarginPercent ?? '—')}%</span></label>
          <label className="fld"><span>Profit Amount</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{formatCurrency(form.profitAmount)}</span></label>
          <label className="fld"><span style={{ fontWeight: 700 }}>Estimated Selling Price</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f0fdf4', borderRadius: 4, fontWeight: 700, color: '#16a34a' }}>{formatCurrency(form.estimatedSellingPrice)}</span></label>
        </div>
      </div>

      <ConfirmActionModal open={Boolean(deleteTarget)} title="Delete Cost Estimation" body="Permanently delete this cost estimation?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />

      <ConfirmActionModal
        open={Boolean(actionTarget)}
        title={actionTarget ? `${actionTarget.action.charAt(0).toUpperCase() + actionTarget.action.slice(1)} Estimation` : ''}
        body={actionTarget ? `Perform "${actionTarget.action}" on this estimation?` : ''}
        okLabel={actionTarget?.action ?? ''}
        busy={busy}
        onClose={() => setActionTarget(null)}
        onConfirm={performAction}
      />

      {reconcileTarget && (
        <div className="modal-overlay" onClick={reconcileClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-h"><h2>Cost Reconciliation</h2><button className="ibtn" onClick={reconcileClose}><span className="material-symbols-rounded">close</span></button></div>
            <div className="modal-b">
              {reconcileLoading ? (
                <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Computing actuals...</div>
              ) : reconcileResult ? (
                <div>
                  <div style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>
                    <b>{reconcileResult.estimationNumber}</b> — {reconcileResult.itemCode}
                    {reconcileResult.workOrders.length > 0 && <> · Work Orders: {reconcileResult.workOrders.join(', ')}</>}
                  </div>
                  <table className="tbl">
                    <thead><tr><th>Metric</th><th>Estimated</th><th>Actual</th><th>Variance</th><th>%</th></tr></thead>
                    <tbody>
                      <tr>
                        <td>Machine</td>
                        <td>{fmt(reconcileResult.estimated.machine)}</td>
                        <td>{fmt(reconcileResult.actual.machine)}</td>
                        <td style={{ color: reconcileResult.variance.machine > 0 ? '#dc3545' : '#28a745', fontWeight: 600 }}>{fmt(reconcileResult.variance.machine)}</td>
                        <td style={{ color: (reconcileResult.variancePercent?.machine ?? 0) > 0 ? '#dc3545' : '#28a745' }}>{reconcileResult.variancePercent?.machine != null ? reconcileResult.variancePercent.machine.toFixed(1) + '%' : '—'}</td>
                      </tr>
                      <tr style={{ fontWeight: 700, borderTop: '2px solid #e5e7eb' }}>
                        <td>Total</td>
                        <td>{fmt(reconcileResult.estimated.total)}</td>
                        <td>{fmt(reconcileResult.actual.total)}</td>
                        <td style={{ color: reconcileResult.variance.total > 0 ? '#dc3545' : '#28a745' }}>{fmt(reconcileResult.variance.total)}</td>
                        <td style={{ color: (reconcileResult.variancePercent?.total ?? 0) > 0 ? '#dc3545' : '#28a745' }}>{reconcileResult.variancePercent?.total != null ? reconcileResult.variancePercent.total.toFixed(1) + '%' : '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">No data. Click Reconcile on an estimation.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
