import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatNumber, formatDate } from '../../../utils/format';
import { exportSimpleCsv } from '../../../utils/csvExport';

interface RejectionItem {
  entryNumber?: string;
  workOrderNumber?: string;
  jobCardNumber?: string;
  subjobNumber?: string;
  partCode?: string;
  partDescription?: string;
  operationCode?: string;
  machineCode?: string;
  operatorCode?: string;
  productionDate?: string;
  reworkQuantity?: number;
  rejectedQuantity?: number;
  scrapQuantity?: number;
  status?: string;
}

interface ReasonRow {
  [key: string]: unknown;
}

export default function ProductionRejectionScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<RejectionItem[]>([]);
  const [reasons, setReasons] = useState<ReasonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasRejectionData, setHasRejectionData] = useState(false);
  const [reasonsLoading, setReasonsLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setReasonsLoading(true);
    try {
      const [entriesRes, reasonsRes] = await Promise.all([
        apiClient.get('/v1/production/entries'),
        apiClient.get('/v1/production/reports/rejection-summary'),
      ]);
      const entries = Array.isArray(entriesRes.data) ? entriesRes.data : (entriesRes.data?.content ?? []);
      setRows(entries);
      setHasRejectionData(entries.some((r: RejectionItem) => (r.rejectedQuantity ?? 0) > 0 || (r.scrapQuantity ?? 0) > 0));
      setReasons(Array.isArray(reasonsRes.data) ? reasonsRes.data : []);
    } catch (e) {
      setRows([]);
      setHasRejectionData(false);
      setReasons([]);
      setError(true);
      toast(getApiErrorMessage(e, 'Failed to load rejection summary.'), 'error');
    } finally {
      setLoading(false);
      setReasonsLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    if (!hasRejectionData) return false;
    const q = search.toLowerCase();
    if (q) {
      const haystack = [r.entryNumber, r.workOrderNumber, r.jobCardNumber, r.partCode, r.operationCode, r.machineCode, r.operatorCode]
        .map((v) => (v ?? '').toLowerCase())
        .join(' ');
      if (!haystack.includes(q)) return false;
    }
    const d = r.productionDate ? r.productionDate.slice(0, 10) : '';
    if (startDate && d && d < startDate) return false;
    if (endDate && d && d > endDate) return false;
    return true;
  });

  const totals = filtered.reduce(
    (acc, r) => {
      acc.rejected += r.rejectedQuantity ?? 0;
      acc.scrap += r.scrapQuantity ?? 0;
      acc.rework += r.reworkQuantity ?? 0;
      return acc;
    },
    { rejected: 0, scrap: 0, rework: 0 },
  );

  return (
    <>
      <div className="pg-head">
        <h1>Production Rejection / Scrap Summary</h1>
        <p>Read-only summary of rejection and scrap from production entries</p>
      </div>

      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="fgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '16px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{formatNumber(totals.rejected)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Rejected Qty</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#991b1b' }}>{formatNumber(totals.scrap)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Scrap Qty</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{formatNumber(totals.rework)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Rework Qty</div>
          </div>
        </div>
      </div>

      {reasonsLoading ? (
        <div className="panel"><div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading reason summary...</div></div>
      ) : reasons.length > 0 ? (
        <div className="panel" style={{ marginBottom: 12 }}>
          <div className="panel-h">
            <h2><span className="material-symbols-rounded">block</span> Rejection Reason-wise Summary</h2>
            <button className="ibtn" title="Export CSV" onClick={() => exportSimpleCsv(reasons, 'production-rejection-reasons')}><span className="material-symbols-rounded">download</span></button>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>{Object.keys(reasons[0]).map((k) => <th key={k}>{k.replace(/([A-Z])/g, ' $1')}</th>)}</tr>
              </thead>
              <tbody>
                {reasons.map((row, i) => (
                  <tr key={i}>
                    {Object.keys(reasons[0]).map((k) => {
                      const val = row[k];
                      return <td key={k} className="num">{typeof val === 'number' ? formatNumber(val) : String(val ?? '-')}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="panel">
        <div className="toolbar" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <input className="in" placeholder="Search entry / order / job card / item..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <input className="in" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} title="From date" />
          <input className="in" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} title="To date" />
          <button className="btn" onClick={load}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>refresh</span> Refresh</button>
        </div>

        <div className="twrap">
          {loading ? (
            <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading rejection summary...</div>
          ) : error ? (
            <div className="empty"><span className="material-symbols-rounded">error_outline</span> Rejection / scrap summary is currently unavailable.</div>
          ) : filtered.length === 0 ? (
            <div className="empty"><span className="material-symbols-rounded">check_circle</span> No rejection or scrap records found.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Entry No</th>
                  <th>Order</th>
                  <th>Job Card</th>
                  <th>Item</th>
                  <th>Operation</th>
                  <th>Machine</th>
                  <th>Operator</th>
                  <th>Date</th>
                  <th>Rejected</th>
                  <th>Scrap</th>
                  <th>Rework</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.entryNumber ?? `${r.jobCardNumber}-${r.operationCode}`}>
                    <td style={{ fontWeight: 600 }}>{r.entryNumber ?? '-'}</td>
                    <td>{r.workOrderNumber ?? '-'}</td>
                    <td>{r.jobCardNumber ?? '-'}</td>
                    <td>{r.partCode ?? '-'}{r.partDescription ? ` · ${r.partDescription}` : ''}</td>
                    <td>{r.operationCode ?? '-'}</td>
                    <td>{r.machineCode ?? '-'}</td>
                    <td>{r.operatorCode ?? '-'}</td>
                    <td>{formatDate(r.productionDate ?? '')}</td>
                    <td className="num" style={{ color: '#ef4444' }}>{formatNumber(r.rejectedQuantity ?? 0)}</td>
                    <td className="num" style={{ color: '#991b1b' }}>{formatNumber(r.scrapQuantity ?? 0)}</td>
                    <td className="num" style={{ color: '#f59e0b' }}>{formatNumber(r.reworkQuantity ?? 0)}</td>
                    <td>{r.status ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
