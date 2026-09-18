import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useTabs } from '../../../contexts/TabsContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

const SCREEN_ID = 'material-planning';

interface MaterialPlan {
  id: number;
  planNumber: string;
  planDate: string;
  plannedBy: string;
  status: string;
  remarks?: string;
  planningType?: string;
  runMode?: string;
  lines?: MaterialPlanLine[];
}

const PLANNING_TYPES = [
  { value: 'ALL', label: 'All Active Work Orders' },
  { value: 'SALES_WORK_ORDER', label: 'Sales Work Order' },
  { value: 'INVENTORY_WORK_ORDER', label: 'Inventory Work Order' },
  { value: 'FIXED_SALES_ORDER', label: 'Fixed Sales Order' },
  { value: 'SCHEDULE_SALES_ORDER', label: 'Schedule Sales Order' },
  { value: 'MIN_STOCK_MANUFACTURING_ITEM', label: 'Min Stock – Manufacturing Item' },
  { value: 'MIN_STOCK_PURCHASE_ITEM', label: 'Min Stock – Purchase Item' },
  { value: 'MANUAL', label: 'Manual' },
];

// Field names mirror MaterialPlanLine on the backend side (grossRequirement/onHandStock/
// netRequirement/recommendedOrderQty/...) so the run output is actually shown in the grid.
interface MaterialPlanLine {
  id: number;
  itemCode: string;
  itemDescription?: string;
  uom?: string;
  bomLevel?: number;
  sourceWoNumber?: string;
  grossRequirement?: number;
  onHandStock?: number;
  onOrderQty?: number;
  wipQty?: number;
  safetyStock?: number;
  netRequirement?: number;
  recommendedOrderQty?: number;
  orderType?: string;
  requiredDate?: string;
  leadTimeDays?: number;
  estimatedCost?: number;
  actionStatus?: string;
  reservedQty?: number;
  reservationStatus?: string;
  allocatedStock?: number;
  priority?: string;
  remarks?: string;
}

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  DRAFT:    { color: '#888',    bg: '#e9ecef' },
  COMPLETE: { color: '#22c55e', bg: '#d4edda' },
  ERROR:    { color: '#ef4444', bg: '#f8d7da' },
};

const ACTION_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  PENDING: { color: '#d97706', bg: '#fef3c7' },
  SPAWNED: { color: '#2563eb', bg: '#dbeafe' },
  DONE:    { color: '#22c55e', bg: '#d4edda' },
};

export default function MaterialPlanningScreen() {
  const { toast } = useToast();
  const { closeTab } = useTabs();
  const [rows, setRows] = useState<MaterialPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [planLines, setPlanLines] = useState<MaterialPlanLine[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [runningMrp, setRunningMrp] = useState<number | null>(null);
  const [spawningId, setSpawningId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/planning/material-plans');
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
    if (!String(form.planDate ?? '').trim()) { toast('Plan Date is required.', 'error'); return; }
    if (!String(form.plannedBy ?? '').trim()) { toast('Planned By is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/v1/planning/material-plans/${editId}`, form);
        toast('Material plan updated.');
      } else {
        await apiClient.post('/v1/planning/material-plans', form);
        toast('Material plan created.');
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
      await apiClient.delete(`/v1/planning/material-plans/${deleteTarget.id}`);
      toast('Material plan deleted.');
      setDeleteTarget(null); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Delete failed.'), 'error');
    }
    setBusy(false);
  };

  const runMrp = async (id: number) => {
    setRunningMrp(id);
    try {
      await apiClient.post(`/v1/planning/material-plans/${id}/run`);
      toast('MRP run completed.');
      load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'MRP run failed.'), 'error');
    }
    setRunningMrp(null);
  };

  const spawnPlan = async (id: number) => {
    setSpawningId(id);
    try {
      const { data } = await apiClient.post(`/v1/planning/material-plans/${id}/spawn`);
      toast(`Spawned ${data.spawnedCount ?? 0} order(s) from the plan.`);
      load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Spawn failed.'), 'error');
    }
    setSpawningId(null);
  };

  const toggleExpand = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); setPlanLines([]); return; }
    setExpandedId(id);
    setLoadingLines(true);
    try {
      const { data } = await apiClient.get(`/v1/planning/material-plans/${id}/lines`);
      setPlanLines(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load plan lines.'), 'error');
      setPlanLines([]);
    }
    setLoadingLines(false);
  };

  const reserve = async (line: MaterialPlanLine) => {
    const qty = line.netRequirement ?? line.grossRequirement ?? 0;
    try {
      await apiClient.put(`/v1/planning/material-plans/lines/${line.id}`, {
        itemCode: line.itemCode,
        itemDescription: line.itemDescription,
        uom: line.uom,
        bomLevel: line.bomLevel,
        grossRequirement: line.grossRequirement,
        onHandStock: line.onHandStock,
        onOrderQty: line.onOrderQty,
        wipQty: line.wipQty,
        safetyStock: line.safetyStock,
        netRequirement: line.netRequirement,
        recommendedOrderQty: line.recommendedOrderQty,
        orderType: line.orderType,
        requiredDate: line.requiredDate,
        leadTimeDays: line.leadTimeDays,
        actionStatus: line.actionStatus ?? 'PENDING',
        reservationStatus: 'RESERVED',
        reservedQty: qty,
        allocatedStock: line.allocatedStock,
      });
      setPlanLines((prev) => prev.map((l) => l.id === line.id ? { ...l, reservationStatus: 'RESERVED', reservedQty: qty } : l));
      toast('Stock reserved.');
    } catch (e) {
      toast(getApiErrorMessage(e, 'Reserve failed.'), 'error');
    }
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (r.planNumber ?? '').toLowerCase().includes(q)
      || (r.plannedBy ?? '').toLowerCase().includes(q)
      || (r.remarks ?? '').toLowerCase().includes(q);
  });

  return (
    <>
      <div className="pg-head">
        <h1>Material Planning</h1>
        <p>Material Requirements Planning (MRP)</p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{editId ? 'Edit' : 'Add'} Material Plan</h2>
        </div>
        <div className="fgrid">
          <label className="fld">
            <span>Plan Number</span>
            <input className="in" value={String(form.planNumber ?? '')} onChange={(e) => set('planNumber', e.target.value)} readOnly={!!editId} />
          </label>
          <label className="fld">
            <span>Plan Date *</span>
            <input className="in" type="date" value={String(form.planDate ?? '')} onChange={(e) => set('planDate', e.target.value)} />
          </label>
          <label className="fld">
            <span>Planned By *</span>
            <input className="in" value={String(form.plannedBy ?? '')} onChange={(e) => set('plannedBy', e.target.value)} />
          </label>
          <label className="fld">
            <span>Horizon Start</span>
            <input className="in" type="date" value={String(form.planningHorizonStart ?? '')} onChange={(e) => set('planningHorizonStart', e.target.value)} />
          </label>
          <label className="fld">
            <span>Horizon End</span>
            <input className="in" type="date" value={String(form.planningHorizonEnd ?? '')} onChange={(e) => set('planningHorizonEnd', e.target.value)} />
          </label>
          <label className="fld">
            <span>Triggered By</span>
            <input className="in" value={String(form.triggeredBy ?? '')} onChange={(e) => set('triggeredBy', e.target.value)} />
          </label>
          <label className="fld">
            <span>Planning Type</span>
            <select className="in" value={String(form.planningType ?? 'ALL')} onChange={(e) => set('planningType', e.target.value)}>
              {PLANNING_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
            </select>
          </label>
          <label className="fld">
            <span>Run Mode</span>
            <select className="in" value={String(form.runMode ?? 'RUN')} onChange={(e) => set('runMode', e.target.value)}>
              <option value="RUN">Run MRP</option>
              <option value="RUN_WITHOUT_STOCK">Run MRP W/o Stock</option>
            </select>
          </label>
          <label className="fld">
            <span>Status</span>
            <select className="in" value={String(form.status ?? 'DRAFT')} onChange={(e) => set('status', e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="COMPLETE">Complete</option>
              <option value="ERROR">Error</option>
            </select>
          </label>
          <label className="fld">
            <span>Remarks</span>
            <input className="in" value={String(form.remarks ?? '')} onChange={(e) => set('remarks', e.target.value)} />
          </label>
        </div>
        <div className="actbar">
          <div className="lft">
            <button type="button" className="btn btn-sm" onClick={() => closeTab(SCREEN_ID)} disabled={busy}><span className="material-symbols-rounded">arrow_back</span> Back</button>
            <span className="material-symbols-rounded">lock</span>{'Material Plans'}
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
                  <th className="num">S.No</th>
                  <th style={{ width: 40 }}></th>
                  <th>Plan Number</th>
                  <th>Plan Date</th>
                  <th>Planned By</th>
                  <th>Planning Type</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9}><div className="empty"><span className="material-symbols-rounded">description</span> No material plans.</div></td></tr>
                ) : filtered.map((r, idx) => (
                  <>
                    <tr key={r.id} onClick={() => toggleExpand(r.id)} style={{ cursor: 'pointer' }}>
                      <td className="num mut">{page * PAGE_SIZE + idx + 1}</td>
                      <td>
                        <span className="material-symbols-rounded">{expandedId === r.id ? 'expand_less' : 'expand_more'}</span>
                      </td>
                      <td>{r.planNumber}</td>
                      <td>{r.planDate}</td>
                      <td>{r.plannedBy}</td>
                      <td>{PLANNING_TYPES.find((pt) => pt.value === r.planningType)?.label ?? r.planningType ?? 'All Active Work Orders'}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: (STATUS_COLORS[r.status] ?? STATUS_COLORS.DRAFT).color, background: (STATUS_COLORS[r.status] ?? STATUS_COLORS.DRAFT).bg }}>
                          {r.status}
                        </span>
                      </td>
                      <td>{r.remarks ?? ''}</td>
                      <td>
                        <button className="ibtn" title="Run MRP" disabled={runningMrp === r.id || r.status !== 'DRAFT'} onClick={(e) => { e.stopPropagation(); runMrp(r.id); }}>
                          <span className="material-symbols-rounded">{runningMrp === r.id ? 'sync' : 'play_arrow'}</span>
                        </button>
                        <button className="ibtn" title="Spawn orders" disabled={spawningId === r.id || r.status === 'DRAFT'} onClick={(e) => { e.stopPropagation(); spawnPlan(r.id); }}>
                          <span className="material-symbols-rounded">{spawningId === r.id ? 'sync' : 'rocket_launch'}</span>
                        </button>
                        <button className="ibtn" title="Edit" onClick={(e) => { e.stopPropagation(); setForm(r as unknown as Record<string, unknown>); setEditId(r.id); }}>
                          <span className="material-symbols-rounded">edit</span>
                        </button>
                        {r.status === 'DRAFT' && (
                          <button className="ibtn danger" title="Delete" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}>
                            <span className="material-symbols-rounded">delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={`${r.id}-lines`}>
                        <td colSpan={9}>
                          <div style={{ background: '#f9fafb', padding: 12, borderBottom: '1px solid #e5e7eb' }}>
                            <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>Plan Lines</h4>
                            {loadingLines ? (
                              <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading lines...</div>
                            ) : planLines.length === 0 ? (
                              <div className="empty"><span className="material-symbols-rounded">info</span> No lines found.</div>
                            ) : (
                              <table className="tbl">
                                <thead>
                                  <tr>
                                    <th>S.No</th>
                                    <th>Item Code</th>
                                    <th>Description</th>
                                    <th className="num">BOM Lvl</th>
                                    <th className="num">Required</th>
                                    <th className="num">Available</th>
                                    <th className="num">On Order</th>
                                    <th className="num">WIP</th>
                                    <th className="num">Safety</th>
                                    <th className="num">Shortfall</th>
                                    <th className="num">Suggested Order</th>
                                    <th>Order Type</th>
                                    <th>Source</th>
                                    <th>Action</th>
                                    <th>Reserved</th>
                                    <th>Reservation</th>
                                    <th>Remarks</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {planLines.map((line, idx) => (
                                    <tr key={line.id}>
                                      <td className="num mut">{idx + 1}</td>
                                      <td>{line.itemCode}</td>
                                      <td>{line.itemDescription ?? ''}</td>
                                      <td className="num">{line.bomLevel ?? 0}</td>
                                      <td className="num">{line.grossRequirement}</td>
                                      <td className="num">{line.onHandStock}</td>
                                      <td className="num">{line.onOrderQty}</td>
                                      <td className="num">{line.wipQty}</td>
                                      <td className="num">{line.safetyStock}</td>
                                      <td className="num" style={{ color: (line.netRequirement ?? 0) > 0 ? '#ef4444' : undefined }}>{line.netRequirement}</td>
                                      <td className="num">{line.recommendedOrderQty}</td>
                                      <td>{line.orderType ?? ''}</td>
                                      <td>{line.sourceWoNumber ?? ''}</td>
                                      <td>
                                        <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: (ACTION_STATUS_COLORS[line.actionStatus ?? 'PENDING']).color, background: (ACTION_STATUS_COLORS[line.actionStatus ?? 'PENDING']).bg }}>
                                          {line.actionStatus ?? 'PENDING'}
                                        </span>
                                      </td>
                                      <td>{line.reservedQty}</td>
                                      <td>
                                        <select className="in" value={line.reservationStatus ?? ''} onChange={(e) => {
                                          const newStatus = e.target.value;
                                          setPlanLines((prev) => prev.map((l) => l.id === line.id ? { ...l, reservationStatus: newStatus } : l));
                                        }}>
                                          <option value="">--</option>
                                          <option value="NOT_RESERVED">Not Reserved</option>
                                          <option value="RESERVED">Reserved</option>
                                          <option value="PARTIALLY_RESERVED">Partially Reserved</option>
                                        </select>
                                      </td>
                                      <td>{line.remarks ?? ''}</td>
                                      <td>
                                        <button className="ibtn" title="Reserve" disabled={line.reservationStatus === 'RESERVED'} onClick={() => reserve(line)}>
                                          <span className="material-symbols-rounded">inventory_2</span>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
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

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.planNumber ?? ''}`} body="Permanently delete this material plan?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}