import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import { useTabs } from '../../../contexts/TabsContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PlanningDashboardData {
  totalBom: number;
  totalRoutes: number;
  totalWorkOrders: number;
  pendingApproval: number;
  released: number;
  inProcess: number;
  completed: number;
  closed: number;
  totalShopFloor: number;
  overdue: number;
  cancelled: number;
}

const KPI_CARDS: { key: keyof PlanningDashboardData; icon: string; label: string; color: string; bg: string }[] = [
  { key: 'totalBom', icon: 'account_tree', label: 'Total BOMs', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'totalRoutes', icon: 'route', label: 'Total Route Sheets', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'totalWorkOrders', icon: 'assignment', label: 'Total Work Orders', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'pendingApproval', icon: 'hourglass_top', label: 'Pending Approval', color: '#b45309', bg: '#fef3c7' },
  { key: 'overdue', icon: 'warning', label: 'Overdue WOs', color: '#dc2626', bg: '#fef2f2' },
  { key: 'released', icon: 'play_circle', label: 'Released WO', color: '#166534', bg: '#d4edda' },
  { key: 'inProcess', icon: 'progress_activity', label: 'In Process WO', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'completed', icon: 'task_alt', label: 'Completed WO', color: '#166534', bg: '#d4edda' },
  { key: 'closed', icon: 'lock', label: 'Closed WO', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'cancelled', icon: 'block', label: 'Cancelled WO', color: '#dc2626', bg: '#fef2f2' },
  { key: 'totalShopFloor', icon: 'factory', label: 'Shop Floor Entries', color: '#6b7280', bg: '#f3f4f6' },
];

const EMPTY: PlanningDashboardData = {
  totalBom: 0, totalRoutes: 0, totalWorkOrders: 0, pendingApproval: 0,
  released: 0, inProcess: 0, completed: 0, closed: 0, totalShopFloor: 0,
  overdue: 0, cancelled: 0,
};

export default function PlanningDashboard() {
  const { toast } = useToast();
  const { openTab } = useTabs();
  const [data, setData] = useState<PlanningDashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [dashRes, pendRes] = await Promise.allSettled([
          apiClient.get('/v1/planning/dashboard'),
          apiClient.get('/v1/planning/pending-approvals'),
        ]);
        if (dashRes.status === 'fulfilled') setData((c) => ({ ...c, ...dashRes.value.data }));
        if (pendRes.status === 'fulfilled') setPendingApprovals(pendRes.value.data as Array<Record<string, unknown>>);
      } catch (e) { toast(getApiErrorMessage(e, 'Dashboard load failed.'), 'error'); }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <>
      <div className="pg-head">
        <h1>Planning Dashboard</h1>
        <p>Work order and production definition status</p>
      </div>

      <div className="panel">
        {loading ? (
          <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading dashboard...</div>
        ) : (
          <>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: '0 20px 20px' }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16 }}>Work Order Status</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={[
                    { name: 'Pending', value: data.pendingApproval, fill: '#f59e0b' },
                    { name: 'Released', value: data.released, fill: '#16a34a' },
                    { name: 'In Process', value: data.inProcess, fill: '#2563eb' },
                    { name: 'Completed', value: data.completed, fill: '#059669' },
                    { name: 'Closed', value: data.closed, fill: '#6b7280' },
                    { name: 'Overdue', value: data.overdue, fill: '#dc2626' },
                    { name: 'Cancelled', value: data.cancelled, fill: '#ef4444' },
                  ].filter((d) => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {[
                      { fill: '#f59e0b' }, { fill: '#16a34a' }, { fill: '#2563eb' },
                      { fill: '#059669' }, { fill: '#6b7280' }, { fill: '#dc2626' }, { fill: '#ef4444' },
                    ].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16 }}>Planning Overview</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[
                  { name: 'BOMs', count: data.totalBom },
                  { name: 'Routes', count: data.totalRoutes },
                  { name: 'Work Orders', count: data.totalWorkOrders },
                  { name: 'Shop Floor', count: data.totalShopFloor },
                ]} barCategoryGap="25%">
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {[
                      { fill: '#6366f1' }, { fill: '#8b5cf6' }, { fill: '#0ea5e9' }, { fill: '#f59e0b' },
                    ].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* FRS §6.15: My Pending Approvals List */}
          {pendingApprovals.length > 0 && (
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#b45309' }}>hourglass_top</span>
                  My Pending Approvals ({pendingApprovals.length})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', color: '#6b7280', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '8px 12px', color: '#6b7280', fontWeight: 600 }}>Doc No</th>
                        <th style={{ padding: '8px 12px', color: '#6b7280', fontWeight: 600 }}>Item / Name</th>
                        <th style={{ padding: '8px 12px', color: '#6b7280', fontWeight: 600 }}>Created By</th>
                        <th style={{ padding: '8px 12px', color: '#6b7280', fontWeight: 600 }}>Date</th>
                        <th style={{ padding: '8px 12px', color: '#6b7280', fontWeight: 600 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingApprovals.map((doc, idx) => {
                        const docType = String(doc._docType ?? '');
                        const typeLabel = docType === 'work-order' ? 'Work Order' : docType === 'production-bom' ? 'BOM' : docType === 'route-sheet' ? 'Route Sheet' : docType;
                        const docNo = String(doc.woNumber ?? doc.bomNumber ?? doc.routeNumber ?? doc.docNo ?? `#${doc.id}`);
                        const itemName = String(doc.itemCode ?? doc.itemDescription ?? doc.woDescription ?? '—');
                        const createdBy = String(doc.createdBy ?? doc.submittedBy ?? '—');
                        const createdAt = String(doc.createdAt ?? '').replace('T', ' ').slice(0, 10);
                        const tabKey = docType === 'work-order' ? 'workorder' : docType === 'production-bom' ? 'bom' : docType === 'route-sheet' ? 'routesheet' : docType;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 12px' }}><span style={{ background: docType === 'work-order' ? '#dbeafe' : docType === 'production-bom' ? '#d1fae5' : '#fef3c7', color: docType === 'work-order' ? '#1e40af' : docType === 'production-bom' ? '#065f46' : '#92400e', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{typeLabel}</span></td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#111827' }}>{docNo}</td>
                            <td style={{ padding: '8px 12px', color: '#374151' }}>{itemName}</td>
                            <td style={{ padding: '8px 12px', color: '#6b7280' }}>{createdBy}</td>
                            <td style={{ padding: '8px 12px', color: '#6b7280' }}>{createdAt}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <button type="button" className="btn btn-sm btn-p" onClick={() => openTab(tabKey, { initialDocId: doc.id })} style={{ fontSize: 11, padding: '2px 8px' }}>
                                Review
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </>
  );
}
