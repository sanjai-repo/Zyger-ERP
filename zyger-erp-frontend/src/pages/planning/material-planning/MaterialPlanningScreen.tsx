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
  lines?: MaterialPlanLine[];
}

interface MaterialPlanLine {
  id: number;
  itemCode: string;
  itemDescription: string;
  requiredQty: number;
  availableQty: number;
  shortfallQty: number;
  suggestedOrderQty: number;
  sourceType: string;
  remarks?: string;
  reservedQty: number;
  reservationStatus: string;
  allocatedStock: number;
  netRequirement: number;
}

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  DRAFT:    { color: '#888',    bg: '#e9ecef' },
  COMPLETE: { color: '#22c55e', bg: '#d4edda' },
  ERROR:    { color: '#ef4444', bg: '#f8d7da' },
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

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

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
                  <th style={{ width: 40 }}></th>
                  <th>Plan Number</th>
                  <th>Plan Date</th>
                  <th>Planned By</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">description</span> No material plans.</div></td></tr>
                ) : rows.map((r) => (
                  <>
                    <tr key={r.id} onClick={() => toggleExpand(r.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <span className="material-symbols-rounded">{expandedId === r.id ? 'expand_less' : 'expand_more'}</span>
                      </td>
                      <td>{r.planNumber}</td>
                      <td>{r.planDate}</td>
                      <td>{r.plannedBy}</td>
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
                        <td colSpan={7}>
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
                                    <th>Item Code</th>
                                    <th>Description</th>
                                    <th>Required Qty</th>
                                    <th>Available Qty</th>
                                    <th>Shortfall</th>
                                    <th>Suggested Order</th>
                                    <th>Source</th>
                                    <th>Reserved Qty</th>
                                    <th>Reservation Status</th>
                                    <th>Allocated Stock</th>
                                    <th>Remarks</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {planLines.map((line) => (
                                    <tr key={line.id}>
                                      <td>{line.itemCode}</td>
                                      <td>{line.itemDescription}</td>
                                      <td>{line.requiredQty}</td>
                                      <td>{line.availableQty}</td>
                                      <td style={{ color: line.shortfallQty > 0 ? '#ef4444' : undefined }}>{line.shortfallQty}</td>
                                      <td>{line.suggestedOrderQty}</td>
                                      <td>{line.sourceType}</td>
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
                                      <td>{line.allocatedStock}</td>
                                      <td>{line.remarks ?? ''}</td>
                                      <td>
                                        <button className="ibtn" title="Reserve" disabled={line.reservationStatus === 'RESERVED'} onClick={() => {
                                          setPlanLines((prev) => prev.map((l) => l.id === line.id ? { ...l, reservationStatus: 'RESERVED', reservedQty: line.netRequirement } : l));
                                        }}>
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
