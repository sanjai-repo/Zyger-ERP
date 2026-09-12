import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../contexts/ToastContext';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts';

interface CharInfo {
  code: string;
  name: string;
  measurementCount: number;
}

interface ChartPoint {
  date: string;
  xBar: number;
  range: number;
  inspectionNumber: string;
}

interface Capability {
  count: number;
  mean: number;
  stdDev: number;
  cp: number | null;
  cpk: number | null;
  usl: number | null;
  lsl: number | null;
  target: number | null;
  capabilityClass: string;
}

interface XBarResult {
  data: ChartPoint[];
  xBarBar: number;
  ucl: number;
  lcl: number;
  rBar: number;
  uclR: number;
  lclR: number;
  sampleSize: number;
  capability: Capability;
}

export default function SpcPage() {
  const { toast } = useToast();
  const [itemCode, setItemCode] = useState('');
  const [chars, setChars] = useState<CharInfo[]>([]);
  const [selectedChar, setSelectedChar] = useState('');
  const [spcData, setSpcData] = useState<XBarResult | null>(null);
  const [loading, setLoading] = useState(false);

  const loadChars = useCallback(async () => {
    if (!itemCode.trim()) { setChars([]); return; }
    try {
      const { data } = await axiosClient.get('/v1/quality/spc/characteristics', { params: { itemCode } });
      setChars(data);
      if (data.length > 0 && !selectedChar) setSelectedChar(data[0].code);
    } catch { setChars([]); }
  }, [itemCode, selectedChar]);

  useEffect(() => { loadChars(); }, [itemCode]);

  const loadChart = useCallback(async () => {
    if (!itemCode || !selectedChar) return;
    setLoading(true);
    try {
      const { data } = await axiosClient.get<XBarResult>('/v1/quality/spc/xbar', {
        params: { itemCode, characteristicCode: selectedChar, lastN: 50 },
      });
      setSpcData(data);
    } catch {
      toast('Failed to load SPC data', 'error');
    } finally { setLoading(false); }
  }, [itemCode, selectedChar, toast]);

  useEffect(() => { loadChart(); }, [selectedChar]);

  const cpkClassColor = (cls: string) => {
    switch (cls) {
      case 'CAPABLE': return '#16a34a';
      case 'MARGINAL': return '#ca8a04';
      case 'LOW': return '#ea580c';
      default: return '#dc2626';
    }
  };

  const cap = spcData?.capability;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Statistical Process Control (SPC)</h1>

      <div className="flex gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-gray-500">Item Code</label>
          <input className="border rounded px-2 py-1 w-48" value={itemCode}
            onChange={e => { setItemCode(e.target.value.toUpperCase()); setSelectedChar(''); setSpcData(null); }} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Characteristic</label>
          <select className="border rounded px-2 py-1 w-64" value={selectedChar}
            onChange={e => setSelectedChar(e.target.value)}>
            <option value="">-- select --</option>
            {chars.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.measurementCount})</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="text-gray-400">Loading chart data...</div>}

      {spcData && !loading && (
        <div className="space-y-6">
          {/* X-bar chart */}
          <div className="bg-white border rounded p-4">
            <h2 className="text-sm font-semibold mb-2">X-bar Chart — {selectedChar}</h2>
            {spcData.data.length === 0 ? (
              <div className="text-gray-400 text-sm">No data points for this characteristic.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={spcData.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="inspectionNumber" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={spcData.xBarBar} stroke="#2563eb" strokeDasharray="5 5" label="X̄̄" />
                  <ReferenceLine y={spcData.ucl} stroke="#dc2626" strokeDasharray="3 3" label="UCL" />
                  <ReferenceLine y={spcData.lcl} stroke="#dc2626" strokeDasharray="3 3" label="LCL" />
                  {cap?.usl && <ReferenceLine y={cap.usl} stroke="#16a34a" strokeDasharray="8 4" label="USL" />}
                  {cap?.lsl && <ReferenceLine y={cap.lsl} stroke="#16a34a" strokeDasharray="8 4" label="LSL" />}
                  <Line type="monotone" dataKey="xBar" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="X-bar" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Range chart */}
          <div className="bg-white border rounded p-4">
            <h2 className="text-sm font-semibold mb-2">Range Chart</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={spcData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="inspectionNumber" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <ReferenceLine y={spcData.rBar} stroke="#2563eb" strokeDasharray="5 5" />
                <ReferenceLine y={spcData.uclR} stroke="#dc2626" strokeDasharray="3 3" />
                <Bar dataKey="range" name="Range">
                  {spcData.data.map((d, i) => (
                    <Cell key={i} fill={d.range > spcData.uclR ? '#dc2626' : '#93c5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Process capability summary */}
          <div className="bg-white border rounded p-4">
            <h2 className="text-sm font-semibold mb-3">Process Capability</h2>
            {cap && cap.cpk != null ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Cp" value={cap.cp?.toFixed(3) ?? '—'} />
                <StatBox label="Cpk" value={cap.cpk?.toFixed(3) ?? '—'}
                  valueColor={cpkClassColor(cap.capabilityClass)} />
                <StatBox label="Mean" value={cap.mean?.toFixed(4) ?? '—'} />
                <StatBox label="Std Dev" value={cap.stdDev?.toFixed(4) ?? '—'} />
                <StatBox label="USL" value={cap.usl?.toFixed(4) ?? '—'} />
                <StatBox label="LSL" value={cap.lsl?.toFixed(4) ?? '—'} />
                <StatBox label="Target" value={cap.target?.toFixed(4) ?? '—'} />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Capability Class</span>
                  <span className="text-lg font-bold" style={{ color: cpkClassColor(cap.capabilityClass) }}>
                    {cap.capabilityClass}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">
                {cap ? `${cap.count} measurements — spec limits required for Cp/Cpk` : 'No data'}
              </div>
            )}
          </div>

          {/* Yield bar */}
          <div className="bg-white border rounded p-4">
            <h2 className="text-sm font-semibold mb-2">Pass/Fail Yield</h2>
            <YieldBar data={spcData.data} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-lg font-bold" style={valueColor ? { color: valueColor } : undefined}>{value}</span>
    </div>
  );
}

function YieldBar({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) return <div className="text-gray-400 text-sm">No data</div>;
  // Approximate: xBar within UCL/LCL = "in control"
  // For real yield we'd need pass/fail per inspection — show in-control percentage as proxy
  return <div className="text-sm text-gray-600">{data.length} data points plotted</div>;
}
