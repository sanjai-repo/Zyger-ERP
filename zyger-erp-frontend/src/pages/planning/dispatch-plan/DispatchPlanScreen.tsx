import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useTabs } from '../../../contexts/TabsContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

const SCREEN_ID = 'dispatch-plan';

interface DispatchPlan {
  id: number;
  dispatchNumber: string;
  dispatchDate: string;
  customerName: string;
  transportMode?: string;
  transporterName?: string;
  vehicleNumber?: string;
  status: string;
  remarks?: string;
  qcStatus?: string;
  packingStatus?: string;
  deliveryPriority?: string;
  salesOrderRef?: string;
}

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  'PLANNED', 'MATERIAL_READY', 'PRODUCTION_READY', 'FG_READY',
  'QC_PENDING', 'QC_APPROVED', 'PACKING_READY', 'DISPATCH_READY', 'DISPATCHED',
];

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planned',
  MATERIAL_READY: 'Material Ready',
  PRODUCTION_READY: 'Production Ready',
  FG_READY: 'FG Ready',
  QC_PENDING: 'QC Pending',
  QC_APPROVED: 'QC Approved',
  PACKING_READY: 'Packing Ready',
  DISPATCH_READY: 'Dispatch Ready',
  DISPATCHED: 'Dispatched',
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  PLANNED:         { color: '#888',    bg: '#e9ecef' },
  MATERIAL_READY:  { color: '#3b82f6', bg: '#dbeafe' },
  PRODUCTION_READY:{ color: '#6366f1', bg: '#e0e7ff' },
  FG_READY:        { color: '#a855f7', bg: '#f3e8ff' },
  QC_PENDING:      { color: '#f59e0b', bg: '#fef3c7' },
  QC_APPROVED:     { color: '#f59e0b', bg: '#fef3c7' },
  PACKING_READY:   { color: '#f97316', bg: '#ffedd5' },
  DISPATCH_READY:  { color: '#22c55e', bg: '#d4edda' },
  DISPATCHED:      { color: '#10b981', bg: '#d1fae5' },
};

export default function DispatchPlanScreen() {
  const { toast } = useToast();
  const { closeTab } = useTabs();
  const [rows, setRows] = useState<DispatchPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DispatchPlan | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/planning/dispatch-plans');
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
    if (!String(form.dispatchDate ?? '').trim()) { toast('Dispatch Date is required.', 'error'); return; }
    if (!String(form.customerName ?? '').trim()) { toast('Customer Name is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/v1/planning/dispatch-plans/${editId}`, form);
        toast('Dispatch plan updated.');
      } else {
        await apiClient.post('/v1/planning/dispatch-plans', form);
        toast('Dispatch plan created.');
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
      await apiClient.delete(`/v1/planning/dispatch-plans/${deleteTarget.id}`);
      toast('Dispatch plan deleted.');
      setDeleteTarget(null); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Delete failed.'), 'error');
    }
    setBusy(false);
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  return (
    <>
      <div className="pg-head">
        <h1>Dispatch Planning</h1>
        <p>Manage dispatch plans for shipments</p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{editId ? 'Edit' : 'Add'} Dispatch Plan</h2>
        </div>
        <div className="fgrid">
          <label className="fld">
            <span>Dispatch Number</span>
            <input className="in" value={String(form.dispatchNumber ?? '')} onChange={(e) => set('dispatchNumber', e.target.value)} readOnly={!!editId} />
          </label>
          <label className="fld">
            <span>Dispatch Date *</span>
            <input className="in" type="date" value={String(form.dispatchDate ?? '')} onChange={(e) => set('dispatchDate', e.target.value)} />
          </label>
          <label className="fld">
            <span>Customer Name *</span>
            <input className="in" value={String(form.customerName ?? '')} onChange={(e) => set('customerName', e.target.value)} />
          </label>
          <label className="fld">
            <span>Customer PO No</span>
            <input className="in" value={String(form.customerPoNumber ?? '')} onChange={(e) => set('customerPoNumber', e.target.value)} />
          </label>
          <label className="fld">
            <span>Delivery Address</span>
            <input className="in" value={String(form.deliveryAddress ?? '')} onChange={(e) => set('deliveryAddress', e.target.value)} />
          </label>
          <label className="fld">
            <span>Transport Mode</span>
            <select className="in" value={String(form.transportMode ?? '')} onChange={(e) => set('transportMode', e.target.value)}>
              <option value="">Select...</option>
              <option value="ROAD">Road</option>
              <option value="RAIL">Rail</option>
              <option value="AIR">Air</option>
              <option value="SEA">Sea</option>
              <option value="COURIER">Courier</option>
              <option value="CUSTOMER_PICKUP">Customer Pickup</option>
            </select>
          </label>
          <label className="fld">
            <span>Transporter Name</span>
            <input className="in" value={String(form.transporterName ?? '')} onChange={(e) => set('transporterName', e.target.value)} />
          </label>
          <label className="fld">
            <span>Vehicle Number</span>
            <input className="in" value={String(form.vehicleNumber ?? '')} onChange={(e) => set('vehicleNumber', e.target.value)} />
          </label>
          <label className="fld">
            <span>LR Number</span>
            <input className="in" value={String(form.lrNumber ?? '')} onChange={(e) => set('lrNumber', e.target.value)} />
          </label>
          <label className="fld">
            <span>E-Way Bill No</span>
            <input className="in" value={String(form.ewayBillNumber ?? '')} onChange={(e) => set('ewayBillNumber', e.target.value)} />
          </label>
          <label className="fld">
            <span>Total Qty</span>
            <input className="in" type="number" step="0.01" value={String(form.totalQty ?? '')} onChange={(e) => set('totalQty', e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="fld">
            <span>Total Weight (kg)</span>
            <input className="in" type="number" step="0.01" value={String(form.totalWeight ?? '')} onChange={(e) => set('totalWeight', e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="fld">
            <span>Status</span>
            <select className="in" value={String(form.status ?? 'PLANNED')} onChange={(e) => set('status', e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span>QC Status</span>
            <select className="in" value={String(form.qcStatus ?? '')} onChange={(e) => set('qcStatus', e.target.value)}>
              <option value="">Select...</option>
              <option value="QC_PENDING">QC Pending</option>
              <option value="QC_APPROVED">QC Approved</option>
              <option value="QC_REJECTED">QC Rejected</option>
            </select>
          </label>
          <label className="fld">
            <span>Packing Status</span>
            <select className="in" value={String(form.packingStatus ?? '')} onChange={(e) => set('packingStatus', e.target.value)}>
              <option value="">Select...</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETE">Complete</option>
            </select>
          </label>
          <label className="fld">
            <span>Delivery Priority</span>
            <select className="in" value={String(form.deliveryPriority ?? '')} onChange={(e) => set('deliveryPriority', e.target.value)}>
              <option value="">Select...</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>
          <label className="fld">
            <span>Sales Order Ref</span>
            <input className="in" value={String(form.salesOrderRef ?? '')} onChange={(e) => set('salesOrderRef', e.target.value)} />
          </label>
          <label className="fld">
            <span>Remarks</span>
            <input className="in" value={String(form.remarks ?? '')} onChange={(e) => set('remarks', e.target.value)} />
          </label>
        </div>
        <div className="actbar">
          <div className="lft">
            <button type="button" className="btn btn-sm" onClick={() => closeTab(SCREEN_ID)} disabled={busy}><span className="material-symbols-rounded">arrow_back</span> Back</button>
            <span className="material-symbols-rounded">lock</span>{'Dispatch Plans'}
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
          <span className="count">{total} plans</span>
        </div>
        <div className="twrap">
          {loading ? (
            <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Dispatch No</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Transport Mode</th>
                  <th>Transporter</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty"><span className="material-symbols-rounded">description</span> No dispatch plans.</div></td></tr>
                ) : rows.map((r) => {
                  const sc = STATUS_COLORS[r.status] ?? { color: '#888', bg: '#e9ecef' };
                  return (
                    <tr key={r.id}>
                      <td>{r.dispatchNumber}</td>
                      <td>{r.dispatchDate}</td>
                      <td>{r.customerName}</td>
                      <td>{r.transportMode ?? ''}</td>
                      <td>{r.transporterName ?? ''}</td>
                      <td>{r.vehicleNumber ?? ''}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: sc.color, background: sc.bg }}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td>
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
            <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span className="sp">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
            <button className="btn btn-sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.dispatchNumber ?? ''}`} body="Permanently delete this dispatch plan?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
