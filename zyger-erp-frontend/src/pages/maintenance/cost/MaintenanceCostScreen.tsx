import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface CostRow { id: number; costReference: string; parentType: string; parentNumber: string; machineCode: string; costCategory: string; costType: string; description: string; amount: number; qty: number; rate: number; currency: string; incurredDate: string; postedBy: string; immutable: boolean; reversalId: number | null; }
interface CostSummary { byCategory: Record<string, number>; total: number; count: number; }

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  BREAKDOWN: { color: '#b91c1c', bg: '#fee2e2' },
  PM: { color: '#2563eb', bg: '#dbeafe' },
  TOOLING: { color: '#7c3aed', bg: '#ede9fe' },
  CALIBRATION: { color: '#0d9488', bg: '#ccfbf1' },
  SPARE: { color: '#b45309', bg: '#fde68a' },
  LABOUR: { color: '#1d4ed8', bg: '#bfdbfe' },
  CONTRACT: { color: '#475569', bg: '#e2e8f0' },
  OTHER: { color: '#6b7280', bg: '#f3f4f6' },
};

const CATEGORIES = ['BREAKDOWN', 'PM', 'TOOLING', 'CALIBRATION', 'SPARE', 'LABOUR', 'CONTRACT', 'OTHER'];
const COST_TYPES = ['SERVICE_COST', 'SPARE_ISSUE', 'LABOUR_HOURS', 'CONTRACT', 'ADJUSTMENT', 'OTHER'];

export default function MaintenanceCostScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CostRow[]>([]);
  const [summary, setSummary] = useState<CostSummary>({ byCategory: {}, total: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [machineFilter, setMachineFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [reverseTarget, setReverseTarget] = useState<CostRow | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (machineFilter) params.machineCode = machineFilter;
      if (categoryFilter) params.category = categoryFilter;
      const [res, sumRes] = await Promise.all([
        apiClient.get('/v1/maintenance/cost-transactions', { params }),
        apiClient.get('/v1/maintenance/cost-transactions/summary', { params: machineFilter ? { machineCode: machineFilter } : {} }),
      ]);
      setRows(Array.isArray(res.data) ? res.data : res.data.content ?? []);
      setSummary(sumRes.data as CostSummary);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [machineFilter, categoryFilter]);

  const setField = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const save = async () => {
    if (!form.costCategory || form.amount == null) { toast('Cost category and amount are required.', 'error'); return; }
    setBusy(true);
    try {
      await apiClient.post('/v1/maintenance/cost-transactions', form);
      toast('Cost transaction posted.');
      setForm({}); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const doReverse = async () => {
    if (!reverseTarget) return;
    setBusy(true);
    try { await apiClient.post(`/v1/maintenance/cost-transactions/${reverseTarget.id}/reverse`, { reason: reverseReason }); toast('Cost transaction reversed.'); setReverseTarget(null); setReverseReason(''); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Reverse failed.'), 'error'); }
    setBusy(false);
  };

  const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <div className="pg-head"><h1>Maintenance Cost Ledger</h1><p>Persisted maintenance costs — immutable once the parent document is closed</p></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[{ label: 'Total Maintenance Cost', value: fmt(summary.total), color: '#374151', bg: '#f9fafb', k: 'total' }].map((kpi) => (
          <div key={kpi.k} className="panel" style={{ padding: '12px 16px', background: kpi.bg }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
        {Object.entries(summary.byCategory).map(([cat, amt]) => {
          const c = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.OTHER;
          return (
            <div key={cat} className="panel" style={{ padding: '12px 16px', background: c.bg }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{fmt(amt)}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{cat}</div>
            </div>
          );
        })}
      </div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>Post Maintenance Cost (Adjustment)</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Cost Category *</span>
              <select className="in" value={String(form.costCategory ?? '')} onChange={(e) => setField('costCategory', e.target.value)}>
                <option value="">Select...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="fld"><span>Cost Type</span>
              <select className="in" value={String(form.costType ?? '')} onChange={(e) => setField('costType', e.target.value)}>
                <option value="">Select...</option>
                {COST_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="fld"><span>Machine Code</span><input className="in" value={String(form.machineCode ?? '')} onChange={(e) => setField('machineCode', e.target.value)} /></label>
            <label className="fld"><span>Amount *</span><input className="in" type="number" step="0.01" value={String(form.amount ?? '')} onChange={(e) => setField('amount', e.target.value)} /></label>
            <label className="fld"><span>Qty</span><input className="in" type="number" step="0.01" value={String(form.qty ?? '')} onChange={(e) => setField('qty', e.target.value)} /></label>
            <label className="fld"><span>Rate</span><input className="in" type="number" step="0.01" value={String(form.rate ?? '')} onChange={(e) => setField('rate', e.target.value)} /></label>
            <label className="fld"><span>Description</span><input className="in" value={String(form.description ?? '')} onChange={(e) => setField('description', e.target.value)} /></label>
            <label className="fld"><span>Incurred Date</span><input className="in" type="date" value={String(form.incurredDate ?? '').slice(0, 10)} onChange={(e) => setField('incurredDate', e.target.value)} /></label>
          </div>
          <div className="actbar">
            <span className="lft"><button className="btn btn-sm" onClick={() => setTab('list')}><span className="material-symbols-rounded">arrow_back</span> Back</button></span>
            <span className="rgt"><button className="btn btn-sm btn-p" onClick={save} disabled={busy}>Post</button></span>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <div className="panel">
          <div className="toolbar" style={{ gap: '8px', justifyContent: 'flex-start' }}>
            <input className="in" placeholder="Machine code..." value={machineFilter} onChange={(e) => setMachineFilter(e.target.value)} style={{ width: 180 }} />
            <select className="in" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ width: 160 }}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn btn-p" onClick={() => { setForm({}); setTab('form'); }}>+ Post Cost</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Reference</th><th>Machine</th><th>Category</th><th>Description</th><th>Date</th><th className="r">Amount</th><th>Actions</th></tr></thead>
                <tbody>
                  {rows.length === 0 ? <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">description</span> No cost transactions.</div></td></tr> : rows.map((r) => {
                    const c = CATEGORY_COLORS[r.costCategory] ?? CATEGORY_COLORS.OTHER;
                    return (
                      <tr key={r.id} style={{ background: r.reversalId ? '#f9fafb' : undefined, opacity: r.reversalId ? 0.6 : 1 }}>
                        <td><b>{r.costReference}</b>{r.immutable && <span title="Immutable" className="material-symbols-rounded" style={{ fontSize: 14, color: '#94a3b8', marginLeft: 6 }}>lock</span>}</td>
                        <td>{r.machineCode || '-'}</td>
                        <td><span style={{ background: c.bg, color: c.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{r.costCategory}</span></td>
                        <td style={{ maxWidth: 300 }}>{r.description || '-'}</td>
                        <td>{r.incurredDate ? new Date(r.incurredDate).toLocaleDateString() : '-'}</td>
                        <td className="r" style={{ fontWeight: 600 }}>{fmt(r.amount)}</td>
                        <td style={{ position: 'relative' }}>
                          <button className="ibtn" title="Actions" onClick={() => setReverseTarget(r)}><span className="material-symbols-rounded">more_vert</span></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {reverseTarget && (
        <div className="panel" style={{ margin: '16px 0' }}>
          <div className="panel-h"><h2>Reverse {reverseTarget.costReference}</h2></div>
          {reverseTarget.immutable ? (
            <p style={{ padding: '0 20px 12px', color: '#ef4444', fontWeight: 600 }}>This transaction is immutable (parent document is CLOSED). It cannot be reversed.</p>
          ) : (
            <div className="fgrid">
              <label className="fld" style={{ gridColumn: '1 / -1' }}><span>Reason</span><input className="in" value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} /></label>
            </div>
          )}
          <div className="actbar">
            <span className="lft"><button className="btn btn-sm" onClick={() => { setReverseTarget(null); setReverseReason(''); }}>Close</button></span>
            {!reverseTarget.immutable && <span className="rgt"><button className="btn btn-sm btn-p" onClick={doReverse} disabled={busy}>Reverse</button></span>}
          </div>
        </div>
      )}
    </>
  );
}
