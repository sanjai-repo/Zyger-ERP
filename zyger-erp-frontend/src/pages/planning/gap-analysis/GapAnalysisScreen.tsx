import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

interface GapAnalysis {
  id: number;
  analysisDate: string;
  scope: string;
  scopeValue?: string;
  status: string;
  remarks?: string;
}

interface GapResult {
  id: number;
  severity: string;
  gapType: string;
  description: string;
  componentCode?: string;
  componentDescription?: string;
  requiredQty?: number;
  availableQty?: number;
  gapQty?: number;
  demandHours?: number;
  supplyHours?: number;
  gapHours?: number;
  gapValue?: number;
  suggestedAction?: string;
  actionStatus?: string;
  gapOwner?: string;
  responsibleDepartment?: string;
  expectedResolutionDate?: string;
}

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  DRAFT:    { color: '#888',    bg: '#e9ecef' },
  COMPLETE: { color: '#22c55e', bg: '#d4edda' },
};

const SEVERITY_COLORS: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: '#dc3545', bg: '#f8d7da' },
  HIGH:     { color: '#fd7e14', bg: '#fff3cd' },
  MEDIUM:   { color: '#ffc107', bg: '#fff3cd' },
  LOW:      { color: '#28a745', bg: '#d4edda' },
};

export default function GapAnalysisScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<GapAnalysis[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GapAnalysis | null>(null);
  const [runTarget, setRunTarget] = useState<GapAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [results, setResults] = useState<GapResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [gapTypeFilter, setGapTypeFilter] = useState('');
  // FRS §6.14: Async progress tracking for analysis runs
  const [runProgress, setRunProgress] = useState<{ step: number; steps: string[] } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      const { data } = await apiClient.get(`/v1/planning/gap-analysis?${params}`);
      const items = data.content ?? (Array.isArray(data) ? data : []);
      setRows(items);
      setTotal(data.totalElements ?? items.length);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load gap analyses.'), 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const save = async () => {
    if (!String(form.scope ?? '').trim()) { toast('Scope is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/v1/planning/gap-analysis/${editId}`, form);
        toast('Gap analysis updated.');
      } else {
        await apiClient.post('/v1/planning/gap-analysis', form);
        toast('Gap analysis created.');
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
      await apiClient.delete(`/v1/planning/gap-analysis/${deleteTarget.id}`);
      toast('Deleted.');
      setDeleteTarget(null); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Delete failed.'), 'error');
    }
    setBusy(false);
  };

  const ANALYSIS_STEPS = ['Validating scope', 'Collecting demand data', 'Collecting supply data', 'Computing gaps', 'Generating results'];

  const runAnalysis = async () => {
    if (!runTarget) return;
    setBusy(true);
    setRunProgress({ step: 0, steps: ANALYSIS_STEPS });
    try {
      // Simulate step-by-step progress while the actual API call runs
      const apiPromise = apiClient.post(`/v1/planning/gap-analysis/${runTarget.id}/run`);
      for (let i = 1; i < ANALYSIS_STEPS.length; i++) {
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
        setRunProgress((p) => p ? { ...p, step: i } : null);
      }
      await apiPromise;
      setRunProgress((p) => p ? { ...p, step: ANALYSIS_STEPS.length } : null);
      await new Promise((r) => setTimeout(r, 500));
      toast('Analysis completed successfully.');
      setRunTarget(null); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Run failed.'), 'error');
    }
    setRunProgress(null);
    setBusy(false);
  };

  const toggleResults = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); setResults([]); return; }
    setExpandedId(id);
    setResultsLoading(true);
    try {
      const { data } = await apiClient.get(`/v1/planning/gap-analysis/${id}/results`);
      setResults(data.content ?? (Array.isArray(data) ? data : []));
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load results.'), 'error');
      setResults([]);
    }
    setResultsLoading(false);
  };

  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  return (
    <>
      <div className="pg-head">
        <h1>Gap Analysis</h1>
        <p>Analyze demand vs. supply gaps</p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{editId ? 'Edit' : 'Add'} Gap Analysis</h2>
        </div>
        <div className="fgrid">
          <label className="fld">
            <span>Analysis Date</span>
            <input className="in" type="date" value={String(form.analysisDate ?? '')} onChange={(e) => set('analysisDate', e.target.value)} />
          </label>
          <label className="fld">
            <span>Scope *</span>
            <select className="in" value={String(form.scope ?? '')} onChange={(e) => set('scope', e.target.value)}>
              <option value="">Select...</option>
              <option value="ALL">All</option>
              <option value="CUSTOMER">Customer</option>
              <option value="ITEM_GROUP">Item Group</option>
              <option value="FIXTURE_GAP">Fixture Gap</option>
            </select>
          </label>
          <label className="fld">
            <span>Scope Value</span>
            <input className="in" value={String(form.scopeValue ?? '')} onChange={(e) => set('scopeValue', e.target.value)} />
          </label>
          <label className="fld">
            <span>Status</span>
            <select className="in" value={String(form.status ?? 'DRAFT')} onChange={(e) => set('status', e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="COMPLETE">Complete</option>
            </select>
          </label>
          <label className="fld">
            <span>Remarks</span>
            <input className="in" value={String(form.remarks ?? '')} onChange={(e) => set('remarks', e.target.value)} />
          </label>
        </div>
        <div className="actbar">
          <span className="lft">
            {editId && <button className="btn" onClick={() => { setForm({}); setEditId(null); }} disabled={busy}>Cancel</button>}
          </span>
          <button className="btn btn-p" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create'}</button>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <div className="searchwrap">
            <span className="material-symbols-rounded">search</span>
            <input className="in" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <label className="fld">
            <span>Gap Type</span>
            <select className="in" value={gapTypeFilter} onChange={(e) => setGapTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="MATERIAL">Material Gap</option>
              <option value="MACHINE_CAPACITY">Machine Capacity Gap</option>
              <option value="MANPOWER">Manpower Gap</option>
              <option value="TOOL">Tool Gap</option>
              <option value="FIXTURE">Fixture Gap</option>
              <option value="QUALITY">Quality Gap</option>
              <option value="SUBCONTRACT">Subcontract Gap</option>
              <option value="PRODUCTION_CAPACITY">Production Capacity Gap</option>
              <option value="DELIVERY">Delivery/Time Gap</option>
            </select>
          </label>
          <span className="count">{total} analyses</span>
        </div>
        <div className="twrap">
          {loading ? (
            <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Date</th>
                  <th>Scope</th>
                  <th>Scope Value</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">search_off</span> No analyses found.</div></td></tr>
                ) : rows.map((r) => (
                  <>
                    <tr key={r.id} onClick={() => toggleResults(r.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <span className="material-symbols-rounded">{expandedId === r.id ? 'expand_less' : 'expand_more'}</span>
                      </td>
                      <td>{r.analysisDate}</td>
                      <td>{r.scope}</td>
                      <td>{r.scopeValue ?? '—'}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: (STATUS_COLORS[r.status] ?? STATUS_COLORS.DRAFT).color, background: (STATUS_COLORS[r.status] ?? STATUS_COLORS.DRAFT).bg }}>
                          {r.status}
                        </span>
                      </td>
                      <td>{r.remarks ?? ''}</td>
                      <td>
                        <button className="ibtn" title="Run Analysis" onClick={(e) => { e.stopPropagation(); setRunTarget(r); }}>
                          <span className="material-symbols-rounded">play_arrow</span>
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
                      <tr key={`${r.id}-results`}>
                        <td colSpan={7}>
                          <div style={{ background: '#f9fafb', padding: 12, borderBottom: '1px solid #e5e7eb' }}>
                            <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>Analysis Results</h4>
                            {resultsLoading ? (
                              <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading results...</div>
                            ) : results.length === 0 ? (
                              <div className="empty"><span className="material-symbols-rounded">info</span> No results. Run the analysis first.</div>
                            ) : (
                              <table className="tbl">
                                <thead>
                                  <tr>
                                    <th>Severity</th>
                                    <th>Gap Type</th>
                                    <th>Component</th>
                                    <th>Required</th>
                                    <th>Available</th>
                                    <th>Gap Qty</th>
                                    <th>Gap Hours</th>
                                    <th>Gap Value</th>
                                    <th>Owner</th>
                                    <th>Action Status</th>
                                    <th>Suggested Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {results.filter((res) => !gapTypeFilter || res.gapType === gapTypeFilter).map((res) => {
                                    const sev = SEVERITY_COLORS[res.severity] ?? { color: '#888', bg: '#e9ecef' };
                                    return (
                                      <tr key={res.id}>
                                        <td>
                                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: sev.color, background: sev.bg }}>
                                            {res.severity}
                                          </span>
                                        </td>
                                        <td>{res.gapType ?? '—'}</td>
                                        <td>{res.componentCode ?? res.componentDescription ?? '—'}</td>
                                        <td>{res.requiredQty ?? '—'}</td>
                                        <td>{res.availableQty ?? '—'}</td>
                                        <td>{res.gapQty ?? '—'}</td>
                                        <td>{res.gapHours ?? '—'}</td>
                                        <td>{res.gapValue != null ? `$${res.gapValue.toLocaleString()}` : '—'}</td>
                                        <td>{res.gapOwner ?? '—'}</td>
                                        <td>{res.actionStatus ?? '—'}</td>
                                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.suggestedAction ?? '—'}</td>
                                      </tr>
                                    );
                                  })}
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
            <button className="btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span className="sp">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
            <button className="btn" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      <ConfirmActionModal open={Boolean(runTarget)} title={runTarget ? `Run Analysis` : ''} body={runProgress ? undefined : "Execute this gap analysis run?"} okLabel="Run" busy={busy} onClose={() => { if (!busy) { setRunTarget(null); setRunProgress(null); } }} onConfirm={runAnalysis}>
        {runProgress && (
          <div style={{ padding: '12px 0' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {runProgress.steps.map((step, i) => (
                <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < runProgress.step ? '#16a34a' : i === runProgress.step ? '#2563eb' : '#e5e7eb', transition: 'background 0.3s' }} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#2563eb', animation: 'spin 1s linear infinite' }}>sync</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374464' }}>{runProgress.steps[runProgress.step] ?? 'Done'}...</span>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </ConfirmActionModal>

      <ConfirmActionModal open={Boolean(deleteTarget)} title={deleteTarget ? `Delete Analysis` : ''} body="Delete this gap analysis?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
