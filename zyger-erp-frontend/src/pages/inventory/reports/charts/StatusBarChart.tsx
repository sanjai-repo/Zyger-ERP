import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyStatusPoint } from '../../../../types/inventory/reports.types';

interface StatusBarChartProps {
  data: MonthlyStatusPoint[];
}

export default function StatusBarChart({ data }: StatusBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="received" name="Received" fill="#28c76f" radius={[3, 3, 0, 0]} />
        <Bar dataKey="onHand" name="On Hand" fill="#a3c240" radius={[3, 3, 0, 0]} />
        <Bar dataKey="issued" name="Issued" fill="#0f7b5f" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}