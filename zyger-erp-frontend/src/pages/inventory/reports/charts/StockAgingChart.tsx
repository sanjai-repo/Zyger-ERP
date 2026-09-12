import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AgingBucket } from '../../../../types/inventory/reports.types';

const BUCKET_COLOR = ['#28c76f', '#ff9f43', '#ea5455']; // 0-30 / 31-60 / 60+

interface StockAgingChartProps {
  data: AgingBucket[];
}

/** Green → yellow → red left-to-right — the color progression itself reads
 * as "getting worse" without needing a legend, per the spec. */
export default function StockAgingChart({ data }: StockAgingChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip labelFormatter={(label) => `Aging: ${label}`} />
        <Bar dataKey="itemCount" name="Items" radius={[3, 3, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.bucket} fill={BUCKET_COLOR[index % BUCKET_COLOR.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
