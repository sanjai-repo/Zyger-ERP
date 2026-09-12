import { useState, useEffect, useRef } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useTabs } from '../../../contexts/TabsContext';
import { getApiErrorMessage } from '../../../utils/apiError';

const SCREEN_ID = 'machine-load-gantt';

interface MachineLoadLine {
  id: number;
  machineCode: string;
  machineDescription: string;
  workCenter: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  utilizationPercent: number;
  workOrderId?: string;
  operationCode?: string;
  status: string;
}

interface MachineLoadPlan {
  id: number;
  planNumber: string;
  planStartDate: string;
  planEndDate: string;
  status: string;
  lines?: MachineLoadLine[];
}

interface GanttBar {
  machineCode: string;
  startMs: number;
  endMs: number;
  utilization: number;
  workOrderId?: string;
  operationCode?: string;
  status: string;
  color: string;
  tooltip: string;
}

const ROW_HEIGHT = 36;
const MIN_COL_WIDTH = 80;

function utilizationColor(pct: number): string {
  if (pct > 95) return '#ef4444';
  if (pct >= 80) return '#f59e0b';
  if (pct >= 50) return '#3b82f6';
  return '#9ca3af';
}

function parseTime(dateStr: string, timeStr?: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
  }
  return d.getTime();
}

export default function MachineLoadGantt() {
  const { toast } = useToast();
  const { closeTab } = useTabs();
  const containerRef = useRef<HTMLDivElement>(null);
  const [plans, setPlans] = useState<MachineLoadPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [lines, setLines] = useState<MachineLoadLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get('/v1/planning/machine-load-plans');
        const items: MachineLoadPlan[] = Array.isArray(data) ? data : data.content ?? [];
        setPlans(items);
        const active = items.find((p) => p.status === 'ACTIVE') ?? items[0];
        if (active) {
          setSelectedPlanId(active.id);
          setLines(active.lines ?? []);
        }
      } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
      setLoading(false);
    })();
  }, []);

  const selectPlan = async (id: number) => {
    setSelectedPlanId(id);
    const plan = plans.find((p) => p.id === id);
    if (plan?.lines && plan.lines.length > 0) {
      setLines(plan.lines);
      return;
    }
    try {
      const { data } = await apiClient.get(`/v1/planning/machine-load-plans/${id}/lines`);
      setLines(Array.isArray(data) ? data : data.content ?? []);
    } catch { /* endpoint may not exist, use plan.lines */ }
  };

  const machines = [...new Set(lines.map((l) => l.machineCode))].sort();
  if (machines.length === 0 && !loading) return (
    <div className="panel"><div className="empty"><span className="material-symbols-rounded">view_gantt</span> No machine load data. Generate a load plan first.</div></div>
  );

  const allStarts = lines.map((l) => parseTime(l.scheduledDate, l.startTime)).filter(Boolean);
  const allEnds = lines.map((l) => parseTime(l.scheduledDate, l.endTime)).filter(Boolean);
  const minTime = Math.min(...allStarts, Date.now());
  const maxTime = Math.max(...allEnds, Date.now());
  const spanMs = maxTime - minTime || 86400000;
  const DAY_MS = 86400000;
  const totalDays = Math.max(Math.ceil(spanMs / DAY_MS), 1);
  const chartWidth = Math.max(totalDays * MIN_COL_WIDTH, containerRef.current?.clientWidth ?? 800);

  const bars: GanttBar[] = lines.map((l) => {
    const s = parseTime(l.scheduledDate, l.startTime);
    const e = parseTime(l.scheduledDate, l.endTime);
    return {
      machineCode: l.machineCode,
      startMs: s || minTime,
      endMs: e || s + 3600000,
      utilization: l.utilizationPercent ?? 0,
      workOrderId: l.workOrderId,
      operationCode: l.operationCode,
      status: l.status,
      color: utilizationColor(l.utilizationPercent ?? 0),
      tooltip: `${l.machineCode} | ${l.operationCode ?? l.workOrderId ?? '—'} | ${l.utilizationPercent ?? 0}% util | ${l.startTime ?? ''}–${l.endTime ?? ''}`,
    };
  });

  const days: Date[] = [];
  const startDay = new Date(minTime);
  startDay.setHours(0, 0, 0, 0);
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDay.getTime() + i * DAY_MS);
    days.push(d);
  }

  const pct = (ms: number) => ((ms - minTime) / spanMs) * 100;

  const todayOffset = pct(Date.now());

  return (
    <>
      <div className="pg-head">
        <h1>Machine Load Gantt</h1>
        <p>Visual timeline of machine allocations · {lines.length} entries across {machines.length} machines</p>
      </div>

      <div className="toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className="btn btn-sm" onClick={() => closeTab(SCREEN_ID)}><span className="material-symbols-rounded">arrow_back</span> Back</button>
        <select className="in" value={selectedPlanId ?? ''} onChange={(e) => selectPlan(Number(e.target.value))} style={{ width: 260 }}>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.planNumber} ({p.status})</option>)}
        </select>
        <span style={{ fontSize: 13, color: '#6b7280' }}>{machines.length} machines · {totalDays} days</span>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div ref={containerRef} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 600, position: 'relative' }}>
          {/* Header: days */}
          <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 10, background: '#fff', borderBottom: '2px solid #e5e7eb' }}>
            <div style={{ minWidth: 140, width: 140, padding: '8px 10px', fontWeight: 700, fontSize: 12, color: '#6b7280', background: '#f9fafb', borderRight: '1px solid #e5e7eb', position: 'sticky', left: 0, zIndex: 11 }}>Machine</div>
            <div style={{ flex: 1, display: 'flex', minWidth: chartWidth, position: 'relative' }}>
              {days.map((d, i) => (
                <div key={i} style={{ flex: 1, minWidth: MIN_COL_WIDTH, padding: '8px 4px', fontSize: 11, color: '#6b7280', textAlign: 'center', borderRight: '1px solid #f3f4f6', background: d.getDay() === 0 || d.getDay() === 6 ? '#fafafa' : '#fff' }}>
                  {d.toLocaleDateString('en', { weekday: 'short' })} {d.getDate()}/{d.getMonth() + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {machines.map((machine, mi) => {
            const machineBars = bars.filter((b) => b.machineCode === machine);
            const avgUtil = machineBars.length > 0 ? Math.round(machineBars.reduce((s, b) => s + b.utilization, 0) / machineBars.length) : 0;
            return (
              <div key={machine} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', minHeight: ROW_HEIGHT }}>
                <div style={{ minWidth: 140, width: 140, padding: '6px 10px', fontSize: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: mi % 2 === 0 ? '#f9fafb' : '#fff', borderRight: '1px solid #e5e7eb', position: 'sticky', left: 0, zIndex: 5 }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: 12 }}>{machine}</div>
                  <div style={{ fontSize: 10, color: utilizationColor(avgUtil), fontWeight: 500 }}>avg {avgUtil}%</div>
                </div>
                <div style={{ flex: 1, position: 'relative', minWidth: chartWidth, background: mi % 2 === 0 ? '#f9fafb' : '#fff' }}>
                  {/* Day gridlines */}
                  {days.map((_, i) => (
                    <div key={i} style={{ position: 'absolute', left: `${(i / totalDays) * 100}%`, top: 0, bottom: 0, width: 1, background: '#e5e7eb' }} />
                  ))}
                  {/* Today line */}
                  <div style={{ position: 'absolute', left: `${todayOffset}%`, top: 0, bottom: 0, width: 2, background: '#ef4444', zIndex: 3, opacity: 0.6 }} />
                  {/* Bars */}
                  {machineBars.map((bar, bi) => {
                    const left = pct(bar.startMs);
                    const width = Math.max(((bar.endMs - bar.startMs) / spanMs) * 100, 1.5);
                    return (
                      <div
                        key={bi}
                        onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, text: bar.tooltip })}
                        onMouseLeave={() => setTooltip(null)}
                        style={{
                          position: 'absolute', top: 4, height: ROW_HEIGHT - 8,
                          left: `${left}%`, width: `${width}%`, minWidth: 6,
                          background: bar.color, borderRadius: 4,
                          border: `1px solid ${bar.color}88`,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 4px',
                          fontSize: 10, color: '#fff', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap',
                          transition: 'opacity 0.15s', zIndex: 2,
                        }}
                      >
                        {width > 5 ? `${bar.operationCode ?? bar.workOrderId ?? ''} ${bar.utilization}%` : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {machines.length === 0 && !loading && (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No load lines found in this plan.</div>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, padding: '8px 16px', borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280' }}>
          <span>Legend:</span>
          {[{ label: '< 50%', color: '#9ca3af' }, { label: '50–80%', color: '#3b82f6' }, { label: '80–95%', color: '#f59e0b' }, { label: '> 95%', color: '#ef4444' }].map((l) => (
            <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: 'inline-block' }} />{l.label}</span>
          ))}
          <span style={{ marginLeft: 'auto' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', display: 'inline-block', opacity: 0.6 }} /> Today</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{ position: 'fixed', left: tooltip.x + 10, top: tooltip.y - 30, background: '#111827', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 100 }}>
          {tooltip.text}
        </div>
      )}
    </>
  );
}
