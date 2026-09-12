import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { CategorySlice } from '../../../../types/inventory/reports.types';

const COLORS = ['#007bd6', '#ff9f43', '#ea5455', '#7367f0', '#28c76f', '#1b2433'];

interface CategoryDonutProps {
  data: CategorySlice[];
}

export default function CategoryDonut({ data }: CategoryDonutProps) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0) || 1;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="category"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          label={(props: any) =>
            `${props.name} ${Math.round((props.value / total) * 100)}%`
          }
        >
          {data.map((slice, index) => (
            <Cell key={slice.category} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}