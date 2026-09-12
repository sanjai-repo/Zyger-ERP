import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from 'recharts';

interface AccuracyGaugeProps {
  value: number;
}

export default function AccuracyGauge({ value }: AccuracyGaugeProps) {
  const data = [{ name: 'Accuracy', value }];

  const color =
    value >= 95 ? '#28c76f' : value >= 90 ? '#ff9f43' : '#ea5455';

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={220}>
        <RadialBarChart
          data={data}
          innerRadius="70%"
          outerRadius="100%"
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            dataKey="value"
            background
            cornerRadius={10}
            fill={color}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 10,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{value}%</div>
        <div className="mut">of items above reorder level</div>
      </div>
    </div>
  );
}