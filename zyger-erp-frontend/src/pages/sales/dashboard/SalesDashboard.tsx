import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface SalesDashboardData {
  newSalesOrders: number;
  pendingApproval: number;
  approvedOrders: number;
  partiallyDispatched: number;
  overdueOrders: number;
  pendingPi: number;
  pendingDispatch: number;
  dispatched: number;
  pendingInvoice: number;
  postedInvoices: number;
  pendingReturns: number;
  totalSO: number;
  totalPI: number;
  totalDC: number;
  totalInvoice: number;
  totalReturns: number;
}

const KPI_CARDS: { key: keyof SalesDashboardData; icon: string; label: string; color: string; bg: string }[] = [
  { key: 'newSalesOrders', icon: 'shopping_cart', label: 'New Sales Orders', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'pendingApproval', icon: 'hourglass_top', label: 'Pending Approval', color: '#b45309', bg: '#fef3c7' },
  { key: 'approvedOrders', icon: 'task_alt', label: 'Approved Orders', color: '#166534', bg: '#d4edda' },
  { key: 'partiallyDispatched', icon: 'local_shipping', label: 'Partially Dispatched', color: '#b45309', bg: '#fef3c7' },
  { key: 'overdueOrders', icon: 'event_busy', label: 'Overdue Orders', color: '#991b1b', bg: '#fde2e2' },
  { key: 'pendingPi', icon: 'request_quote', label: 'Pending PI', color: '#b45309', bg: '#fef3c7' },
  { key: 'pendingDispatch', icon: 'outbox', label: 'Pending Dispatch', color: '#b45309', bg: '#fef3c7' },
  { key: 'dispatched', icon: 'local_shipping', label: 'Dispatched', color: '#166534', bg: '#d4edda' },
  { key: 'pendingInvoice', icon: 'receipt_long', label: 'Pending Invoice', color: '#b45309', bg: '#fef3c7' },
  { key: 'postedInvoices', icon: 'price_check', label: 'Posted Invoices', color: '#166534', bg: '#d4edda' },
  { key: 'pendingReturns', icon: 'replay', label: 'Pending Returns', color: '#b45309', bg: '#fef3c7' },
  { key: 'totalSO', icon: 'assignment', label: 'Total SO', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'totalPI', icon: 'description', label: 'Total PI', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'totalDC', icon: 'table_view', label: 'Total DC', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'totalInvoice', icon: 'receipt', label: 'Total Invoices', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'totalReturns', icon: 'assignment_return', label: 'Total Returns', color: '#6b7280', bg: '#f3f4f6' },
];

const EMPTY: SalesDashboardData = {
  newSalesOrders: 0, pendingApproval: 0, approvedOrders: 0, partiallyDispatched: 0,
  overdueOrders: 0, pendingPi: 0, pendingDispatch: 0, dispatched: 0,
  pendingInvoice: 0, postedInvoices: 0, pendingReturns: 0,
  totalSO: 0, totalPI: 0, totalDC: 0, totalInvoice: 0, totalReturns: 0,
};

export default function SalesDashboard() {
  const { toast } = useToast();
  const [data, setData] = useState<SalesDashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: d } = await apiClient.get('/v1/sales/dashboard');
        setData((c) => ({ ...c, ...d }));
      } catch (e) { toast(getApiErrorMessage(e, 'Dashboard load failed.'), 'error'); }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <>
      <div className="pg-head">
        <h1>Sales Dashboard</h1>
        <p>Order, dispatch, billing and return monitoring</p>
      </div>

      <div className="panel">
        {loading ? (
          <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading dashboard...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, padding: 20 }}>
            {KPI_CARDS.map((kpi) => (
              <div key={kpi.key} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 24, color: kpi.color }}>{kpi.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{data[kpi.key]}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
