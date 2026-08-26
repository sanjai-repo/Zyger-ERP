import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
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
  const [data, setData] = useState<PlanningDashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: d } = await apiClient.get('/v1/planning/dashboard');
        setData((c) => ({ ...c, ...d }));
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
          </>
        )}
      </div>
    </>
  );
}
