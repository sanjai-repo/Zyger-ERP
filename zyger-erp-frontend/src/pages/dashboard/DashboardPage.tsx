import { useState, useEffect, useMemo } from 'react';
import { useInventoryDashboard } from '../../hooks/useInventoryDashboard';
import { useTabs } from '../../contexts/TabsContext';
import PendingInwardListPage from '../inventory/inward/PendingInwardListPage';
import { formatDate, formatNumber } from '../../utils/format';
import axiosClient from '../../api/axiosClient';
import StatusBadge from '../../components/common/StatusBadge';
import { getStoredActivityLogs } from '../../utils/activityLog';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface StatCardProps {
  color: string;
  gradient: string;
  icon: string;
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
}

function StatCard({ color, gradient, icon, label, value, sub, onClick }: StatCardProps) {
  return (
    <div className={`dash-card ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="stat-card-gradient" style={{ background: gradient }} />
      <div className="stat-icon-wrapper" style={{ background: gradient }}>
        <span className="material-symbols-rounded">{icon}</span>
      </div>
      <div className="stat-value-group">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
        {sub ? (
          <div className="stat-card-sub">
            <span className="material-symbols-rounded" style={{ fontSize: '13px', color }}>info</span>
            {sub}
          </div>
        ) : (
          <div className="stat-card-sub" style={{ opacity: 0.5 }}>Zyger ERP</div>
        )}
      </div>
    </div>
  );
}

export interface RecentActivityLogItem {
  id: string;
  dateTime: string;
  module: 'Sales' | 'Purchase' | 'Inventory' | 'Quality' | 'Production' | 'Master';
  activity: string;
  refNo: string;
  party: string;
  user: string;
  status: string;
}

interface MonthlyStatusRow { month: string; received: number; issued: number; onHand: number; }
interface CategoryDistributionRow { category: string; value: number; }

export default function DashboardPage() {
  const { openTab } = useTabs();
  const {
    summary,
    isLoading,
    isError,
    errorMessage,
    refetch,
  } = useInventoryDashboard();

  const [activeChartTab, setActiveChartTab] = useState<'valuation' | 'traffic'>('valuation');
  const [monthlyStatus, setMonthlyStatus] = useState<MonthlyStatusRow[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryDistributionRow[]>([]);
  const [activityLog, setActivityLog] = useState<RecentActivityLogItem[]>(() => getStoredActivityLogs() as RecentActivityLogItem[]);
  const [activitySearch, setActivitySearch] = useState<string>('');
  const [activityModule, setActivityModule] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [activityPage, setActivityPage] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;
    axiosClient.get('/inventory/reports/overview')
      .then((res) => {
        if (cancelled) return;
        const data = res.data ?? {};
        if (Array.isArray(data.monthlyStatus)) setMonthlyStatus(data.monthlyStatus);
        if (Array.isArray(data.categoryDistribution)) setCategoryDistribution(data.categoryDistribution);
      })
      .catch(() => { /* charts fall back to empty state */ });
    return () => { cancelled = true; };
  }, []);

  const filteredActivityLogs = useMemo(() => {
    return activityLog.filter((log) => {
      if (activityModule && log.module !== activityModule) {
        return false;
      }

      if (activitySearch.trim()) {
        const query = activitySearch.toLowerCase();
        const match =
          log.activity.toLowerCase().includes(query) ||
          log.refNo.toLowerCase().includes(query) ||
          log.party.toLowerCase().includes(query) ||
          log.user.toLowerCase().includes(query) ||
          log.status.toLowerCase().includes(query) ||
          log.module.toLowerCase().includes(query);
        if (!match) return false;
      }

      if (fromDate || toDate) {
        const logTime = (log as any).timestamp || (log.dateTime ? new Date(log.dateTime).getTime() : 0);
        if (fromDate) {
          const fromTime = new Date(fromDate).getTime();
          if (logTime && logTime < fromTime) return false;
        }
        if (toDate) {
          const toTime = new Date(toDate + 'T23:59:59').getTime();
          if (logTime && logTime > toTime) return false;
        }
      }

      return true;
    });
  }, [activityLog, activityModule, activitySearch, fromDate, toDate]);

  const pageSize = 10;
  const totalActivityRecords = filteredActivityLogs.length;
  const totalActivityPages = Math.ceil(totalActivityRecords / pageSize) || 1;
  const currentActivityPage = Math.min(activityPage, totalActivityPages);

  const paginatedActivityLogs = useMemo(() => {
    const startIndex = (currentActivityPage - 1) * pageSize;
    return filteredActivityLogs.slice(startIndex, startIndex + pageSize);
  }, [filteredActivityLogs, currentActivityPage]);

  useEffect(() => {
    const refreshLogs = () => {
      setActivityLog(getStoredActivityLogs() as RecentActivityLogItem[]);
    };

    refreshLogs();
    window.addEventListener('zyger-activity-log-updated', refreshLogs);
    window.addEventListener('storage', refreshLogs);

    Promise.allSettled([
      axiosClient.get('/v1/sales/sales-dc?size=5'),
      axiosClient.get('/v1/purchase/purchase-order?size=5'),
      axiosClient.get('/inventory/documents/po-inward?size=5'),
      axiosClient.get('/inventory/return-management/dc-return?size=5'),
    ]).then(([salesRes, poRes, inwardRes, returnRes]) => {
      const fetchedLogs: RecentActivityLogItem[] = [];

      if (salesRes.status === 'fulfilled' && Array.isArray(salesRes.value.data?.content)) {
        salesRes.value.data.content.forEach((d: any) => {
          fetchedLogs.push({
            id: `sales-${d.id || d.docNo}`,
            dateTime: formatDate(d.date || d.createdAt),
            module: 'Sales',
            activity: `Sales Delivery Challan (${d.docNo || ''})`,
            refNo: d.docNo || '',
            party: d.customer || d.party || 'Customer',
            user: d.createdBy || 'User',
            status: d.status || 'APPROVED',
          });
        });
      }

      if (poRes.status === 'fulfilled' && Array.isArray(poRes.value.data?.content)) {
        poRes.value.data.content.forEach((d: any) => {
          fetchedLogs.push({
            id: `po-${d.id || d.docNo}`,
            dateTime: formatDate(d.date || d.createdAt),
            module: 'Purchase',
            activity: `Purchase Order Created (${d.docNo || ''})`,
            refNo: d.docNo || '',
            party: d.supplier || 'Supplier',
            user: d.createdBy || 'Buyer',
            status: d.status || 'RELEASED',
          });
        });
      }

      if (inwardRes.status === 'fulfilled' && Array.isArray(inwardRes.value.data?.content)) {
        inwardRes.value.data.content.forEach((d: any) => {
          fetchedLogs.push({
            id: `inward-${d.id || d.docNo}`,
            dateTime: formatDate(d.date || d.createdAt),
            module: 'Inventory',
            activity: `Material Inward Entry (${d.docNo || ''})`,
            refNo: d.docNo || '',
            party: d.supplier || d.party || 'Supplier',
            user: d.receivedBy || 'Store User',
            status: d.status || 'SUBMITTED',
          });
        });
      }

      if (returnRes.status === 'fulfilled' && Array.isArray(returnRes.value.data?.content)) {
        returnRes.value.data.content.forEach((d: any) => {
          fetchedLogs.push({
            id: `return-${d.id || d.docNo}`,
            dateTime: formatDate(d.date || d.createdAt),
            module: 'Inventory',
            activity: `DC Return Entry (${d.docNo || ''})`,
            refNo: d.docNo || '',
            party: d.party || d.customer || 'Party',
            user: d.createdBy || 'User',
            status: d.status || 'RECEIVED',
          });
        });
      }

      if (fetchedLogs.length > 0) {
        setActivityLog(prev => {
          const combined = [...fetchedLogs, ...prev];
          const uniqueMap = new Map();
          combined.forEach(item => {
            if (item.refNo && !uniqueMap.has(item.refNo)) {
              uniqueMap.set(item.refNo, item);
            }
          });
          return Array.from(uniqueMap.values()).slice(0, 15);
        });
      }
    }).catch(() => { });

    return () => {
      window.removeEventListener('zyger-activity-log-updated', refreshLogs);
      window.removeEventListener('storage', refreshLogs);
    };
  }, []);

  const openPendingInward = () => {
    openTab({
      id: 'pending-inward',
      label: 'Pending Inward',
      icon: 'hourglass_top',
      component: PendingInwardListPage,
      props: { showLog: false },
    });
  };

  if (isLoading) {
    return (
      <div className="panel" style={{ borderRadius: '16px', padding: '60px' }}>
        <div className="empty">
          <span className="material-symbols-rounded" style={{ fontSize: '48px', animation: 'spin 1.5s linear infinite' }}>progress_activity</span>
          <p style={{ marginTop: '16px', fontWeight: 600 }}>Loading inventory dashboard...</p>
        </div>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="panel" style={{ borderRadius: '16px', padding: '60px' }}>
        <div className="empty">
          <span className="material-symbols-rounded" style={{ fontSize: '48px', color: 'var(--red)' }}>error</span>
          <p style={{ marginTop: '16px', fontWeight: 600 }}>{errorMessage || 'Unable to load inventory dashboard.'}</p>
          <div style={{ marginTop: '20px' }}>
            <button className="btn btn-p" onClick={() => refetch()}>
              <span className="material-symbols-rounded">refresh</span>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chart data derived from real stock ledger (backend /inventory/reports/overview)
  const valueTrendData = monthlyStatus.map((row) => ({ name: row.month, value: row.onHand }));

  const trafficData = monthlyStatus.map((row) => ({
    name: row.month,
    Inward: row.received,
    Outward: row.issued,
  }));

  const categoryTotal = categoryDistribution.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
  const categoryData = categoryDistribution
    .filter((row) => row.category && Number(row.value) > 0)
    .map((row) => ({
      name: row.category,
      value: categoryTotal > 0 ? Math.round((Number(row.value) / categoryTotal) * 1000) / 10 : 0,
      absolute: Number(row.value),
    }));

  const COLORS = ['#007bd6', '#7367f0', '#ff9f43', '#28c76f'];

  // Current Date
  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="dash-container">
      <style>{`
        .dash-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: dashFadeIn 0.5s ease-out;
        }
        @keyframes dashFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .dash-header-left h1 {
          font-size: 1.75rem;
          font-weight: 850;
          letter-spacing: -0.03em;
          color: var(--text);
        }
        .dash-header-left p {
          color: var(--blue);
          font-size: 0.88rem;
          font-weight: 600;
          margin-top: 4px;
        }
        .dash-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .chart-grid {
          display: grid;
          grid-template-columns: 1.65fr 1.05fr;
          gap: 20px;
        }
        @media (max-width: 1100px) {
          .chart-grid {
            grid-template-columns: 1fr;
          }
        }
        .dash-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.02);
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
          display: flex;
          flex-direction: column;
        }
        .dash-card.clickable {
          cursor: pointer;
        }
        .dash-card.clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 123, 214, 0.08);
          border-color: rgba(0, 123, 214, 0.3);
        }
        .stat-card-gradient {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
        }
        .stat-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          margin-bottom: 14px;
        }
        .stat-icon-wrapper span {
          font-size: 22px;
          color: #fff;
        }
        .stat-value-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .stat-card-label {
          font-size: 0.68rem;
          font-weight: 800;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .stat-card-value {
          font-size: 1.65rem;
          font-weight: 850;
          color: var(--text);
          line-height: 1.1;
        }
        .stat-card-sub {
          font-size: 0.72rem;
          color: var(--muted);
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .dash-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }
        .dash-card-header h2 {
          font-size: 0.95rem;
          font-weight: 750;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .dash-card-header h2 span {
          color: var(--blue);
          font-size: 20px;
        }
        .chart-tab-group {
          display: flex;
          background: var(--body);
          padding: 3px;
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        .chart-tab-btn {
          border: none;
          background: none;
          padding: 6px 12px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--muted);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .chart-tab-btn.active {
          background: var(--card);
          color: var(--blue);
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }
        .low-stock-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .low-stock-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          background: var(--blue-bg);
          border: 1px solid var(--border);
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .low-stock-card:hover {
          transform: translateX(3px);
          border-color: rgba(234, 84, 85, 0.4);
        }
        .low-stock-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .low-stock-item-code {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .low-stock-item-name {
          font-size: 0.72rem;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .low-stock-progress-container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          width: 110px;
          flex-shrink: 0;
        }
        .low-stock-progress-bar {
          width: 100%;
          height: 6px;
          background: var(--border);
          border-radius: 3px;
          overflow: hidden;
        }
        .low-stock-progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.4s ease;
        }
        .low-stock-qty-text {
          font-size: 0.74rem;
          font-weight: 700;
        }
        .ledger-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .ledger-badge.in {
          background: rgba(40, 199, 111, 0.1);
          color: #1f9d58;
        }
        .ledger-badge.out {
          background: rgba(234, 84, 85, 0.1);
          color: #d34546;
        }
      `}</style>

      {/* Modern Dashboard Header */}
      <div className="dash-header-flex">
        <div className="dash-header-left">
          <h1>Dashboard</h1>
          <p>Real-time inventory visibility</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>
            {formattedToday}
          </span>
          <button className="btn" onClick={() => refetch()} style={{ borderRadius: '10px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Cards - Row 1 (Primary Indicators) */}
      <div className="dash-row">
        <StatCard
          color="var(--blue)"
          gradient="linear-gradient(135deg, #007bd6 0%, #005fa3 100%)"
          icon="inventory_2"
          label="Total On Hand"
          value={formatNumber(summary?.totalOnHand)}
          sub="Total units currently stored"
        />
        <StatCard
          color="var(--purple)"
          gradient="linear-gradient(135deg, #7367f0 0%, #5a4ee6 100%)"
          icon="lock"
          label="Reserved"
          value={formatNumber(summary?.reservedQty)}
          sub="Locked for active work orders"
        />
        <StatCard
          color="var(--green)"
          gradient="linear-gradient(135deg, #28c76f 0%, #1f9d58 100%)"
          icon="check_circle"
          label="Available"
          value={formatNumber(summary?.availableQty)}
          sub="Unrestricted stock ready for issue"
        />
      </div>

      {/* KPI Stats Cards - Row 2 (Workflow & Operations) */}
      <div className="dash-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard
          color="var(--yellow)"
          gradient="linear-gradient(135deg, #ff9f43 0%, #e68326 100%)"
          icon="hourglass_top"
          label="Pending Inward"
          value={formatNumber(summary?.pendingInwardCount)}
          sub="Inbound shipments awaiting GRN"
          onClick={openPendingInward}
        />
        <StatCard
          color="var(--yellow)"
          gradient="linear-gradient(135deg, #00cfe8 0%, #00b5cc 100%)"
          icon="task_alt"
          label="Pending Approvals"
          value={formatNumber(summary?.pendingApprovalCount)}
          sub="Documents requiring authorization"
        />
        <StatCard
          color="var(--dark-nav)"
          gradient="linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)"
          icon="menu_book"
          label="Ledger Entries"
          value={formatNumber(summary?.ledgerEntryCount)}
          sub="Total historical ledger transactions"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="chart-grid">
        {/* Left Side: Trends Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h2>
              <span className="material-symbols-rounded">analytics</span>
              Stock Performance Indicators
            </h2>
            <div className="chart-tab-group">
              <button
                className={`chart-tab-btn ${activeChartTab === 'valuation' ? 'active' : ''}`}
                onClick={() => setActiveChartTab('valuation')}
              >
                Stock On-Hand Trend
              </button>
              <button
                className={`chart-tab-btn ${activeChartTab === 'traffic' ? 'active' : ''}`}
                onClick={() => setActiveChartTab('traffic')}
              >
                Inward / Outward
              </button>
            </div>
          </div>

          <div style={{ width: '100%', height: '280px', marginTop: '10px' }}>
            {valueTrendData.length === 0 && trafficData.length === 0 ? (
              <div className="empty">
                <span className="material-symbols-rounded">monitoring</span>
                No stock movement recorded yet.
              </div>
            ) : activeChartTab === 'valuation' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={valueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValuation" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px' }}
                    labelStyle={{ fontWeight: 700, color: 'var(--text)' }}
                    formatter={(value: any) => [`${value}`, 'On-Hand Qty']}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--blue)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValuation)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px' }}
                    labelStyle={{ fontWeight: 700, color: 'var(--text)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="Inward" fill="var(--blue)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Outward" fill="var(--purple)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Side: Category Pie Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h2>
              <span className="material-symbols-rounded">pie_chart</span>
              Stock by Category
            </h2>
          </div>
          <div style={{ width: '100%', height: '220px', position: 'relative' }}>
            {categoryData.length === 0 ? (
              <div className="empty">
                <span className="material-symbols-rounded">pie_chart</span>
                No stock data to categorize.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Share']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', justifyContent: 'center', marginTop: '-10px' }}>
            {categoryData.map((item, idx) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[idx], display: 'inline-block' }} />
                {item.name} ({item.value}%)
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Width Recent Activity Log Panel */}
      <div className="dash-card" style={{ width: '100%', padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
        <div className="panel-h" style={{ borderBottom: '1px solid var(--border)', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>
            <span className="material-symbols-rounded" style={{ color: 'var(--blue)' }}>history_edu</span>
            Recent Activity Log
          </h2>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '12px', background: 'rgba(0, 123, 214, 0.1)', color: 'var(--blue)' }}>
            System-wide Activity Feed
          </span>
        </div>

        {/* Filter Toolbar - All Filters Right Aligned */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--card-bg, transparent)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'flex-end' }}>
          {/* Module Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Module:</span>
            <select
              className="in"
              value={activityModule}
              onChange={(e) => {
                setActivityModule(e.target.value);
                setActivityPage(1);
              }}
              style={{ width: '140px' }}
            >
              <option value="">All Modules</option>
              <option value="Sales">Sales</option>
              <option value="Purchase">Purchase</option>
              <option value="Inventory">Inventory</option>
              <option value="Quality">Quality</option>
              <option value="Production">Production</option>
              <option value="Master">Master</option>
            </select>
          </div>

          {/* Date Range: From */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>From:</span>
            <input
              type="date"
              className="in"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setActivityPage(1);
              }}
              style={{ width: '135px' }}
            />
          </div>

          {/* Date Range: To */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>To:</span>
            <input
              type="date"
              className="in"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setActivityPage(1);
              }}
              style={{ width: '135px' }}
            />
          </div>

          {/* Search Input */}
          <div className="searchwrap" style={{ flex: '0 1 260px', minWidth: '200px' }}>
            <span className="material-symbols-rounded">search</span>
            <input
              type="text"
              className="in"
              placeholder="Search by Activity, Ref No, Party, User..."
              value={activitySearch}
              onChange={(e) => {
                setActivitySearch(e.target.value);
                setActivityPage(1);
              }}
            />
          </div>

          {/* Clear Filters Button */}
          {(activitySearch || activityModule || fromDate || toDate) && (
            <button
              className="btn btn-s"
              onClick={() => {
                setActivitySearch('');
                setActivityModule('');
                setFromDate('');
                setToDate('');
                setActivityPage(1);
              }}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>clear_all</span>
              Clear
            </button>
          )}
        </div>

        {/* Activity Log Table */}
        <div className="twrap">
          <table className="tbl" style={{ width: '100%', minWidth: '850px' }}>
            <thead>
              <tr>
                <th className="num">S.No</th>
                <th style={{ width: '15%' }}>Date & Time</th>
                <th style={{ width: '10%' }}>Module</th>
                <th style={{ width: '25%' }}>Activity / Action</th>
                <th style={{ width: '15%' }}>Ref No</th>
                <th style={{ width: '20%' }}>Party / Customer / Supplier</th>
                <th style={{ width: '10%' }}>User</th>
                <th style={{ width: '5%' }}>Status</th>
              </tr>
            </thead>

            <tbody>
              {paginatedActivityLogs && paginatedActivityLogs.length > 0 ? (
                paginatedActivityLogs.map((log, idx) => {
                  const moduleColors: Record<string, { bg: string; text: string }> = {
                    Sales: { bg: 'rgba(115, 103, 240, 0.12)', text: '#7367f0' },
                    Purchase: { bg: 'rgba(0, 123, 214, 0.12)', text: '#007bd6' },
                    Inventory: { bg: 'rgba(40, 199, 111, 0.12)', text: '#28c76f' },
                    Quality: { bg: 'rgba(255, 159, 67, 0.12)', text: '#ff9f43' },
                    Production: { bg: 'rgba(234, 84, 85, 0.12)', text: '#ea5455' },
                  };
                  const color = moduleColors[log.module] || { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748b' };

                  return (
                    <tr key={log.id}>
                      <td className="num mut">{(currentActivityPage - 1) * pageSize + idx + 1}</td>
                      <td style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{log.dateTime}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: color.bg,
                            color: color.text,
                          }}
                        >
                          {log.module}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.activity}</td>
                      <td className="cell-b" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{log.refNo}</td>
                      <td>{log.party}</td>
                      <td style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{log.user}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <StatusBadge status={log.status} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="empty" style={{ padding: '24px 0' }}>No activity logs found matching the filter criteria.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
            Showing {totalActivityRecords === 0 ? 0 : (currentActivityPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentActivityPage * pageSize, totalActivityRecords)} of {totalActivityRecords} activity logs
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-s"
              disabled={currentActivityPage <= 1}
              onClick={() => setActivityPage((prev) => Math.max(1, prev - 1))}
              style={{ padding: '4px 10px', fontSize: '12px', opacity: currentActivityPage <= 1 ? 0.5 : 1 }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>chevron_left</span>
              Previous
            </button>

            <span style={{ fontSize: '12px', fontWeight: 700, padding: '0 8px' }}>
              Page {currentActivityPage} of {totalActivityPages}
            </span>

            <button
              className="btn btn-s"
              disabled={currentActivityPage >= totalActivityPages}
              onClick={() => setActivityPage((prev) => Math.min(totalActivityPages, prev + 1))}
              style={{ padding: '4px 10px', fontSize: '12px', opacity: currentActivityPage >= totalActivityPages ? 0.5 : 1 }}
            >
              Next
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}