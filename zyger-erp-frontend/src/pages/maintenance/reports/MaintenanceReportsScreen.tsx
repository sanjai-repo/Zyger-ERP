import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

export default function MaintenanceReportsScreen() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'breakdown' | 'pm' | 'machine' | 'spare' | 'cost'>('breakdown');
  const [bdData, setBdData] = useState<Record<string, unknown>>({});
  const [pmData, setPmData] = useState<Record<string, unknown>>({});
  const [machineHistory, setMachineHistory] = useState<Record<string, unknown>>({});
  const [spareData, setSpareData] = useState<Record<string, unknown>>({});
  const [costData, setCostData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [machineCode, setMachineCode] = useState('');

  const loadBreakdown = async () => {
    setLoading(true);
    try { const { data } = await apiClient.get('/v1/maintenance/reports/breakdown'); setBdData(data); }
    catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  const loadPM = async () => {
    setLoading(true);
    try { const { data } = await apiClient.get('/v1/maintenance/reports/pm'); setPmData(data); }
    catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  const loadMachine = async () => {
    if (!machineCode.trim()) { toast('Enter a machine code.', 'error'); return; }
    setLoading(true);
    try { const { data } = await apiClient.get(`/v1/maintenance/reports/machine-history/${machineCode}`); setMachineHistory(data); }
    catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  const loadSpare = async () => {
    setLoading(true);
    try { const { data } = await apiClient.get('/v1/maintenance/reports/spare-parts'); setSpareData(data); }
    catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  const loadCost = async () => {
    setLoading(true);
    try { const { data } = await apiClient.get('/v1/maintenance/reports/cost'); setCostData(data); }
    catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'breakdown') loadBreakdown();
    else if (tab === 'pm') loadPM();
    else if (tab === 'spare') loadSpare();
    else if (tab === 'cost') loadCost();
  }, [tab]);

  const renderMap = (obj: Record<string, number>, label: string) => (
    Object.keys(obj).length > 0 ? (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {Object.entries(obj).map(([k, v]) => (
          <span key={k} style={{ padding: '4px 12px', borderRadius: 16, fontSize: 12, background: 'var(--blue-bg, #dbeafe)', color: 'var(--blue-fg, #2563eb)', fontWeight: 500 }}>{k.replace(/_/g, ' ')}: <b>{String(v)}</b></span>
        ))}
      </div>
    ) : <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 12px' }}>No {label} data</p>
  );

  return (
    <>
      <div className="pg-head"><h1>Maintenance Reports</h1><p>Breakdown, PM, machine history, spare parts, and cost reports</p></div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['breakdown', 'pm', 'machine', 'spare', 'cost'] as const).map((t) => (
          <button key={t} className={`btn ${tab === t ? 'btn-p' : ''}`} onClick={() => setTab(t)}>
            {t === 'breakdown' ? 'Breakdown Reports' : t === 'pm' ? 'PM Reports' : t === 'machine' ? 'Machine History' : t === 'spare' ? 'Spare Parts' : 'Cost Reports'}
          </button>
        ))}
      </div>

      {tab === 'breakdown' && (
        <div className="panel">
          <div className="panel-h"><h2>Breakdown Report</h2></div>
          {loading ? <div className="empty">Loading...</div> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Breakdowns</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{String(bdData.totalBreakdowns ?? 0)}</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>By Category</h4>
              {renderMap((bdData.byCategory ?? {}) as Record<string, number>, 'category')}
              <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>By Status</h4>
              {renderMap((bdData.byStatus ?? {}) as Record<string, number>, 'status')}
              <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>By Priority</h4>
              {renderMap((bdData.byPriority ?? {}) as Record<string, number>, 'priority')}
              <h4 style={{ margin: '12px 0 8px', fontSize: 13 }}>By Machine</h4>
              {renderMap((bdData.byMachine ?? {}) as Record<string, number>, 'machine')}
            </>
          )}
        </div>
      )}

      {tab === 'pm' && (
        <div className="panel">
          <div className="panel-h"><h2>PM Report</h2></div>
          {loading ? <div className="empty">Loading...</div> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Schedules</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{String(pmData.totalSchedules ?? 0)}</div>
                </div>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Overdue</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>{String(pmData.overdue ?? 0)}</div>
                </div>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Compliance %</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e', marginTop: 4 }}>{String(pmData.compliance ?? 100)}%</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>By Status</h4>
              {renderMap((pmData.byStatus ?? {}) as Record<string, number>, 'status')}
              <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>By Machine</h4>
              {renderMap((pmData.byMachine ?? {}) as Record<string, number>, 'machine')}
            </>
          )}
        </div>
      )}

      {tab === 'machine' && (
        <div className="panel">
          <div className="panel-h"><h2>Machine History</h2></div>
          <div className="fgrid" style={{ gridTemplateColumns: '1fr auto', marginBottom: 16 }}>
            <label className="fld"><span>Machine Code</span>
              <input className="in" value={machineCode} onChange={(e) => setMachineCode(e.target.value)} placeholder="e.g. CNC-LATHE-01"
                onKeyDown={(e) => { if (e.key === 'Enter') loadMachine(); }} />
            </label>
            <button className="btn btn-p" style={{ alignSelf: 'flex-end' }} onClick={loadMachine} disabled={loading || !machineCode.trim()}>
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>search</span> Load History
            </button>
          </div>
          {Object.keys(machineHistory).length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Breakdowns</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{String(machineHistory.totalBreakdowns ?? 0)}</div>
                </div>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Open Breakdowns</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>{String(machineHistory.openBreakdowns ?? 0)}</div>
                </div>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Downtime</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>{String(machineHistory.totalDowntimeHours ?? 0)}h</div>
                </div>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>MTTR</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>{String(machineHistory.mttrMinutes ?? 0)} min</div>
                </div>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Maint. Cost</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6', marginTop: 4 }}>₹{Number(machineHistory.maintenanceCost ?? 0).toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>PM Completions</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e', marginTop: 4 }}>{String(machineHistory.totalPmCompletions ?? 0)}</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Breakdown History</h4>
              <div className="twrap">
                <table className="tbl">
                  <thead><tr><th className="num">S.No</th><th>Number</th><th>Date</th><th>Category</th><th>Priority</th><th>Status</th><th>Problem</th></tr></thead>
                  <tbody>
                    {((machineHistory.breakdownHistory ?? []) as Array<Record<string, unknown>>).map((r, i) => (
                      <tr key={i}><td className="num mut">{i + 1}</td><td><b>{String(r.number ?? '')}</b></td><td>{String(r.date ?? '')}</td><td>{String(r.category ?? '').replace(/_/g, ' ')}</td><td>{String(r.priority ?? '')}</td><td>{String(r.status ?? '')}</td><td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(r.problem ?? '')}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h4 style={{ margin: '12px 0 8px', fontSize: 13 }}>PM History</h4>
              <div className="twrap">
                <table className="tbl">
                  <thead><tr><th className="num">S.No</th><th>Number</th><th>Result</th><th>Status</th><th>Technician</th></tr></thead>
                  <tbody>
                    {((machineHistory.pmHistory ?? []) as Array<Record<string, unknown>>).map((r, i) => (
                      <tr key={i}><td className="num mut">{i + 1}</td><td><b>{String(r.number ?? '')}</b></td><td>{String(r.result ?? '')}</td><td>{String(r.status ?? '')}</td><td>{String(r.technician ?? '')}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {Object.keys(machineHistory).length === 0 && !loading && (
            <div className="empty"><span className="material-symbols-rounded">engineering</span> Enter a machine code and click Load History.</div>
          )}
        </div>
      )}

      {tab === 'spare' && (
        <div className="panel">
          <div className="panel-h"><h2>Spare Parts Consumption Report</h2></div>
          {loading ? <div className="empty">Loading...</div> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Transactions</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{String(spareData.totalTransactions ?? 0)}</div>
                </div>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Unique Parts Used</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>{String(spareData.uniqueParts ?? 0)}</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Parts Usage</h4>
              <div className="twrap">
                <table className="tbl">
                  <thead><tr><th className="num">S.No</th><th>Spare Part</th><th>Times Used</th></tr></thead>
                  <tbody>
                    {Object.entries((spareData.partsUsage ?? {}) as Record<string, number>).map(([k, v], i) => (
                      <tr key={k}><td className="num mut">{i + 1}</td><td>{k}</td><td><b>{v}</b></td></tr>
                    ))}
                    {Object.keys((spareData.partsUsage ?? {})).length === 0 && <tr><td colSpan={3}><div className="empty">No spare parts data yet.</div></td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'cost' && (
        <div className="panel">
          <div className="panel-h"><h2>Maintenance Cost Report</h2></div>
          {loading ? <div className="empty">Loading...</div> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Breakdown Cost</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>₹{Number(costData.totalBreakdownCost ?? 0).toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Tool Service Cost</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>₹{Number(costData.totalToolServiceCost ?? 0).toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Grand Total</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6', marginTop: 4 }}>₹{Number(costData.grandTotal ?? 0).toLocaleString()}</div>
                </div>
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Cost by Machine</h4>
              <div className="twrap">
                <table className="tbl">
                  <thead><tr><th className="num">S.No</th><th>Machine</th><th>Cost (₹)</th></tr></thead>
                  <tbody>
                    {Object.entries((costData.costByMachine ?? {}) as Record<string, number>).map(([k, v], i) => (
                      <tr key={k}><td className="num mut">{i + 1}</td><td><b>{k}</b></td><td>₹{Number(v).toLocaleString()}</td></tr>
                    ))}
                    {Object.keys((costData.costByMachine ?? {})).length === 0 && <tr><td colSpan={3}><div className="empty">No cost data yet.</div></td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
