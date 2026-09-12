import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatNumber } from '../../../utils/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';

interface SpendEntry { name: string; value: number; }
interface ActivityEntry {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  field?: string;
  changedBy: string;
  changedAt: string;
  summary: string;
}

interface PurchaseDashboardData {
  openPR: number;
  openEnquiries: number;
  pendingQuotations: number;
  openPO: number;
  pendingPOApproval: number;
  partiallyReceived: number;
  delayedPO: number;
  openJobOrders: number;
  overdueJobOrders: number;
  totalPR: number;
  totalPO: number;
  totalJO: number;
  committedSpend?: number;
  openPOValue?: number;
  receivedValue?: number;
  invoicedSpend?: number;
  unInvoicedValue?: number;
  invoiceCount?: number;
  spendBySupplier?: SpendEntry[];
  spendByItem?: SpendEntry[];
  spendByDepartment?: SpendEntry[];
  monthlySpend?: Record<string, number>;
  recentActivity?: ActivityEntry[];
}

const KPI_CARDS: { key: keyof PurchaseDashboardData; icon: string; label: string; color: string; bg: string }[] = [
  { key: 'openPR', icon: 'assignment', label: 'Open PR', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'openEnquiries', icon: 'mark_email_unread', label: 'Open Enquiries', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'pendingQuotations', icon: 'request_quote', label: 'Pending Quotations', color: '#b45309', bg: '#fef3c7' },
  { key: 'openPO', icon: 'shopping_cart_checkout', label: 'Open PO', color: '#166534', bg: '#d4edda' },
  { key: 'pendingPOApproval', icon: 'hourglass_top', label: 'PO Approval Pending', color: '#b45309', bg: '#fef3c7' },
  { key: 'partiallyReceived', icon: 'inventory_2', label: 'Partially Received', color: '#b45309', bg: '#fef3c7' },
  { key: 'delayedPO', icon: 'event_busy', label: 'Delayed PO', color: '#991b1b', bg: '#fde2e2' },
  { key: 'openJobOrders', icon: 'engineering', label: 'Open Job Orders', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'overdueJobOrders', icon: 'report', label: 'Overdue Job Orders', color: '#991b1b', bg: '#fde2e2' },
  { key: 'totalPR', icon: 'description', label: 'Total PR', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'totalPO', icon: 'receipt_long', label: 'Total PO', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'totalJO', icon: 'work', label: 'Total Job Orders', color: '#6b7280', bg: '#f3f4f6' },
];

const EMPTY: PurchaseDashboardData = {
  openPR: 0, openEnquiries: 0, pendingQuotations: 0, openPO: 0,
  pendingPOApproval: 0, partiallyReceived: 0, delayedPO: 0,
  openJobOrders: 0, overdueJobOrders: 0, totalPR: 0, totalPO: 0, totalJO: 0,
};

const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#0d9488', '#4f46e5'];

function money(v?: number) {
  return `₹${formatNumber(Number(v ?? 0))}`;
}

export default function PurchaseDashboard() {
  const { toast } = useToast();
  const [data, setData] = useState<PurchaseDashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: d } = await apiClient.get('/v1/purchase/dashboard');
        setData((c) => ({ ...c, ...d }));
      } catch (e) { toast(getApiErrorMessage(e, 'Dashboard load failed.'), 'error'); }
      setLoading(false);
    };
    load();
  }, []);

  const monthlyData = Object.entries(data.monthlySpend ?? {}).map(([month, value]) => ({
    month,
    amount: Number(value),
  }));

  const supplierData = (data.spendBySupplier ?? []).map((s) => ({ name: s.name, value: Number(s.value) }));
  const itemData = (data.spendByItem ?? []).slice(0, 8).map((s) => ({ name: s.name, value: Number(s.value) }));
  const deptData = (data.spendByDepartment ?? []).slice(0, 8).map((s) => ({ name: s.name, value: Number(s.value) }));

  const financeCards = [
    { label: 'Committed Spend (Open POs)', value: money(data.committedSpend), icon: 'payments', color: '#1d4ed8', bg: '#dbeafe' },
    { label: 'Received Value', value: money(data.receivedValue), icon: 'inventory', color: '#166534', bg: '#d4edda' },
    { label: 'Invoiced Spend', value: money(data.invoicedSpend), icon: 'receipt_long', color: '#7c3aed', bg: '#ede9fe' },
    { label: 'Open PO Value', value: money(data.openPOValue), icon: 'account_balance_wallet', color: '#b45309', bg: '#fef3c7' },
    { label: 'Un-Invoiced Value', value: money(data.unInvoicedValue), icon: 'hourglass_bottom', color: '#991b1b', bg: '#fde2e2' },
  ];

  const renderSpendTable = (title: string, rows: SpendEntry[], formatter: (v: number) => string) => (
    <div className="panel" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: '#9ca3af' }}>No data yet.</div>
      ) : (
        <table className="tbl" style={{ width: '100%' }}>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td style={{ padding: '6px 8px', fontSize: 12 }}>{r.name}</td>
                <td style={{ padding: '6px 8px', fontSize: 12, textAlign: 'right', fontWeight: 600 }}>
                  {formatter(Number(r.value))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <>
      <div className="pg-head">
        <h1>Purchase Dashboard</h1>
        <p>Procurement and subcontract order monitoring</p>
      </div>

      {loading ? (
        <div className="panel">
          <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading dashboard...</div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="panel">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, padding: 20 }}>
              {KPI_CARDS.map((kpi) => (
                <div key={kpi.key} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 24, color: kpi.color }}>{kpi.icon}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{typeof data[kpi.key] === 'number' ? (data[kpi.key] as number) : 0}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{kpi.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Finance Summary */}
          <div className="pg-head" style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 18 }}>Finance &amp; Spend Overview</h2>
          </div>
          <div className="panel">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, padding: 20 }}>
              {financeCards.map((fc) => (
                <div key={fc.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: fc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 24, color: fc.color }}>{fc.icon}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, whiteSpace: 'nowrap' }}>{fc.value}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{fc.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="pg-head" style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 18 }}>Trends</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Monthly Committed Spend</div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [`₹${formatNumber(Number(v))}`, 'Spend']} />
                    <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Spend by Supplier</div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={supplierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => e.name}>
                      {supplierData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => `₹${formatNumber(Number(v))}`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Spend Breakdown Tables */}
          <div className="pg-head" style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: 18 }}>Spend Breakdown</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
            {renderSpendTable('By Supplier', supplierData, (v) => money(v))}
            {renderSpendTable('By Item', itemData, (v) => money(v))}
            {renderSpendTable('By Department', deptData, (v) => money(v))}
          </div>

          {/* Recent Activity */}
          <div className="pg-head" style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: 18 }}>Recent Procurement Activity</h2>
          </div>
          <div className="panel" style={{ padding: 16, marginBottom: 24 }}>
            {(data.recentActivity ?? []).length === 0 ? (
              <div style={{ fontSize: 12, color: '#9ca3af' }}>No recent activity recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(data.recentActivity ?? []).slice(0, 20).map((a) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 8 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 20, color: '#6b7280' }}>history</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{a.summary}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {a.changedAt ? new Date(a.changedAt).toLocaleString() : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
