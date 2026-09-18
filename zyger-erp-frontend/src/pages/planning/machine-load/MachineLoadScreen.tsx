import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useTabs } from '../../../contexts/TabsContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

const SCREEN_ID = 'machine-load';

interface MachineLoadPlan {
  id: number;
  planNumber: string;
  planStartDate: string;
  planEndDate: string;
  status: string;
  remarks?: string;
  lines?: MachineLoadLine[];
}

interface MachineLoadLine {
  id: number;
  machineCode: string;
  loadDate?: string;
  shiftName?: string;
  availableHours?: number;
  plannedLoadHours?: number;
  utilizationPercent?: number;
  isOverloaded?: boolean;
  overloadHours?: number;
  woNumber?: string;
  operationSequence?: number;
  woOperationCode?: string;
  processQty?: number;
  processTimeHrs?: number;
  setupHours?: number;
  runHours?: number;
  previousProcessEnd?: string;
  startTime?: string;
  endTime?: string;
  totalTimeSec?: number;
  itemCode?: string;
  itemName?: string;
  processName?: string;
  operatorCode?: string;
  toolCode?: string;
  rescheduleAction?: string;
  rescheduleMachineCode?: string;
  rescheduleShift?: string;
  rescheduleDate?: string;
}

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  DRAFT:       { color: '#888',    bg: '#e9ecef' },
  ACTIVE:      { color: '#3b82f6', bg: '#dbeafe' },
  SUPERSEDED:  { color: '#f59e0b', bg: '#fef3c7' },
};

function getUtilizationColor(pct: number): string {
  if (pct > 95) return '#ef4444';
  if (pct >= 80) return '#f59e0b';
  return '#22c55e';
}

function fmtDt(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function MachineLoadScreen() {
  const { toast } = useToast();
  const { closeTab } = useTabs();
  const [rows, setRows] = useState<MachineLoadPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MachineLoadPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadLines, setLoadLines] = useState<MachineLoadLine[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [addForm, setAddForm] = useState<Record<string, unknown>>({});
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/planning/machine-load-plans');
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
    if (!String(form.planStartDate ?? '').trim()) { toast('Plan Start Date is required.', 'error'); return; }
    if (!String(form.planEndDate ?? '').trim()) { toast('Plan End Date is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/v1/planning/machine-load-plans/${editId}`, form);
        toast('Machine load plan updated.');
      } else {
        await apiClient.post('/v1/planning/machine-load-plans', form);
        toast('Machine load plan created.');
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
      await apiClient.delete(`/v1/planning/machine-load-plans/${deleteTarget.id}`);
      toast('Machine load plan deleted.');
      setDeleteTarget(null); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Delete failed.'), 'error');
    }
    setBusy(false);
  };

  const generateLoad = async (id: number) => {
    setGenerating(id);
    try {
      await apiClient.post(`/v1/planning/machine-load-plans/${id}/generate`);
      toast('Machine load generated.');
      load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Generate load failed.'), 'error');
    }
    setGenerating(null);
  };

  const saveLine = async (line: MachineLoadLine) => {
    try {
      const body: Record<string, unknown> = {
        startTime: line.startTime ?? null,
        processQty: line.processQty ?? null,
        operatorCode: line.operatorCode ?? null,
        toolCode: line.toolCode ?? null,
        remarks: null,
      };
      if ((line.rescheduleAction ?? '') === 'ANOTHER_MACHINE') {
        body.machineCode = line.rescheduleMachineCode ?? null;
      }
      if ((line.rescheduleAction ?? '') === 'ANOTHER_DATE' && line.rescheduleDate) {
        body.loadDate = new Date(`${line.rescheduleDate}T00:00:00`).toISOString();
      }
      if ((line.rescheduleAction ?? '') === 'ANOTHER_SHIFT') {
        body.shiftName = line.rescheduleShift ?? null;
      }
      if ((line.rescheduleAction ?? '') === 'SUBCONTRACT') {
        toast('Set the Route operation to subcontract, then regenerate.', 'error');
        return;
      }
      await apiClient.put(`/v1/planning/machine-load-lines/${line.id}`, body);
      toast('Line rescheduled and re-sequenced.');
      if (expandedId) {
        const { data } = await apiClient.get(`/v1/planning/machine-load-plans/${expandedId}/lines`);
        setLoadLines(Array.isArray(data) ? data : data.content ?? []);
      }
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to update line.'), 'error');
    }
  };

  // FRS §8 rule 3 / §19: recompute process time, End datetime and capacity overload server-side.
  const calculateLine = async (line: MachineLoadLine) => {
    try {
      await apiClient.post(`/v1/planning/machine-load-plans/${expandedId}/lines/${line.id}/calculate`);
      toast('Line calculated.');
      if (expandedId) {
        const { data } = await apiClient.get(`/v1/planning/machine-load-plans/${expandedId}/lines`);
        setLoadLines(Array.isArray(data) ? data : data.content ?? []);
      }
    } catch (e) {
      toast(getApiErrorMessage(e, 'Calculate failed.'), 'error');
    }
  };

  const updateLine = (lineId: number, field: string, value: string) => {
    setLoadLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, [field]: value } : l))
    );
  };

  // Add one Work Order + operation as a sequenced machine-load line (FRS §19).
  const addLine = async () => {
    if (!expandedId || !addForm.woNumber) { toast('Enter a Work Order number.', 'error'); return; }
    setAdding(true);
    try {
      const body: Record<string, unknown> = {
        woNumber: addForm.woNumber,
        operationSequence: addForm.operationSequence ? Number(addForm.operationSequence) : 1,
        machineCode: addForm.machineCode ?? null,
        processQty: addForm.processQty ? Number(addForm.processQty) : null,
      };
      if (addForm.startTime) body.startTime = addForm.startTime;
      if (addForm.loadDate) body.loadDate = new Date(`${addForm.loadDate}T00:00:00`).toISOString();
      await apiClient.post(`/v1/planning/machine-load-plans/${expandedId}/lines`, body);
      toast('Operation line added and sequenced.');
      setAddForm({});
      const { data } = await apiClient.get(`/v1/planning/machine-load-plans/${expandedId}/lines`);
      setLoadLines(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to add line.'), 'error');
    }
    setAdding(false);
  };

  const toggleExpand = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); setLoadLines([]); return; }
    setExpandedId(id);
    setLoadingLines(true);
    try {
      const { data } = await apiClient.get(`/v1/planning/machine-load-plans/${id}/lines`);
      setLoadLines(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load plan lines.'), 'error');
      setLoadLines([]);
    }
    setLoadingLines(false);
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  return (
    <>
      <div className="pg-head">
        <h1>Machine Load Planning</h1>
        <p>Machine utilization and load balancing</p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{editId ? 'Edit' : 'Add'} Machine Load Plan</h2>
        </div>
        <div className="fgrid">
          <label className="fld">
            <span>Plan Number</span>
            <input className="in" value={String(form.planNumber ?? '')} onChange={(e) => set('planNumber', e.target.value)} readOnly={!!editId} />
          </label>
          <label className="fld">
            <span>Plan Start Date *</span>
            <input className="in" type="date" value={String(form.planStartDate ?? '')} onChange={(e) => set('planStartDate', e.target.value)} />
          </label>
          <label className="fld">
            <span>Plan End Date *</span>
            <input className="in" type="date" value={String(form.planEndDate ?? '')} onChange={(e) => set('planEndDate', e.target.value)} />
          </label>
          <label className="fld">
            <span>Status</span>
            <select className="in" value={String(form.status ?? 'DRAFT')} onChange={(e) => set('status', e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="SUPERSEDED">Superseded</option>
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
            <span className="material-symbols-rounded">lock</span>{'Machine Load Plans'}
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
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty"><span className="material-symbols-rounded">description</span> No machine load plans.</div></td></tr>
                ) : rows.map((r, idx) => (
                  <>
                    <tr key={r.id} onClick={() => toggleExpand(r.id)} style={{ cursor: 'pointer' }}>
                      <td className="num mut">{page * PAGE_SIZE + idx + 1}</td>
                      <td>
                        <span className="material-symbols-rounded">{expandedId === r.id ? 'expand_less' : 'expand_more'}</span>
                      </td>
                      <td>{r.planNumber}</td>
                      <td>{r.planStartDate}</td>
                      <td>{r.planEndDate}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: (STATUS_COLORS[r.status] ?? STATUS_COLORS.DRAFT).color, background: (STATUS_COLORS[r.status] ?? STATUS_COLORS.DRAFT).bg }}>
                          {r.status}
                        </span>
                      </td>
                      <td>{r.remarks ?? ''}</td>
                      <td>
                        <button className="ibtn" title="Generate Load" disabled={generating === r.id} onClick={(e) => { e.stopPropagation(); generateLoad(r.id); }}>
                          <span className="material-symbols-rounded">{generating === r.id ? 'sync' : 'precision_manufacturing'}</span>
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
                        <td colSpan={8}>
                          <div style={{ background: '#f9fafb', padding: 12, borderBottom: '1px solid #e5e7eb' }}>
                            <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>Machine Load Lines</h4>
                            {loadingLines ? (
                              <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading lines...</div>
                            ) : loadLines.length === 0 ? (
                              <div className="empty"><span className="material-symbols-rounded">info</span> No load lines found.</div>
                            ) : (
                              <table className="tbl">
                                <thead>
                                  <tr>
                                    <th>S.No</th>
                                    <th>Machine</th>
                                    <th>Process</th>
                                    <th>Qty</th>
                                    <th>Date</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Prev End</th>
                                    <th>Utilization</th>
                                    <th>Work Order</th>
                                    <th>Op</th>
                                    <th>Overload</th>
                                    <th>Action</th>
                                    <th></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {loadLines.map((line, idx) => (
                                    <tr key={line.id}>
                                      <td className="num mut">{idx + 1}</td>
                                      <td>{line.machineCode}</td>
                                      <td>{line.processName ?? line.woOperationCode ?? ''}</td>
                                      <td className="num">{line.processQty ?? ''}</td>
                                      <td>{line.loadDate ? line.loadDate.slice(0, 10) : ''}</td>
                                      <td>{line.startTime ? fmtDt(line.startTime) : ''}</td>
                                      <td>{line.endTime ? fmtDt(line.endTime) : ''}</td>
                                      <td>{line.previousProcessEnd ? fmtDt(line.previousProcessEnd) : ''}</td>
                                      <td>
                                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#fff', background: getUtilizationColor(line.utilizationPercent ?? 0) }}>
                                          {(line.utilizationPercent ?? 0).toFixed(1)}%
                                        </span>
                                      </td>
                                      <td>{line.woNumber ?? ''}</td>
                                      <td>{line.operationSequence ?? ''}</td>
                                      <td>
                                        {line.isOverloaded ? (
                                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#fff', background: '#dc2626' }}>
                                            +{(line.overloadHours ?? 0).toFixed(2)}h
                                          </span>
                                        ) : (
                                          <span className="mut">-</span>
                                        )}
                                      </td>
                                      <td>
                                        <select
                                          className="in"
                                          value={line.rescheduleAction ?? ''}
                                          onChange={(e) => updateLine(line.id, 'rescheduleAction', e.target.value)}
                                        >
                                          <option value="">None</option>
                                          <option value="ANOTHER_MACHINE">Another Machine</option>
                                          <option value="ANOTHER_SHIFT">Another Shift</option>
                                          <option value="ANOTHER_DATE">Another Date</option>
                                          <option value="SUBCONTRACT">Subcontract</option>
                                        </select>
                                        {(line.rescheduleAction ?? '') === 'ANOTHER_MACHINE' && (
                                          <input
                                            className="in"
                                            style={{ marginTop: 4 }}
                                            value={line.rescheduleMachineCode ?? ''}
                                            onChange={(e) => updateLine(line.id, 'rescheduleMachineCode', e.target.value)}
                                            placeholder="Machine code"
                                          />
                                        )}
                                        {(line.rescheduleAction ?? '') === 'ANOTHER_SHIFT' && (
                                          <input
                                            className="in"
                                            style={{ marginTop: 4 }}
                                            value={line.rescheduleShift ?? ''}
                                            onChange={(e) => updateLine(line.id, 'rescheduleShift', e.target.value)}
                                            placeholder="Shift"
                                          />
                                        )}
                                        {(line.rescheduleAction ?? '') === 'ANOTHER_DATE' && (
                                          <input
                                            className="in"
                                            style={{ marginTop: 4 }}
                                            type="date"
                                            value={line.rescheduleDate ?? ''}
                                            onChange={(e) => updateLine(line.id, 'rescheduleDate', e.target.value)}
                                          />
                                        )}
                                      </td>
                                      <td>
                                        <button className="ibtn" title="Calculate time & capacity" onClick={() => calculateLine(line)}>
                                          <span className="material-symbols-rounded">calculate</span>
                                        </button>
                                        {(line.rescheduleAction ?? '') !== '' && (
                                          <button className="ibtn" title="Save reschedule" onClick={() => saveLine(line)}>
                                            <span className="material-symbols-rounded">save</span>
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                              <span className="mut" style={{ fontSize: 12 }}>Add operation line:</span>
                              <input
                                className="in"
                                style={{ width: 140 }}
                                placeholder="WO No"
                                value={(addForm.woNumber as string) ?? ''}
                                onChange={(e) => setAddForm((c) => ({ ...c, woNumber: e.target.value }))}
                              />
                              <input
                                className="in"
                                style={{ width: 70 }}
                                placeholder="Op No"
                                value={(addForm.operationSequence as string) ?? ''}
                                onChange={(e) => setAddForm((c) => ({ ...c, operationSequence: e.target.value }))}
                              />
                              <input
                                className="in"
                                style={{ width: 110 }}
                                placeholder="Machine"
                                value={(addForm.machineCode as string) ?? ''}
                                onChange={(e) => setAddForm((c) => ({ ...c, machineCode: e.target.value }))}
                              />
                              <input
                                className="in"
                                style={{ width: 80 }}
                                placeholder="Qty"
                                value={(addForm.processQty as string) ?? ''}
                                onChange={(e) => setAddForm((c) => ({ ...c, processQty: e.target.value }))}
                              />
                              <input
                                className="in"
                                style={{ width: 160 }}
                                type="datetime-local"
                                placeholder="Start"
                                value={(addForm.startTime as string) ?? ''}
                                onChange={(e) => setAddForm((c) => ({ ...c, startTime: new Date(e.target.value).toISOString() }))}
                              />
                              <button className="btn btn-primary" disabled={adding} onClick={addLine}>
                                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>add</span> Add
                              </button>
                            </div>
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

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.planNumber ?? ''}`} body="Permanently delete this machine load plan?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
