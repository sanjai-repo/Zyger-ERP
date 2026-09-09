import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';
import { exportToCsv } from '../utils/csvExport';

interface Oee {
  id: number;
  machineCode: string;
  oeeDate: string;
  plannedTimeMin: number;
  runTimeMin: number;
  downtimeMin: number;
  goodQty: number;
  totalQty: number;
  availability: number;
  performance: number;
  qualityRate: number;
  oee: number;
}

interface MachineOption { code: string; name: string; }

export default function OeePage() {
  const { toast } = useToast();
  const { can } = useAuth();
  const [data, setData] = useState<Oee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [form, setForm] = useState({
    machineCode: '',
    oeeDate: new Date().toISOString().slice(0, 10),
    plannedTimeMin: '',
    runTimeMin: '',
    downtimeMin: '',
    goodQty: '',
    totalQty: '',
    idealCycleTimeSec: '',
  });
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows } = await axiosClient.get('/oee', { params: { from: fromDate, to: toDate } });
      setData(Array.isArray(rows) ? rows : []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    axiosClient.get('/master/machines', { params: { size: 200 } })
      .then(({ data: rows }) => setMachines((rows?.content ?? rows ?? []).filter((m: any) => m.active !== false).map((m: any) => ({ code: m.machineCode ?? m.code ?? '', name: m.description ?? m.name ?? '' }))))
      .catch(() => {});
  }, []);

  const save = async () => {
    if (!form.machineCode) { toast('Machine Code is required.', 'error'); return; }
    try {
      await axiosClient.post('/oee', {
        machineCode: form.machineCode,
        oeeDate: form.oeeDate,
        plannedTimeMin: Number(form.plannedTimeMin) || 0,
        runTimeMin: Number(form.runTimeMin) || 0,
        downtimeMin: Number(form.downtimeMin) || 0,
        goodQty: Number(form.goodQty) || 0,
        totalQty: Number(form.totalQty) || 0,
        idealCycleTimeSec: Number(form.idealCycleTimeSec) || 72,
      });
      toast('OEE logged.');
      setForm({ machineCode: '', oeeDate: new Date().toISOString().slice(0, 10), plannedTimeMin: '', runTimeMin: '', downtimeMin: '', goodQty: '', totalQty: '', idealCycleTimeSec: '' });
      setShowForm(false);
      load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
  };

  const fmt = (v: number | null) => v != null ? (v * 100).toFixed(1) + '%' : '-';

  const avgOee = data.length > 0 ? data.reduce((s, d) => s + (d.oee ?? 0), 0) / data.length : 0;
  const avgAvail = data.length > 0 ? data.reduce((s, d) => s + (d.availability ?? 0), 0) / data.length : 0;
  const avgPerf = data.length > 0 ? data.reduce((s, d) => s + (d.performance ?? 0), 0) / data.length : 0;
  const avgQual = data.length > 0 ? data.reduce((s, d) => s + (d.qualityRate ?? 0), 0) / data.length : 0;

  return (
    <>
      <div className="pg-head"><h1>OEE Dashboard</h1><p>Overall Equipment Effectiveness by machine</p></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Availability', value: fmt(avgAvail), ok: avgAvail >= 0.85 },
          { label: 'Performance', value: fmt(avgPerf), ok: avgPerf >= 0.85 },
          { label: 'Quality', value: fmt(avgQual), ok: avgQual >= 0.95 },
          { label: 'OEE', value: fmt(avgOee), ok: avgOee >= 0.65 },
        ].map((kpi) => (
          <div key={kpi.label} className="panel" style={{ textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.ok ? '#22c55e' : '#ef4444' }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{data.length} records</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="toolbar">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>From</label>
            <input className="in" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: 140 }} />
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>To</label>
            <input className="in" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: 140 }} />
          </div>
          <button className="ibtn" title="Export CSV" onClick={() => exportToCsv(data as unknown as Record<string, unknown>[], [
            { key: 'machineCode', label: 'Machine' },
            { key: 'oeeDate', label: 'Date' },
            { key: 'plannedTimeMin', label: 'Planned Min' },
            { key: 'runTimeMin', label: 'Run Min' },
            { key: 'downtimeMin', label: 'Downtime Min' },
            { key: 'goodQty', label: 'Good Qty' },
            { key: 'totalQty', label: 'Total Qty' },
            { key: 'availability', label: 'Availability' },
            { key: 'performance', label: 'Performance' },
            { key: 'qualityRate', label: 'Quality' },
            { key: 'oee', label: 'OEE' },
          ], 'oee')}><span className="material-symbols-rounded">download</span></button>
          {can('production', 'Edit') && <button className="btn btn-p" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Log OEE'}</button>}
        </div>

        {showForm && (
          <div style={{ padding: 16, background: 'var(--blue-bg, #f0f7ff)', borderRadius: 8, marginBottom: 12, border: '1px solid var(--blue-border, #bfdbfe)' }}>
            <div className="fgrid">
              <label className="fld"><span>Machine *</span>
                <select className="in" value={form.machineCode} onChange={(e) => setForm({ ...form, machineCode: e.target.value })}>
                  <option value="">Select machine...</option>
                  {machines.map((m) => <option key={m.code} value={m.code}>{m.code} - {m.name}</option>)}
                </select>
              </label>
              <label className="fld"><span>Date</span><input className="in" type="date" value={form.oeeDate} onChange={(e) => setForm({ ...form, oeeDate: e.target.value })} /></label>
              <label className="fld"><span>Planned (min)</span><input className="in" type="number" placeholder="e.g. 480" value={form.plannedTimeMin} onChange={(e) => setForm({ ...form, plannedTimeMin: e.target.value })} /></label>
              <label className="fld"><span>Run (min)</span><input className="in" type="number" placeholder="e.g. 420" value={form.runTimeMin} onChange={(e) => setForm({ ...form, runTimeMin: e.target.value })} /></label>
              <label className="fld"><span>Downtime (min)</span><input className="in" type="number" placeholder="e.g. 60" value={form.downtimeMin} onChange={(e) => setForm({ ...form, downtimeMin: e.target.value })} /></label>
              <label className="fld"><span>Good Qty</span><input className="in" type="number" value={form.goodQty} onChange={(e) => setForm({ ...form, goodQty: e.target.value })} /></label>
              <label className="fld"><span>Total Qty</span><input className="in" type="number" value={form.totalQty} onChange={(e) => setForm({ ...form, totalQty: e.target.value })} /></label>
              <label className="fld"><span>Ideal Cycle (sec)</span><input className="in" type="number" step="0.01" value={form.idealCycleTimeSec} onChange={(e) => setForm({ ...form, idealCycleTimeSec: e.target.value })} /></label>
            </div>
            <div className="actbar">
              <button className="btn btn-p" onClick={save}>Save OEE</button>
            </div>
          </div>
        )}

        <div className="twrap">
          {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
            <table className="tbl">
              <thead><tr><th className="num">S.No</th><th>Machine</th><th>Date</th><th>Planned</th><th>Run</th><th>Down</th><th>Good</th><th>Total</th><th>Availability</th><th>Performance</th><th>Quality</th><th>OEE</th></tr></thead>
              <tbody>
                {data.length === 0 ? <tr><td colSpan={12}><div className="empty"><span className="material-symbols-rounded">precision_manufacturing</span> No OEE data for selected period.</div></td></tr> : data.map((o, idx) => (
                  <tr key={o.id}>
                    <td className="num mut">{idx + 1}</td>
                    <td><b>{o.machineCode}</b></td>
                    <td>{o.oeeDate}</td>
                    <td>{o.plannedTimeMin}m</td>
                    <td>{o.runTimeMin}m</td>
                    <td style={{ color: o.downtimeMin > 0 ? '#ef4444' : undefined }}>{o.downtimeMin}m</td>
                    <td style={{ color: '#22c55e' }}>{o.goodQty}</td>
                    <td>{o.totalQty}</td>
                    <td style={{ color: (o.availability ?? 0) >= 0.85 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{fmt(o.availability)}</td>
                    <td style={{ color: (o.performance ?? 0) >= 0.85 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{fmt(o.performance)}</td>
                    <td style={{ color: (o.qualityRate ?? 0) >= 0.95 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{fmt(o.qualityRate)}</td>
                    <td style={{ fontWeight: 700, color: (o.oee ?? 0) >= 0.65 ? '#22c55e' : '#ef4444', fontSize: 15 }}>{fmt(o.oee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
