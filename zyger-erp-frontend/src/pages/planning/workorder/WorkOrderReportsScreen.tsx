import { useState, useEffect } from 'react';
import { useToast } from '../../../contexts/ToastContext';
import { formatNumber, formatDate } from '../../../utils/format';
import { getApiErrorMessage } from '../../../utils/apiError';
import apiClient from '../../../api/axiosClient';

type ReportType = 'status-summary' | 'overdue' | 'open' | 'shortage' | 'completion' | 'so-pending';

const REPORTS: { key: ReportType; label: string; icon: string; desc: string }[] = [
  { key: 'status-summary', label: 'Status Summary', icon: 'donut_large', desc: 'Count of work orders by status' },
  { key: 'open', label: 'Open Work Orders', icon: 'pending', desc: 'Draft, Released, In Progress orders' },
  { key: 'overdue', label: 'Overdue Work Orders', icon: 'warning', desc: 'Orders past planned end date' },
  { key: 'shortage', label: 'Material Shortage', icon: 'inventory_2', desc: 'Orders with material shortages' },
  { key: 'completion', label: 'Completion Report', icon: 'check_circle', desc: 'Completed and closed orders' },
  { key: 'so-pending', label: 'SO Pending', icon: 'receipt_long', desc: 'Work orders linked to sales orders' },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280', SUBMITTED: '#3b82f6', APPROVED: '#0ea5e9', RELEASED: '#2563eb',
  IN_PROCESS: '#f59e0b', COMPLETED: '#10b981', CLOSED: '#059669',
  CANCELLED: '#ef4444', ON_HOLD: '#eab308', REJECTED: '#dc2626',
};

export default function WorkOrderReportsScreen() {
  const { toast } = useToast();
  const [activeReport, setActiveReport] = useState<ReportType>('status-summary');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  const loadReport = async (reportType: ReportType) => {
    setLoading(true);
    setData(null);
    try {
      const res = await apiClient.get(`/v1/planning/work-order/reports/${reportType}`);
      setData(res.data);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load report.'), 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReport(activeReport);
  }, [activeReport]);

  const rows: Array<Record<string, unknown>> = data?.content ? (data.content as Array<Record<string, unknown>>) : [];
  const summary: Record<string, unknown> = data && !data.content ? data : {};

  return (
    <>
      <div className="pg-head"><h1>Work Order Reports</h1><p>Operational and management reports for work orders</p></div>

      <div className="panel">
        <div className="toolbar" style={{ flexWrap: 'wrap', gap: '6px' }}>
          {REPORTS.map((r) => (
            <button key={r.key} className={`btn btn-sm ${activeReport === r.key ? 'btn-p' : ''}`} onClick={() => setActiveReport(r.key)}>
              <span className="material-symbols-rounded">{r.icon}</span> {r.label}
            </button>
          ))}
          <div className="sp" />
          <button className="btn btn-sm" onClick={() => loadReport(activeReport)} disabled={loading}>
            <span className="material-symbols-rounded">refresh</span>
          </button>
        </div>
      </div>

      {loading && <div className="panel"><div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading report...</div></div>}

      {!loading && activeReport === 'status-summary' && Object.keys(summary).length > 0 && (
        <div className="panel">
          <div className="panel-h"><h2><span className="material-symbols-rounded">donut_large</span> Status Summary</h2></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', padding: '16px' }}>
            {Object.entries(summary).filter(([k]) => k !== 'TOTAL').map(([status, count]) => (
              <div key={status} style={{ padding: '14px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: STATUS_COLORS[status] ?? '#374151' }}>{formatNumber(Number(count))}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginTop: '4px' }}>{String(status).replace('_', ' ')}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', fontWeight: 600, color: '#374151' }}>
            Total: {formatNumber(Number(summary.TOTAL ?? 0))} Work Orders
          </div>
        </div>
      )}

      {!loading && activeReport !== 'status-summary' && (
        <div className="panel">
          <div className="panel-h">
            <h2><span className="material-symbols-rounded">{REPORTS.find((r) => r.key === activeReport)?.icon}</span> {REPORTS.find((r) => r.key === activeReport)?.label}</h2>
            <span className="count">{formatNumber(rows.length)} record{rows.length === 1 ? '' : 's'}</span>
          </div>
          {rows.length > 0 ? (
            <div className="twrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="num">S.No</th>
                    <th>WO No</th>
                    <th>Item</th>
                    <th>SO No</th>
                    <th>Production Qty</th>
                    <th>Completed Qty</th>
                    <th>Planned End</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: Record<string, unknown>, idx: number) => (
                    <tr key={String(row.id)} style={activeReport === 'overdue' ? { background: '#fef2f2' } : {}}>
                      <td className="num mut">{idx + 1}</td>
                      <td>{String(row.woNumber ?? row.docNo ?? '')}</td>
                      <td>{String(row.itemCode ?? '')}</td>
                      <td>{String(row.salesOrderNo ?? '')}</td>
                      <td className="num">{formatNumber(Number(row.productionQty ?? row.orderQuantity ?? 0))}</td>
                      <td className="num">{formatNumber(Number(row.completedQty ?? 0))}</td>
                      <td>{formatDate(String(row.plannedEndDate ?? ''))}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: '#fff', background: STATUS_COLORS[String(row.status ?? '')] ?? '#6b7280' }}>
                          {String(row.status ?? '').replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty"><span className="material-symbols-rounded">check_circle</span> No records found.</div>
          )}
        </div>
      )}
    </>
  );
}
