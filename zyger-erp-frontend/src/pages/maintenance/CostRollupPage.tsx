import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../contexts/ToastContext';
import { exportSimpleCsv } from '../../utils/csvExport';

interface CostRow {
  machineCode: string;
  monthBucket: string;
  breakdownCount: number;
  breakdownCost: number;
  breakdownSpareCost: number;
  pmCost: number;
  totalCost: number;
}

interface TcoSummary {
  machineCode: string;
  totalBreakdownCost: number;
  totalPmCost: number;
  grandTotal: number;
  monthsTracked: number;
}

export default function CostRollupPage() {
  const { toast } = useToast();
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [tco, setTco] = useState<TcoSummary | null>(null);
  const [machineFilter, setMachineFilter] = useState('');
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'monthly' | 'tco'>('monthly');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (machineFilter) params.set('machineCode', machineFilter);
      params.set('months', String(months));

      const res = await axiosClient.get(`/v1/maintenance/costs/summary?${params}`);
      setCosts(res.data as CostRow[]);
    } catch {
      toast('Failed to load cost data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTco = async (code: string) => {
    if (!code) { toast('Enter a machine code', 'error'); return; }
    try {
      const res = await axiosClient.get(`/v1/maintenance/costs/tco?machineCode=${code}`);
      setTco(res.data as TcoSummary);
    } catch {
      toast('TCO lookup failed', 'error');
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="panel">
        <div className="panel-h">
          <h2><span className="material-symbols-rounded">payments</span> Machine Cost Summary</h2>
        </div>

        <div className="toolbar" style={{ gap: 8 }}>
          <input className="in" placeholder="Machine code..." value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)} style={{ width: 180 }} />
          <select className="in" value={months} onChange={(e) => setMonths(Number(e.target.value))} style={{ width: 120 }}>
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
            <option value={24}>24 Months</option>
          </select>
          <button className="btn btn-p" onClick={load} disabled={loading}>
            <span className="material-symbols-rounded">refresh</span> Refresh
          </button>
          <button className="btn" onClick={() => exportSimpleCsv(costs as unknown as Record<string, unknown>[], 'machine-costs')}>
            <span className="material-symbols-rounded">download</span> Export CSV
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`btn ${tab === 'monthly' ? 'btn-p' : ''}`} onClick={() => setTab('monthly')}>Monthly</button>
            <button className={`btn ${tab === 'tco' ? 'btn-p' : ''}`} onClick={() => setTab('tco')}>TCO</button>
          </div>
        </div>
      </div>

      {tab === 'monthly' && (
        <div className="panel">
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="num">S.No</th><th>Machine</th><th>Month</th><th>Breakdowns</th><th>Breakdown Cost</th>
                  <th>Spare Parts</th><th>PM Cost</th><th>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="empty">Loading...</td></tr>
                ) : costs.length === 0 ? (
                  <tr><td colSpan={8} className="empty">No cost data</td></tr>
                ) : costs.map((r, i) => (
                  <tr key={i}>
                    <td className="num mut">{i + 1}</td>
                    <td><b>{r.machineCode}</b></td>
                    <td>{String(r.monthBucket).substring(0, 7)}</td>
                    <td>{r.breakdownCount}</td>
                    <td>₹{Number(r.breakdownCost).toLocaleString()}</td>
                    <td>₹{Number(r.breakdownSpareCost).toLocaleString()}</td>
                    <td>₹{Number(r.pmCost).toLocaleString()}</td>
                    <td><b>₹{Number(r.totalCost).toLocaleString()}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'tco' && (
        <div className="panel">
          <div className="toolbar" style={{ gap: 8 }}>
            <input className="in" placeholder="Machine code for TCO" value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)} style={{ width: 200 }} />
            <button className="btn btn-p" onClick={() => loadTco(machineFilter)}>Calculate TCO</button>
          </div>
          {tco && (
            <div className="fgrid" style={{ marginTop: 16 }}>
              <div className="fld">
                <span>Machine</span>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{tco.machineCode}</div>
              </div>
              <div className="fld">
                <span>Months Tracked</span>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{tco.monthsTracked}</div>
              </div>
              <div className="fld">
                <span>Total Breakdown Cost</span>
                <div style={{ fontSize: 18, fontWeight: 700 }}>₹{Number(tco.totalBreakdownCost).toLocaleString()}</div>
              </div>
              <div className="fld">
                <span>Total PM Cost</span>
                <div style={{ fontSize: 18, fontWeight: 700 }}>₹{Number(tco.totalPmCost).toLocaleString()}</div>
              </div>
              <div className="fld" style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Grand Total (TCO)</span>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--blue)' }}>₹{Number(tco.grandTotal).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
