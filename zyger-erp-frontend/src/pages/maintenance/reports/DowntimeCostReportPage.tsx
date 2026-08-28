import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface DowntimeCostReport {
  totalBreakdownDowntimeMinutes: number;
  totalPmDowntimeMinutes: number;
  totalDowntimeMinutes: number;
  totalBreakdownCost: number;
  totalLabourHours: number;
  costByMachine: Record<string, number>;
  breakdownTransactions: number;
  pmCompletions: number;
  downtimeTransactions: number;
}

export default function DowntimeCostReportPage() {
  const { toast } = useToast();
  const [data, setData] = useState<DowntimeCostReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/v1/maintenance/reports/downtime-cost')
      .then(({ data: d }) => setData(d))
      .catch((e) => toast(getApiErrorMessage(e, 'Load failed.'), 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="panel" style={{ padding: 24, textAlign: 'center', color: '#888' }}>Loading report...</div>;
  if (!data) return <div className="panel" style={{ padding: 24, textAlign: 'center', color: '#888' }}>No data available.</div>;

  const fmtHrs = (mins: number) => {
    const h = Math.floor((mins ?? 0) / 60);
    const m = Math.round((mins ?? 0) % 60);
    return `${h}h ${m}m`;
  };
  const fmtCost = (v: number) => `₹${Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const machineEntries = Object.entries(data.costByMachine ?? {}).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

  return (
    <>
      <div className="pg-head">
        <h3>Downtime & Cost Report</h3>
        <p>Breakdown vs PM downtime, service costs by machine</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Downtime', value: fmtHrs(data.totalDowntimeMinutes), bg: '#eff6ff', color: '#1d4ed8' },
          { label: 'Breakdown Downtime', value: fmtHrs(data.totalBreakdownDowntimeMinutes), bg: '#fef2f2', color: '#dc2626' },
          { label: 'PM Downtime', value: fmtHrs(data.totalPmDowntimeMinutes), bg: '#f0fdf4', color: '#16a34a' },
          { label: 'Total Service Cost', value: fmtCost(data.totalBreakdownCost), bg: '#fef3c7', color: '#92400e' },
          { label: 'Labour Hours', value: `${Number(data.totalLabourHours ?? 0).toFixed(1)}h`, bg: '#f5f3ff', color: '#7c3aed' },
          { label: 'Transactions', value: String(data.downtimeTransactions ?? 0), bg: '#f3f4f6', color: '#374151' },
        ].map((kpi) => (
          <div key={kpi.label} className="panel" style={{ padding: 16, background: kpi.bg }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="panel" style={{ padding: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
            <h4 style={{ margin: 0, fontSize: 14 }}>Cost by Machine</h4>
          </div>
          {machineEntries.length === 0 ? (
            <p style={{ padding: 16, color: '#888', fontSize: 13 }}>No cost data recorded.</p>
          ) : (
            <div style={{ padding: 0 }}>
              {machineEntries.map(([code, cost]) => {
                const maxCost = machineEntries[0][1] || 1;
                const pct = Math.round((Number(cost) / maxCost) * 100);
                return (
                  <div key={code} style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', gap: 12, borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, width: 100, flexShrink: 0 }}>{code}</span>
                    <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#2563eb', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#374151', width: 80, textAlign: 'right' }}>{fmtCost(Number(cost))}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
            <h4 style={{ margin: 0, fontSize: 14 }}>Downtime Distribution</h4>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {(() => {
              const total = data.totalBreakdownDowntimeMinutes + data.totalPmDowntimeMinutes;
              if (total === 0) return <p style={{ color: '#888', fontSize: 13 }}>No downtime recorded.</p>;
              const bdPct = Math.round((data.totalBreakdownDowntimeMinutes / total) * 100);
              const pmPct = 100 - bdPct;
              return (
                <>
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="60" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                    <circle cx="80" cy="80" r="60" fill="none" stroke="#dc2626" strokeWidth="20"
                      strokeDasharray={`${bdPct * 3.77} ${(100 - bdPct) * 3.77}`}
                      strokeDashoffset="94.25" strokeLinecap="round" />
                    <circle cx="80" cy="80" r="60" fill="none" stroke="#16a34a" strokeWidth="20"
                      strokeDasharray={`${pmPct * 3.77} ${(100 - pmPct) * 3.77}`}
                      strokeDashoffset={`${94.25 - bdPct * 3.77}`} strokeLinecap="round" />
                    <text x="80" y="76" textAnchor="middle" fontSize="22" fontWeight="700" fill="#374151">{fmtHrs(total)}</text>
                    <text x="80" y="96" textAnchor="middle" fontSize="10" fill="#888">Total</text>
                  </svg>
                  <div style={{ display: 'flex', gap: 24, fontSize: 12 }}>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#dc2626', marginRight: 4 }} /> Breakdown {bdPct}%</span>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#16a34a', marginRight: 4 }} /> PM {pmPct}%</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </>
  );
}
