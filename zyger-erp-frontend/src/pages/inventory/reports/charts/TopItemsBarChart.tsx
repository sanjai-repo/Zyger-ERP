import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TopItemBar } from '../../../../types/inventory/reports.types';

interface TopItemsBarChartProps {
  data: TopItemBar[];
}

export default function TopItemsBarChart({ data }: TopItemsBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="itemCode"
          width={110}
          tick={{ fontSize: 11 }}
        />
        <Tooltip />
        <Bar dataKey="value" name="Value (₹)" fill="#7367f0" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}