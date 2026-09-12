import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatNumber } from '../../../utils/format';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ProductionDashboardData {
  totalJobCards: number;
  draftJobCards: number;
  releasedJobCards: number;
  inProgressJobCards: number;
  onHoldJobCards: number;
  completedJobCards: number;
  closedJobCards: number;
  totalProductionEntries: number;
  approvedEntries: number;
  pendingEntries: number;
  qualityPending: number;
  totalProducedQuantity: number;
  totalConversions: number;
  totalReturns: number;
  totalLogSheets: number;
  totalIdleTimeEntries: number;
}

const KPI_CARDS: { key: keyof ProductionDashboardData; icon: string; label: string; color: string; bg: string; numeric?: boolean }[] = [
  { key: 'totalJobCards', icon: 'assignment', label: 'Total Job Cards', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'draftJobCards', icon: 'edit_note', label: 'Draft Job Cards', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'releasedJobCards', icon: 'play_circle', label: 'Released Job Cards', color: '#166534', bg: '#d4edda' },
  { key: 'inProgressJobCards', icon: 'progress_activity', label: 'In Progress', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'onHoldJobCards', icon: 'pause_circle', label: 'On Hold', color: '#b45309', bg: '#fef3c7' },
  { key: 'completedJobCards', icon: 'task_alt', label: 'Completed', color: '#166534', bg: '#d4edda' },
  { key: 'closedJobCards', icon: 'lock', label: 'Closed', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'totalProductionEntries', icon: 'precision_manufacturing', label: 'Production Entries', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'approvedEntries', icon: 'verified', label: 'Approved Entries', color: '#166534', bg: '#d4edda' },
  { key: 'pendingEntries', icon: 'hourglass_top', label: 'Pending Entries', color: '#b45309', bg: '#fef3c7' },
  { key: 'qualityPending', icon: 'fact_check', label: 'Quality Pending', color: '#b45309', bg: '#fef3c7' },
  { key: 'totalProducedQuantity', icon: 'inventory', label: 'Total Produced Qty', color: '#1d4ed8', bg: '#dbeafe', numeric: true },
  { key: 'totalConversions', icon: 'swap_horiz', label: 'Conversions', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'totalReturns', icon: 'replay', label: 'Production Returns', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'totalLogSheets', icon: 'history_edu', label: 'Log Sheets', color: '#6b7280', bg: '#f3f4f6' },
  { key: 'totalIdleTimeEntries', icon: 'bedtime', label: 'Idle Time Entries', color: '#6b7280', bg: '#f3f4f6' },
];

const EMPTY: ProductionDashboardData = {
  totalJobCards: 0, draftJobCards: 0, releasedJobCards: 0, inProgressJobCards: 0,
  onHoldJobCards: 0, completedJobCards: 0, closedJobCards: 0,
  totalProductionEntries: 0, approvedEntries: 0, pendingEntries: 0, qualityPending: 0,
  totalProducedQuantity: 0, totalConversions: 0, totalReturns: 0,
  totalLogSheets: 0, totalIdleTimeEntries: 0,
};

export default function ProductionDashboard() {
  const { toast } = useToast();
  const [data, setData] = useState<ProductionDashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: d } = await apiClient.get('/v1/production/dashboard');
        setData((c) => ({ ...c, ...d }));
      } catch (e) { toast(getApiErrorMessage(e, 'Dashboard load failed.'), 'error'); }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <>
      <div className="pg-head">
        <h1>Production Dashboard</h1>
        <p>Job cards, production entries and shop-floor activity</p>
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
                  <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                    {kpi.numeric ? formatNumber(data[kpi.key]) : data[kpi.key]}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: '0 20px 20px' }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16 }}>Job Card Status Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={[
                    { name: 'Draft', value: data.draftJobCards, fill: '#9ca3af' },
                    { name: 'Released', value: data.releasedJobCards, fill: '#16a34a' },
                    { name: 'In Progress', value: data.inProgressJobCards, fill: '#2563eb' },
                    { name: 'On Hold', value: data.onHoldJobCards, fill: '#d97706' },
                    { name: 'Completed', value: data.completedJobCards, fill: '#059669' },
                    { name: 'Closed', value: data.closedJobCards, fill: '#6b7280' },
                  ].filter((d) => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {[
                      { fill: '#9ca3af' }, { fill: '#16a34a' }, { fill: '#2563eb' },
                      { fill: '#d97706' }, { fill: '#059669' }, { fill: '#6b7280' },
                    ].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16 }}>Production Activity</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[
                  { name: 'Entries', count: data.totalProductionEntries },
                  { name: 'Conversions', count: data.totalConversions },
                  { name: 'Returns', count: data.totalReturns },
                  { name: 'Log Sheets', count: data.totalLogSheets },
                  { name: 'Idle Time', count: data.totalIdleTimeEntries },
                ]} barCategoryGap="20%">
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {[
                      { fill: '#6366f1' }, { fill: '#8b5cf6' }, { fill: '#f59e0b' },
                      { fill: '#10b981' }, { fill: '#ef4444' },
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
