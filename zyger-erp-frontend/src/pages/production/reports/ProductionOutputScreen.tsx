import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatNumber, formatDate } from '../../../utils/format';

interface OutputItem {
  entryNumber?: string;
  workOrderNumber?: string;
  jobCardNumber?: string;
  subjobNumber?: string;
  partCode?: string;
  partDescription?: string;
  operationCode?: string;
  operationDescription?: string;
  machineCode?: string;
  operatorCode?: string;
  productionDate?: string;
  processQty?: number;
  producedQuantity?: number;
  goodQuantity?: number;
  reworkQuantity?: number;
  rejectedQuantity?: number;
  scrapQuantity?: number;
  status?: string;
}

const STATUS_VARIANT: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#6b7280', bg: '#e5e7eb' },
  SUBMITTED: { color: '#3b82f6', bg: '#dbeafe' },
  APPROVED: { color: '#0ea5e9', bg: '#e0f2fe' },
  RELEASED: { color: '#2563eb', bg: '#dbeafe' },
  IN_PROGRESS: { color: '#f59e0b', bg: '#fef3c7' },
  COMPLETED: { color: '#10b981', bg: '#d1fae5' },
  CLOSED: { color: '#059669', bg: '#d1fae5' },
  CANCELLED: { color: '#ef4444', bg: '#fee2e2' },
  ON_HOLD: { color: '#eab308', bg: '#fef9c3' },
};

function StatusPill({ status }: { status?: string }) {
  const s = status ?? '';
  const v = STATUS_VARIANT[s];
  return v ? (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: v.color, background: v.bg }}>{s.replace('_', ' ')}</span>
  ) : (
    <span className={`bdg bdg-${s}`}>{s}</span>
  );
}

export default function ProductionOutputScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await apiClient.get('/v1/production/entries');
      setRows(Array.isArray(data) ? data : (data?.content ?? []));
    } catch (e) {
      setRows([]);
      setError(true);
      toast(getApiErrorMessage(e, 'Failed to load production output.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    if (q) {
      const haystack = [r.entryNumber, r.workOrderNumber, r.jobCardNumber, r.subjobNumber, r.partCode, r.partDescription, r.operationCode]
        .map((v) => (v ?? '').toLowerCase())
        .join(' ');
      if (!haystack.includes(q)) return false;
    }
    if (status && (r.status ?? '') !== status) return false;
    const d = r.productionDate ? r.productionDate.slice(0, 10) : '';
    if (startDate && d && d < startDate) return false;
    if (endDate && d && d > endDate) return false;
    return true;
  });

  const totals = filtered.reduce(
    (acc, r) => {
      acc.produced += r.producedQuantity ?? 0;
      acc.good += r.goodQuantity ?? 0;
      acc.rework += r.reworkQuantity ?? 0;
      acc.rejected += r.rejectedQuantity ?? 0;
      acc.scrap += r.scrapQuantity ?? 0;
      return acc;
    },
    { produced: 0, good: 0, rework: 0, rejected: 0, scrap: 0 },
  );

  return (
    <>
      <div className="pg-head">
        <h1>Production Output / WIP</h1>
        <p>Read-only projection of production entry quantities</p>
      </div>

      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="fgrid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, padding: '16px 0' }}>
          {[
            { label: 'Produced Qty', value: totals.produced, color: '#2563eb' },
            { label: 'Accepted (Good)', value: totals.good, color: '#22c55e' },
            { label: 'Rework Qty', value: totals.rework, color: '#f59e0b' },
            { label: 'Rejected Qty', value: totals.rejected, color: '#ef4444' },
            { label: 'Scrap Qty', value: totals.scrap, color: '#991b1b' },
          ].map((c) => (
            <div key={c.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{formatNumber(c.value)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <input className="in" placeholder="Search entry / order / job card / item..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="in" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {Object.keys(STATUS_VARIANT).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <input className="in" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} title="From date" />
          <input className="in" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} title="To date" />
          <button className="btn" onClick={load}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>refresh</span> Refresh</button>
        </div>

        <div style={{ margin: '8px 0', padding: '8px 12px', borderRadius: 6, background: '#f1f5f9', color: '#64748b', fontSize: 12 }}>
          Planned and derived pending/WIP quantities are not shown: no authoritative quantity reconciliation formula is defined (see CLAR-PROD-002). Only existing entry quantities are projected.
        </div>

        <div className="twrap">
          {loading ? (
            <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading production output...</div>
          ) : error ? (
            <div className="empty"><span className="material-symbols-rounded">error_outline</span> Production output is currently unavailable.</div>
          ) : filtered.length === 0 ? (
            <div className="empty"><span className="material-symbols-rounded">check_circle</span> No production entries found.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Entry No</th>
                  <th>Order</th>
                  <th>Job Card</th>
                  <th>Sub Job</th>
                  <th>Item</th>
                  <th>Operation</th>
                  <th>Machine</th>
                  <th>Operator</th>
                  <th>Date</th>
                  <th>Produced</th>
                  <th>Accepted</th>
                  <th>Rework</th>
                  <th>Rejected</th>
                  <th>Scrap</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.entryNumber ?? `${r.jobCardNumber}-${r.operationCode}`}>
                    <td style={{ fontWeight: 600 }}>{r.entryNumber ?? '-'}</td>
                    <td>{r.workOrderNumber ?? '-'}</td>
                    <td>{r.jobCardNumber ?? '-'}</td>
                    <td>{r.subjobNumber ?? '-'}</td>
                    <td>{r.partCode ?? '-'}{r.partDescription ? ` · ${r.partDescription}` : ''}</td>
                    <td>{r.operationCode ?? '-'}</td>
                    <td>{r.machineCode ?? '-'}</td>
                    <td>{r.operatorCode ?? '-'}</td>
                    <td>{formatDate(r.productionDate ?? '')}</td>
                    <td className="num">{formatNumber(r.producedQuantity ?? r.processQty ?? 0)}</td>
                    <td className="num" style={{ color: '#22c55e' }}>{formatNumber(r.goodQuantity ?? 0)}</td>
                    <td className="num" style={{ color: '#f59e0b' }}>{formatNumber(r.reworkQuantity ?? 0)}</td>
                    <td className="num" style={{ color: '#ef4444' }}>{formatNumber(r.rejectedQuantity ?? 0)}</td>
                    <td className="num">{formatNumber(r.scrapQuantity ?? 0)}</td>
                    <td><StatusPill status={r.status} /></td>
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
