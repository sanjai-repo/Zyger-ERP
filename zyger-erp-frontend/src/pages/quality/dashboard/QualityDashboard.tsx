import { useQualityDashboard } from '../../../hooks/useQualityDocs';
import type { QualityDashboardData } from '../../../types/quality/quality.types';
import { formatNumber } from '../../../utils/format';
import { useTabs } from '../../../contexts/TabsContext';
import { getScreenComponent } from '../../../config/screenRegistry';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Card {
  key: string;
  label: string;
  icon: string;
  color: string;
  value: number;
  sub?: string;
  screenId?: string;
  filterKey?: string;
  filterValue?: string;
}

const TYPE_LABELS: Record<string, string> = {
  IQC: 'IQC',
  LO: 'LO',
  JOMIN: 'JOMIN',
  FAI: 'FAI',
  IPQC: 'IPQC',
  LINE: 'Line',
  LAST_OFF: 'Last Off',
  FINAL: 'Final',
};

function buildCards(d: QualityDashboardData): Card[] {
  const decided = d.pass + d.fail + d.hold;
  const passRate = decided === 0 ? null : (d.pass / decided) * 100;

  return [
    { key: 'pending', label: 'Inspections Pending', icon: 'pending_actions', color: 'var(--yellow)', value: d.pendingTotal, sub: 'all types, awaiting decision', screenId: 'inspection-pending' },
    { key: 'openNcr', label: 'Open NCR', icon: 'report', color: 'var(--red)', value: d.openNcr, screenId: 'quality-ncr' },
    { key: 'concession', label: 'Pending Concessions', icon: 'rule', color: '#b7791f', value: d.openConcession, screenId: 'concession-entry' },
    { key: 'complaints', label: 'Customer Complaints', icon: 'support_agent', color: 'var(--red)', value: d.openComplaints, sub: 'open', screenId: 'customer-complaint' },
    { key: 'capa', label: 'Open CAPA', icon: 'published_with_changes', color: 'var(--blue)', value: d.openCapa, screenId: 'capa' },
    { key: 'eightd', label: 'Open 8D', icon: 'article', color: 'var(--blue)', value: d.open8d, screenId: 'eight-d-report' },
    {
      key: 'pass',
      label: 'Decided PASS',
      icon: 'check_circle',
      color: 'var(--green)',
      value: d.pass,
      sub: passRate != null ? `first-pass yield ${passRate.toFixed(1)}%` : `${formatNumber(d.fail)} failed • ${formatNumber(d.hold)} on hold`,
      screenId: 'quality-inspection',
    },
    { key: 'cal7', label: 'Calibration Due ≤ 7d', icon: 'event_upcoming', color: 'var(--yellow)', value: d.calibration.dueWithin7Days, sub: `${formatNumber(d.calibration.overdue)} overdue • ${formatNumber(d.calibration.failed)} failed`, screenId: 'calibration-schedule' },
  ];
}

export default function QualityDashboard() {
  const { data, isPending, isError, refetch } = useQualityDashboard();
  const { openTab } = useTabs();

  const handleCardClick = (card: Card) => {
    if (!card.screenId) return;
    const Comp = getScreenComponent(card.screenId);
    if (!Comp) return;
    openTab({
      id: card.screenId,
      label: card.label,
      icon: card.icon,
      component: Comp,
      params: card.filterKey ? { [card.filterKey]: card.filterValue } : undefined,
    } as any);
  };

  if (isPending) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">hourglass_empty</span> Loading quality summary...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">error</span> Unable to load quality summary.
          <div style={{ marginTop: '14px' }}>
            <button className="btn" onClick={() => refetch()}>
              <span className="material-symbols-rounded">refresh</span> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingRows = Object.entries(data.pendingByType ?? {}).filter(([, v]) => Number(v ?? 0) > 0);

  return (
    <>
      <div className="stats">
        {buildCards(data).map((card) => (
          <div
            key={card.key}
            className="stat"
            style={{ cursor: card.screenId ? 'pointer' : 'default' }}
            onClick={() => handleCardClick(card)}
          >
            <div className="ic" style={{ background: card.color }}>
              <span className="material-symbols-rounded">{card.icon}</span>
            </div>
            <div>
              <div className="l">{card.label}</div>
              <div className="v">{formatNumber(card.value)}</div>
              {card.sub && <div className="s">{card.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {pendingRows.length > 0 && (
        <div className="panel">
          <div className="panel-h">
            <h2>
              <span className="material-symbols-rounded">pending_actions</span> Pending by Inspection Type
            </h2>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Inspection Type</th>
                  <th className="num">Pending</th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.map(([t, v]) => (
                  <tr key={t}>
                    <td>{TYPE_LABELS[t] ?? t}</td>
                    <td className="num">{formatNumber(Number(v))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #374151)', marginBottom: 16 }}>Inspection Decision Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={[
                { name: 'Pass', value: data.pass, fill: '#16a34a' },
                { name: 'Fail', value: data.fail, fill: '#dc2626' },
                { name: 'Hold', value: data.hold, fill: '#f59e0b' },
              ].filter((d) => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}               label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {[{ fill: '#16a34a' }, { fill: '#dc2626' }, { fill: '#f59e0b' }].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #374151)', marginBottom: 16 }}>Open Issues by Category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[
              { name: 'NCR', count: data.openNcr },
              { name: 'Concession', count: data.openConcession },
              { name: 'Complaints', count: data.openComplaints },
              { name: 'CAPA', count: data.openCapa },
              { name: '8D', count: data.open8d },
            ]} barCategoryGap="20%">
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {[
                  { fill: '#dc2626' }, { fill: '#f59e0b' }, { fill: '#6366f1' },
                  { fill: '#2563eb' }, { fill: '#8b5cf6' },
                ].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
