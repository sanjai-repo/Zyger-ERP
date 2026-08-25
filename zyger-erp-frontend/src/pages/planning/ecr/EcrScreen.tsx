import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

interface Ecr {
  id: number;
  ecrNumber: string;
  ecoNumber?: string;
  changeType: string;
  itemCode: string;
  itemDescription: string;
  currentRevision?: string;
  proposedRevision?: string;
  descriptionOfChange: string;
  reasonForChange: string;
  priority: string;
  status: string;
  effectiveDate?: string;
  bomImpact?: boolean;
  routeImpact?: boolean;
  qualityImpact?: boolean;
  inventoryImpact?: boolean;
  implementationPlan?: string;
  cutInWoNo?: string;
  oldStockDisposition?: string;
  costImpactEstimate?: number;
  verifiedBy?: string;
  verifiedDate?: string;
  closedDate?: string;
  bomRevFrom?: string;
  bomRevTo?: string;
  routeRevFrom?: string;
  routeRevTo?: string;
  drawingRevFrom?: string;
  drawingRevTo?: string;
  requestedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  remarks?: string;
  existingOrdersEvaluated?: boolean;
}

const PAGE_SIZE = 20;

const CHANGE_TYPES = [
  { value: 'DESIGN', label: 'Design' },
  { value: 'DIMENSIONAL', label: 'Dimensional' },
  { value: 'MATERIAL', label: 'Material' },
  { value: 'PROCESS', label: 'Process' },
  { value: 'BOM', label: 'BOM' },
  { value: 'ROUTE', label: 'Route' },
  { value: 'DRAWING', label: 'Drawing' },
];

const PRIORITIES = [
  { value: 'CRITICAL', label: 'Critical', color: '#dc2626' },
  { value: 'HIGH', label: 'High', color: '#f59e0b' },
  { value: 'MEDIUM', label: 'Medium', color: '#3b82f6' },
  { value: 'LOW', label: 'Low', color: '#888' },
];

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  RAISED:        { color: '#888',    bg: '#e9ecef' },
  UNDER_REVIEW:  { color: '#3b82f6', bg: '#dbeafe' },
  APPROVED:      { color: '#22c55e', bg: '#d4edda' },
  REJECTED:      { color: '#ef4444', bg: '#f8d7da' },
  IMPLEMENTED:   { color: '#10b981', bg: '#d1fae5' },
  CLOSED:        { color: '#6b7280', bg: '#f3f4f6' },
};

const ACTIONABLE_STATUSES: Record<string, { label: string; action: string; icon: string }[]> = {
  UNDER_REVIEW: [
    { label: 'Approve', action: 'approve', icon: 'check_circle' },
    { label: 'Reject', action: 'reject', icon: 'cancel' },
  ],
  APPROVED: [
    { label: 'Implement', action: 'implement', icon: 'build' },
  ],
  IMPLEMENTED: [
    { label: 'Close', action: 'close', icon: 'archive' },
  ],
};

export default function EcrScreen() {
  const { toast } = useToast();
  const { can } = useAuth();
  const [rows, setRows] = useState<Ecr[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ecr | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ ecr: Ecr; action: string } | null>(null);
  const [existingOrders, setExistingOrders] = useState<Array<{workOrderId: number; woNumber: string; status: string; orderQuantity: number; disposition: string | null}>>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/planning/engineering-changes');
      const items = Array.isArray(data) ? data : data.content ?? [];
      setRows(items);
      setTotal(items.length);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Load failed.'), 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!String(form.changeType ?? '').trim()) { toast('Change Type is required.', 'error'); return; }
    if (!String(form.itemCode ?? '').trim()) { toast('Item Code is required.', 'error'); return; }
    if (!String(form.descriptionOfChange ?? '').trim()) { toast('Description of Change is required.', 'error'); return; }
    if (!String(form.reasonForChange ?? '').trim()) { toast('Reason for Change is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/v1/planning/engineering-changes/${editId}`, form);
        toast('ECR updated.');
      } else {
        await apiClient.post('/v1/planning/engineering-changes', form);
        toast('ECR created.');
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
      await apiClient.delete(`/v1/planning/engineering-changes/${deleteTarget.id}`);
      toast('ECR deleted.');
      setDeleteTarget(null); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Delete failed.'), 'error');
    }
    setBusy(false);
  };

  const executeAction = async (note: string) => {
    if (!actionTarget) return;
    setBusy(true);
    try {
      await apiClient.post(
        `/v1/planning/engineering-changes/${actionTarget.ecr.id}/actions/${actionTarget.action}`,
        { note }
      );
      toast(`ECR ${actionTarget.action}d successfully.`);
      setActionTarget(null); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Action failed.'), 'error');
    }
    setBusy(false);
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const genericStatus = String(form.status ?? 'RAISED');

  const fetchExistingOrders = async () => {
    if (!editId) return;
    try {
      const { data } = await apiClient.get(`/v1/planning/engineering-changes/${editId}/existing-orders`);
      setExistingOrders(Array.isArray(data) ? data : []);
    } catch { setExistingOrders([]); }
  };

  const markEvaluated = async () => {
    if (!editId) return;
    try {
      await apiClient.put(`/v1/planning/engineering-changes/${editId}/mark-evaluated`);
      setForm((c) => ({ ...c, existingOrdersEvaluated: true }));
      toast('Existing orders marked as evaluated.');
    } catch (e) { toast(getApiErrorMessage(e, 'Failed.'), 'error'); }
  };

  useEffect(() => {
    if (editId && genericStatus !== 'DRAFT') {
      fetchExistingOrders();
    }
  }, [editId, genericStatus]);

  return (
    <>
      <div className="pg-head">
        <h1>Engineering Change Requests</h1>
        <p>Manage ECRs for engineering changes</p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{editId ? 'Edit' : 'Add'} ECR</h2>
        </div>
        <div className="fgrid">
          <label className="fld">
            <span>Change Type *</span>
            <select className="in" value={String(form.changeType ?? '')} onChange={(e) => set('changeType', e.target.value)}>
              <option value="">Select...</option>
              {CHANGE_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span>Item Code *</span>
            <input className="in" value={String(form.itemCode ?? '')} onChange={(e) => set('itemCode', e.target.value)} />
          </label>
          <label className="fld">
            <span>Item Description</span>
            <input className="in" value={String(form.itemDescription ?? '')} onChange={(e) => set('itemDescription', e.target.value)} />
          </label>
          <label className="fld">
            <span>Current Revision</span>
            <input className="in" value={String(form.currentRevision ?? '')} onChange={(e) => set('currentRevision', e.target.value)} />
          </label>
          <label className="fld">
            <span>Proposed Revision</span>
            <input className="in" value={String(form.proposedRevision ?? '')} onChange={(e) => set('proposedRevision', e.target.value)} />
          </label>
          <label className="fld">
            <span>Priority</span>
            <select className="in" value={String(form.priority ?? 'MEDIUM')} onChange={(e) => set('priority', e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span>Status</span>
            <select className="in" value={String(form.status ?? 'RAISED')} onChange={(e) => set('status', e.target.value)}>
              <option value="RAISED">Raised</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="IMPLEMENTED">Implemented</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>
          <label className="fld">
            <span>Effective Date</span>
            <input className="in" type="date" value={String(form.effectiveDate ?? '')} onChange={(e) => set('effectiveDate', e.target.value)} />
          </label>
          <label className="fld">
            <span>Description of Change *</span>
            <textarea className="in" rows={2} value={String(form.descriptionOfChange ?? '')} onChange={(e) => set('descriptionOfChange', e.target.value)} />
          </label>
          <label className="fld">
            <span>Reason for Change *</span>
            <textarea className="in" rows={2} value={String(form.reasonForChange ?? '')} onChange={(e) => set('reasonForChange', e.target.value)} />
          </label>
          {/* Impact checkboxes */}
          <label className="fld">
            <span>BOM Impact</span>
            <select className="in" value={String(form.bomImpact ?? '')} onChange={(e) => set('bomImpact', e.target.value === 'true')}>
              <option value="">No</option><option value="true">Yes</option>
            </select>
          </label>
          <label className="fld">
            <span>Route Impact</span>
            <select className="in" value={String(form.routeImpact ?? '')} onChange={(e) => set('routeImpact', e.target.value === 'true')}>
              <option value="">No</option><option value="true">Yes</option>
            </select>
          </label>
          <label className="fld">
            <span>Quality Impact</span>
            <select className="in" value={String(form.qualityImpact ?? '')} onChange={(e) => set('qualityImpact', e.target.value === 'true')}>
              <option value="">No</option><option value="true">Yes</option>
            </select>
          </label>
          <label className="fld">
            <span>Inventory Impact</span>
            <select className="in" value={String(form.inventoryImpact ?? '')} onChange={(e) => set('inventoryImpact', e.target.value === 'true')}>
              <option value="">No</option><option value="true">Yes</option>
            </select>
          </label>
          <label className="fld">
            <span>BOM Rev From</span>
            <input className="in" value={String(form.bomRevFrom ?? '')} onChange={(e) => set('bomRevFrom', e.target.value)} />
          </label>
          <label className="fld">
            <span>BOM Rev To</span>
            <input className="in" value={String(form.bomRevTo ?? '')} onChange={(e) => set('bomRevTo', e.target.value)} />
          </label>
          <label className="fld">
            <span>Route Rev From</span>
            <input className="in" value={String(form.routeRevFrom ?? '')} onChange={(e) => set('routeRevFrom', e.target.value)} />
          </label>
          <label className="fld">
            <span>Route Rev To</span>
            <input className="in" value={String(form.routeRevTo ?? '')} onChange={(e) => set('routeRevTo', e.target.value)} />
          </label>
          <label className="fld">
            <span>Drawing Rev From</span>
            <input className="in" value={String(form.drawingRevFrom ?? '')} onChange={(e) => set('drawingRevFrom', e.target.value)} />
          </label>
          <label className="fld">
            <span>Drawing Rev To</span>
            <input className="in" value={String(form.drawingRevTo ?? '')} onChange={(e) => set('drawingRevTo', e.target.value)} />
          </label>
          <label className="fld">
            <span>Implementation Plan</span>
            <textarea className="in" rows={2} value={String(form.implementationPlan ?? '')} onChange={(e) => set('implementationPlan', e.target.value)} />
          </label>
          <label className="fld">
            <span>Cut-In WO No</span>
            <input className="in" value={String(form.cutInWoNo ?? '')} onChange={(e) => set('cutInWoNo', e.target.value)} />
          </label>
          <label className="fld">
            <span>Old Stock Disposition</span>
            <select className="in" value={String(form.oldStockDisposition ?? '')} onChange={(e) => set('oldStockDisposition', e.target.value)}>
              <option value="">Select...</option>
              <option value="USE_AS_IS">Use-As-Is</option>
              <option value="REWORK">Rework</option>
              <option value="SCRAP">Scrap</option>
              <option value="RETURN_TO_VENDOR">Return to Vendor</option>
            </select>
          </label>
          <label className="fld">
            <span>Cost Impact Estimate</span>
            <input className="in" type="number" step="0.01" value={String(form.costImpactEstimate ?? '')} onChange={(e) => set('costImpactEstimate', e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="fld">
            <span>Requested By</span>
            <input className="in" value={String(form.requestedBy ?? '')} onChange={(e) => set('requestedBy', e.target.value)} />
          </label>
          <label className="fld">
            <span>Reviewed By</span>
            <input className="in" value={String(form.reviewedBy ?? '')} onChange={(e) => set('reviewedBy', e.target.value)} />
          </label>
          <label className="fld">
            <span>Approved By</span>
            <input className="in" value={String(form.approvedBy ?? '')} onChange={(e) => set('approvedBy', e.target.value)} />
          </label>
          <label className="fld">
            <span>Verified By</span>
            <input className="in" value={String(form.verifiedBy ?? '')} onChange={(e) => set('verifiedBy', e.target.value)} />
          </label>
          <label className="fld">
            <span>Remarks</span>
            <textarea className="in" rows={2} value={String(form.remarks ?? '')} onChange={(e) => set('remarks', e.target.value)} />
          </label>
        </div>
        <div className="actbar">
          <span className="lft">
            {editId && <button className="btn" onClick={() => { setForm({}); setEditId(null); }} disabled={busy}>Cancel</button>}
          </span>
          <button className="btn btn-p" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create'}</button>
        </div>
      </div>

      {editId && genericStatus !== 'DRAFT' && (
        <div className="panel">
          <div className="panel-h">
            <h2><span className="material-symbols-rounded">fact_check</span> Existing Orders Evaluated</h2>
            {!form.existingOrdersEvaluated && existingOrders.length > 0 && (
              <button type="button" className="btn btn-sm btn-p" onClick={markEvaluated} disabled={busy}>
                <span className="material-symbols-rounded">check_circle</span> Mark Evaluated
              </button>
            )}
          </div>
          {existingOrders.length === 0 ? (
            <div className="empty" style={{ padding: 12 }}><span className="material-symbols-rounded">info</span> No open work orders found for this item.</div>
          ) : (
            <div className="twrap">
              <table className="tbl">
                <thead><tr><th>WO Number</th><th>Status</th><th>Order Qty</th><th>Disposition</th></tr></thead>
                <tbody>
                  {existingOrders.map((o, idx) => (
                    <tr key={idx}>
                      <td>{o.woNumber}</td>
                      <td>{o.status}</td>
                      <td>{o.orderQuantity}</td>
                      <td>
                        <select className="in" value={o.disposition ?? ''} onChange={(e) => {
                          const val = e.target.value;
                          setExistingOrders((c) => c.map((item, i) => i === idx ? { ...item, disposition: val } : item));
                        }}>
                          <option value="">Select...</option>
                          <option value="CONTINUE">Continue on old revision</option>
                          <option value="HOLD">Hold</option>
                          <option value="REWORK">Rework</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="panel">
        <div className="toolbar">
          <div className="searchwrap">
            <span className="material-symbols-rounded">search</span>
            <input className="in" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="count">{total} ECRs</span>
        </div>
        <div className="twrap">
          {loading ? (
            <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Change Type</th>
                  <th>Item Code</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Effective Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">description</span> No ECRs found.</div></td></tr>
                ) : rows.map((r) => {
                  const priorityInfo = PRIORITIES.find((p) => p.value === r.priority);
                  const actions = (ACTIONABLE_STATUSES[r.status] ?? []).filter((a) =>
                    a.action === 'approve' ? can('planning', 'Approve') : a.action === 'reject' ? can('planning', 'Reject') : true);
                  const sc = STATUS_COLORS[r.status] ?? { color: '#888', bg: '#e9ecef' };
                  return (
                    <tr key={r.id}>
                      <td>{CHANGE_TYPES.find((ct) => ct.value === r.changeType)?.label ?? r.changeType}</td>
                      <td>{r.itemCode}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descriptionOfChange}</td>
                      <td>
                        {priorityInfo && (
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#fff', background: priorityInfo.color }}>
                            {priorityInfo.label}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: sc.color, background: sc.bg }}>
                          {r.status}
                        </span>
                      </td>
                      <td>{r.effectiveDate ?? ''}</td>
                      <td>
                        {actions.map((a) => (
                          <button key={a.action} className="ibtn" title={a.label} onClick={() => setActionTarget({ ecr: r, action: a.action })}>
                            <span className="material-symbols-rounded">{a.icon}</span>
                          </button>
                        ))}
                        <button className="ibtn" title="Edit" onClick={() => { setForm(r as unknown as Record<string, unknown>); setEditId(r.id); }}>
                          <span className="material-symbols-rounded">edit</span>
                        </button>
                        <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(r)}>
                          <span className="material-symbols-rounded">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {total > PAGE_SIZE && (
          <div className="pager">
            <button className="btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span className="sp">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
            <button className="btn" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ECR`} body="Permanently delete this ECR?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />

      <ConfirmActionModal
        open={Boolean(actionTarget)}
        title={actionTarget ? `${actionTarget.action.charAt(0).toUpperCase() + actionTarget.action.slice(1)} ECR` : ''}
        body={`Are you sure you want to ${actionTarget?.action ?? ''} this ECR?`}
        okLabel={actionTarget?.action ? actionTarget.action.charAt(0).toUpperCase() + actionTarget.action.slice(1) : 'Confirm'}
        busy={busy}
        onClose={() => setActionTarget(null)}
        onConfirm={executeAction}
      />
    </>
  );
}
