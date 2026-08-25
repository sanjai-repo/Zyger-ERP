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
  machineDescription: string;
  workCenter: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  utilizationPercent: number;
  workOrderId?: string;
  operationCode?: string;
  status: string;
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
                  <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">description</span> No machine load plans.</div></td></tr>
                ) : rows.map((r) => (
                  <>
                    <tr key={r.id} onClick={() => toggleExpand(r.id)} style={{ cursor: 'pointer' }}>
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
                        <td colSpan={7}>
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
                                    <th>Machine</th>
                                    <th>Description</th>
                                    <th>Work Center</th>
                                    <th>Date</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Utilization</th>
                                    <th>Work Order</th>
                                    <th>Operation</th>
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {loadLines.map((line) => (
                                    <tr key={line.id}>
                                      <td>{line.machineCode}</td>
                                      <td>{line.machineDescription}</td>
                                      <td>{line.workCenter}</td>
                                      <td>{line.scheduledDate}</td>
                                      <td>{line.startTime}</td>
                                      <td>{line.endTime}</td>
                                      <td>
                                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#fff', background: getUtilizationColor(line.utilizationPercent) }}>
                                          {line.utilizationPercent.toFixed(1)}%
                                        </span>
                                      </td>
                                      <td>{line.workOrderId ?? ''}</td>
                                      <td>{line.operationCode ?? ''}</td>
                                      <td>{line.status}</td>
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

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.planNumber ?? ''}`} body="Permanently delete this machine load plan?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
