import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface DowntimeRow { machineCode: string; totalDowntimeMinutes: number; totalDowntimeHours: number; breakdownCount: number; avgDowntimePerBreakdown: number; }
interface MtbfRow { machineCode: string; totalFailures: number; totalDowntimeMinutes: number; mttrMinutes: number; mtbfMinutes: number; mtbfHours: number; }
interface CostRow { machineCode: string; breakdownCost: number; toolServiceCost: number; totalCost: number; }

const COLORS = ['#2563eb', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export default function MaintenanceAnalysisScreen() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'downtime' | 'mtbf' | 'cost'>('downtime');
  const [downtime, setDowntime] = useState<DowntimeRow[]>([]);
  const [mtbf, setMtbf] = useState<MtbfRow[]>([]);
  const [cost, setCost] = useState<CostRow[]>([]);
  const [catBreakdown, setCatBreakdown] = useState<Record<string, number>>({});
  const [priorityBreakdown, setPriorityBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [dtRes, mtbfRes, costRes, catRes, priRes] = await Promise.all([
        apiClient.get('/v1/maintenance/analysis/downtime'),
        apiClient.get('/v1/maintenance/analysis/mtbf'),
        apiClient.get('/v1/maintenance/analysis/cost'),
        apiClient.get('/v1/maintenance/analysis/downtime/categories'),
        apiClient.get('/v1/maintenance/analysis/downtime/priority'),
      ]);
      setDowntime(Array.isArray(dtRes.data) ? dtRes.data : []);
      setMtbf(Array.isArray(mtbfRes.data) ? mtbfRes.data : []);
      setCost(Array.isArray(costRes.data) ? costRes.data : []);
      setCatBreakdown(catRes.data ?? {});
      setPriorityBreakdown(priRes.data ?? {});
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const totalDowntime = downtime.reduce((s, r) => s + (r.totalDowntimeMinutes ?? 0), 0);
  const totalBreakdowns = downtime.reduce((s, r) => s + (r.breakdownCount ?? 0), 0);
  const totalCost = cost.reduce((s, r) => s + (r.totalCost ?? 0), 0);
  const avgMttr = mtbf.length > 0 ? mtbf.reduce((s, r) => s + r.mttrMinutes, 0) / mtbf.length : 0;
  const avgMtbf = mtbf.length > 0 ? mtbf.reduce((s, r) => s + r.mtbfMinutes, 0) / mtbf.length : 0;

  return (
    <>
      <div className="pg-head"><h1>Maintenance Analysis</h1><p>Downtime analysis, MTBF/MTTR, failure categories, and maintenance costs</p></div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['downtime', 'mtbf', 'cost'] as const).map((t) => (
          <button key={t} className={`btn ${tab === t ? 'btn-p' : ''}`} onClick={() => setTab(t)}>
            {t === 'downtime' ? 'Downtime Analysis' : t === 'mtbf' ? 'MTBF / MTTR' : 'Maintenance Cost'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Downtime', value: `${Math.round(totalDowntime / 60 * 10) / 10}h`, color: '#ef4444' },
          { label: 'Total Breakdowns', value: String(totalBreakdowns), color: '#f59e0b' },
          { label: 'Avg MTTR', value: `${Math.round(avgMttr)} min`, color: '#2563eb' },
          { label: 'Avg MTBF', value: `${Math.round(avgMtbf / 60 * 10) / 10}h`, color: '#22c55e' },
          { label: 'Total Cost', value: `₹${totalCost.toLocaleString()}`, color: '#8b5cf6' },
        ].map((kpi) => (
          <div key={kpi.label} className="panel" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{kpi.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color, marginTop: 4 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {tab === 'downtime' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="panel">
            <div className="panel-h"><h2>Downtime by Machine</h2></div>
            <div style={{ padding: '12px 16px' }}>
              {downtime.length === 0 ? <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>No data</div> : (
                <svg width="100%" height={downtime.length * 36 + 20} viewBox={`0 0 400 ${downtime.length * 36 + 20}`}>
                  {downtime.map((r, i) => {
                    const maxMin = Math.max(...downtime.map((d) => d.totalDowntimeMinutes), 1);
                    const barW = (r.totalDowntimeMinutes / maxMin) * 280;
                    return (
                      <g key={r.machineCode} transform={`translate(0, ${i * 36 + 10})`}>
                        <text x={0} y={14} fontSize={11} fill="#374151" fontWeight={600}>{r.machineCode}</text>
                        <rect x={100} y={2} width={barW} height={20} rx={4} fill={COLORS[i % COLORS.length]} opacity={0.85} />
                        <text x={100 + barW + 6} y={17} fontSize={10} fill="#6b7280">{r.totalDowntimeHours}h</text>
                        <text x={100 + barW + 50} y={17} fontSize={10} fill="#999">({r.breakdownCount})</text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-h"><h2>Breakdown by Category</h2></div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {Object.keys(catBreakdown).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>No data</div>
              ) : (() => {
                const entries = Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]);
                const total = entries.reduce((s, [, v]) => s + Number(v), 0);
                let cumPct = 0;
                return (
                  <>
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      {entries.map(([key, val], i) => {
                        const pct = Number(val) / total;
                        const dashLen = pct * 377;
                        const offset = 94.25 - cumPct * 377;
                        cumPct += pct;
                        return (
                          <circle key={key} cx="80" cy="80" r="60" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="22"
                            strokeDasharray={`${dashLen} ${377 - dashLen}`} strokeDashoffset={offset} strokeLinecap="round" />
                        );
                      })}
                      <text x="80" y="76" textAnchor="middle" fontSize="20" fontWeight="700" fill="#374151">{total}</text>
                      <text x="80" y="92" textAnchor="middle" fontSize="10" fill="#888">Total</text>
                    </svg>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 11, justifyContent: 'center' }}>
                      {entries.map(([key, val], i) => (
                        <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                          {key.replace(/_/g, ' ')} ({val})
                        </span>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="panel" style={{ gridColumn: '1 / -1' }}>
            <div className="panel-h"><h2>Downtime by Priority</h2></div>
            <div style={{ padding: '12px 16px' }}>
              {Object.keys(priorityBreakdown).length === 0 ? <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>No data</div> : (
                <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
                  {Object.entries(priorityBreakdown).map(([key, val], i) => {
                    const total = Object.values(priorityBreakdown).reduce((s, v) => s + Number(v), 0);
                    const pct = Math.round((Number(val) / total) * 100);
                    return (
                      <div key={key} style={{ textAlign: 'center', flex: 1, maxWidth: 140 }}>
                        <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 8px' }}>
                          <svg width="80" height="80" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="32" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                            <circle cx="40" cy="40" r="32" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="8"
                              strokeDasharray={`${pct * 2.01} ${(100 - pct) * 2.01}`} strokeDashoffset="50.26" strokeLinecap="round" />
                          </svg>
                          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#374151' }}>{pct}%</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{key}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{val} incidents</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'mtbf' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="panel">
            <div className="panel-h"><h2>MTBF by Machine</h2></div>
            <div style={{ padding: '12px 16px' }}>
              {mtbf.length === 0 ? <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>No MTBF data</div> : (
                <svg width="100%" height={mtbf.length * 36 + 20} viewBox={`0 0 400 ${mtbf.length * 36 + 20}`}>
                  {mtbf.map((r, i) => {
                    const maxMtbf = Math.max(...mtbf.map((m) => m.mtbfMinutes), 1);
                    const barW = (r.mtbfMinutes / maxMtbf) * 260;
                    const barColor = r.mtbfMinutes < 100 ? '#ef4444' : r.mtbfMinutes < 300 ? '#f59e0b' : '#22c55e';
                    return (
                      <g key={r.machineCode} transform={`translate(0, ${i * 36 + 10})`}>
                        <text x={0} y={14} fontSize={11} fill="#374151" fontWeight={600}>{r.machineCode}</text>
                        <rect x={100} y={2} width={barW} height={20} rx={4} fill={barColor} opacity={0.85} />
                        <text x={100 + barW + 6} y={17} fontSize={10} fill="#6b7280">{r.mtbfHours}h</text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-h"><h2>MTTR by Machine</h2></div>
            <div style={{ padding: '12px 16px' }}>
              {mtbf.length === 0 ? <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>No MTTR data</div> : (
                <svg width="100%" height={mtbf.length * 36 + 20} viewBox={`0 0 400 ${mtbf.length * 36 + 20}`}>
                  {mtbf.map((r, i) => {
                    const maxMttr = Math.max(...mtbf.map((m) => m.mttrMinutes), 1);
                    const barW = (r.mttrMinutes / maxMttr) * 260;
                    const barColor = r.mttrMinutes > 60 ? '#ef4444' : r.mttrMinutes > 30 ? '#f59e0b' : '#22c55e';
                    return (
                      <g key={r.machineCode} transform={`translate(0, ${i * 36 + 10})`}>
                        <text x={0} y={14} fontSize={11} fill="#374151" fontWeight={600}>{r.machineCode}</text>
                        <rect x={100} y={2} width={barW} height={20} rx={4} fill={barColor} opacity={0.85} />
                        <text x={100 + barW + 6} y={17} fontSize={10} fill="#6b7280">{r.mttrMinutes} min</text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          <div className="panel" style={{ gridColumn: '1 / -1' }}>
            <div className="panel-h"><h2>MTBF / MTTR Table</h2></div>
            <div className="twrap">
              {loading ? <div className="empty">Loading...</div> : (
                <table className="tbl">
                  <thead><tr><th>Machine</th><th>Failures</th><th>Downtime (min)</th><th>MTTR (min)</th><th>MTBF (min)</th><th>MTBF (hrs)</th></tr></thead>
                  <tbody>
                    {mtbf.length === 0 ? <tr><td colSpan={6}><div className="empty"><span className="material-symbols-rounded">timer</span> No MTBF data yet.</div></td></tr> :
                      mtbf.map((r) => <tr key={r.machineCode}><td><b>{r.machineCode}</b></td><td>{r.totalFailures}</td><td>{r.totalDowntimeMinutes}</td><td style={{ color: r.mttrMinutes > 60 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{r.mttrMinutes}</td><td style={{ color: r.mtbfMinutes < 100 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{r.mtbfMinutes}</td><td>{r.mtbfHours}</td></tr>)}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'cost' && (
        <div className="panel">
          <div className="panel-h"><h2>Maintenance Cost by Machine</h2></div>
          <div style={{ padding: '12px 16px' }}>
            {cost.length === 0 ? <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>No cost data</div> : (
              <svg width="100%" height={cost.length * 40 + 20} viewBox={`0 0 500 ${cost.length * 40 + 20}`}>
                {cost.map((r, i) => {
                  const maxCost = Math.max(...cost.map((c) => c.totalCost), 1);
                  const bdW = (r.breakdownCost / maxCost) * 300;
                  const tsW = (r.toolServiceCost / maxCost) * 300;
                  return (
                    <g key={r.machineCode} transform={`translate(0, ${i * 40 + 10})`}>
                      <text x={0} y={14} fontSize={11} fill="#374151" fontWeight={600}>{r.machineCode}</text>
                      <rect x={100} y={2} width={bdW} height={9} rx={2} fill="#ef4444" opacity={0.8} />
                      <rect x={100 + bdW + 2} y={2} width={tsW} height={9} rx={2} fill="#8b5cf6" opacity={0.8} />
                      <text x={100 + bdW + tsW + 8} y={12} fontSize={10} fill="#6b7280">₹{r.totalCost.toLocaleString()}</text>
                    </g>
                  );
                })}
                <g transform={`translate(0, ${cost.length * 40 + 14})`}>
                  <rect x={100} y={0} width={10} height={10} rx={2} fill="#ef4444" /><text x={114} y={9} fontSize={10} fill="#6b7280">Breakdown</text>
                  <rect x={180} y={0} width={10} height={10} rx={2} fill="#8b5cf6" /><text x={194} y={9} fontSize={10} fill="#6b7280">Tool Service</text>
                </g>
              </svg>
            )}
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead><tr><th>Machine</th><th>Breakdown Cost</th><th>Tool Service Cost</th><th>Total Cost</th></tr></thead>
              <tbody>
                {cost.map((r) => <tr key={r.machineCode}><td><b>{r.machineCode}</b></td><td>₹{r.breakdownCost.toLocaleString()}</td><td>₹{r.toolServiceCost.toLocaleString()}</td><td style={{ fontWeight: 700, color: '#8b5cf6' }}>₹{r.totalCost.toLocaleString()}</td></tr>)}
                {cost.length === 0 && <tr><td colSpan={4}><div className="empty"><span className="material-symbols-rounded">payments</span> No cost data yet.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
