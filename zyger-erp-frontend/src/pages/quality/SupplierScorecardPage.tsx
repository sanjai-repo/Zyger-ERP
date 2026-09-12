import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../contexts/ToastContext';
import { exportSimpleCsv } from '../../utils/csvExport';

interface ScorecardRow {
  supplierCode: string;
  monthBucket: string;
  ncrCount: number;
  criticalCount: number;
  avgPpm: number;
  blendedPpm: number;
  totalRejected: number;
}

interface NcrDetail {
  ncrNumber: string;
  ncrDate: string;
  severity: string;
  ncrStatus: string;
  affectedItem: string;
  rejectedQuantity: number;
  totalQuantity: number;
  ppmRejected: number;
  rootCause: string;
}

export default function SupplierScorecardPage() {
  const { toast } = useToast();
  const [scorecard, setScorecard] = useState<ScorecardRow[]>([]);
  const [ncrDetails, setNcrDetails] = useState<NcrDetail[]>([]);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'scorecard' | 'ncr-details'>('scorecard');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (supplierFilter) params.set('supplierCode', supplierFilter);
      params.set('months', String(months));

      const [scRes, ncrRes] = await Promise.all([
        axiosClient.get(`/v1/quality/suppliers/scorecard?${params}`),
        axiosClient.get(`/v1/quality/suppliers/ncr-details?${params}`),
      ]);
      setScorecard(scRes.data as ScorecardRow[]);
      setNcrDetails(ncrRes.data as NcrDetail[]);
    } catch {
      toast('Failed to load scorecard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="panel">
        <div className="panel-h">
          <h2><span className="material-symbols-rounded">analytics</span> Supplier Quality Scorecard</h2>
        </div>

        <div className="toolbar" style={{ gap: 8 }}>
          <input className="in" placeholder="Supplier code..." value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)} style={{ width: 180 }} />
          <select className="in" value={months} onChange={(e) => setMonths(Number(e.target.value))} style={{ width: 120 }}>
            <option value={3}>3 Months</option>
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
          </select>
          <button className="btn btn-p" onClick={load} disabled={loading}>
            <span className="material-symbols-rounded">refresh</span> Refresh
          </button>
          <button className="btn" onClick={() => {
            if (tab === 'scorecard') exportSimpleCsv(scorecard as unknown as Record<string, unknown>[], 'supplier-scorecard');
            else exportSimpleCsv(ncrDetails as unknown as Record<string, unknown>[], 'supplier-ncr-details');
          }}>
            <span className="material-symbols-rounded">download</span> Export CSV
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`btn ${tab === 'scorecard' ? 'btn-p' : ''}`} onClick={() => setTab('scorecard')}>Monthly</button>
            <button className={`btn ${tab === 'ncr-details' ? 'btn-p' : ''}`} onClick={() => setTab('ncr-details')}>NCR Details</button>
          </div>
        </div>
      </div>

      {tab === 'scorecard' && (
        <div className="panel">
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Supplier</th><th>Month</th><th>NCR Count</th><th>Critical</th>
                  <th>Avg PPM</th><th>Blended PPM</th><th>Total Rejected</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="empty">Loading...</td></tr>
                ) : scorecard.length === 0 ? (
                  <tr><td colSpan={7} className="empty">No data</td></tr>
                ) : scorecard.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.supplierCode}</b></td>
                    <td>{String(r.monthBucket).substring(0, 7)}</td>
                    <td>{r.ncrCount}</td>
                    <td style={{ color: r.criticalCount > 0 ? 'var(--red)' : undefined }}>{r.criticalCount}</td>
                    <td>{Number(r.avgPpm).toFixed(1)}</td>
                    <td style={{ color: Number(r.blendedPpm) > 500 ? 'var(--red)' : undefined }}>{Number(r.blendedPpm).toFixed(1)}</td>
                    <td>{r.totalRejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'ncr-details' && (
        <div className="panel">
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>NCR No</th><th>Date</th><th>Severity</th><th>Status</th>
                  <th>Item</th><th>Rejected</th><th>Total</th><th>PPM</th><th>Root Cause</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="empty">Loading...</td></tr>
                ) : ncrDetails.length === 0 ? (
                  <tr><td colSpan={9} className="empty">No NCR details</td></tr>
                ) : ncrDetails.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.ncrNumber}</b></td>
                    <td>{String(r.ncrDate).substring(0, 10)}</td>
                    <td><span style={{ color: r.severity === 'CRITICAL' ? 'var(--red)' : r.severity === 'MAJOR' ? 'var(--yellow)' : undefined }}>{r.severity}</span></td>
                    <td>{r.ncrStatus}</td>
                    <td>{r.affectedItem}</td>
                    <td>{r.rejectedQuantity}</td>
                    <td>{r.totalQuantity}</td>
                    <td>{Number(r.ppmRejected).toFixed(1)}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.rootCause ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
