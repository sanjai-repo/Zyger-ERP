import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LocationBar } from '../../../../types/inventory/reports.types';
import { useStoreNames } from '../../../../hooks/useStoreNames';

interface LocationBarChartProps {
  data: LocationBar[];
}

export default function LocationBarChart({ data }: LocationBarChartProps) {
  const { storeName } = useStoreNames();
  const named = data.map((d) => ({ ...d, location: storeName(String(d.location)) || String(d.location) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={named} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="location" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="onHand" name="On Hand" fill="#007bd6" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}