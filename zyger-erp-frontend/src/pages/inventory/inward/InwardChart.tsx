import { INWARD_TYPE_LIST } from '../../../config/inwardConfig';
import type { InwardChartPoint } from '../../../types/inward.types';
import { formatDate } from '../../../utils/format';

interface InwardChartProps {
  data?: InwardChartPoint[];
}

export default function InwardChart({ data }: InwardChartProps) {
  const points = data ?? [];

  const maxValue = Math.max(
    1,
    ...points.flatMap((point) =>
      INWARD_TYPE_LIST.map((config) => Number(point[config.type] ?? 0))
    )
  );

  if (points.length === 0) {
    return (
      <div className="chart-wrap">
        <div className="chart-empty">No inward data for the selected period.</div>
      </div>
    );
  }

  return (
    <>
      <div className="chart-wrap">
        <div className="chart-bars">
          {points.map((point) => (
            <div className="chart-col" key={point.date}>
              <div className="chart-group">
                {INWARD_TYPE_LIST.map((config) => {
                  const value = Number(point[config.type] ?? 0);
                  const height = Math.round((value / maxValue) * 100);

                  return (
                    <div
                      key={config.type}
                      className="chart-bar"
                      title={`${config.label}: ${value}`}
                      style={{
                        height: `${height}%`,
                        background: config.color,
                        opacity: value > 0 ? 1 : 0.15,
                      }}
                    />
                  );
                })}
              </div>
              <div className="chart-date">{formatDate(point.date)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-legend">
        {INWARD_TYPE_LIST.map((config) => (
          <span key={config.type}>
            <span className="dot" style={{ background: config.color }} />
            {config.label}
          </span>
        ))}
      </div>
    </>
  );
}