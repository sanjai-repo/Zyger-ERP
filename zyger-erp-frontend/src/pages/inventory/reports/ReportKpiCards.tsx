import { KPI_CARDS, type KpiCardConfig } from './reportsConfig';
import type { ReportsOverviewKpis } from '../../../types/inventory/reports.types';
import { formatCurrency, formatNumber } from '../../../utils/format';

interface ReportKpiCardsProps {
  kpis?: ReportsOverviewKpis;
  onCardClick: (card: KpiCardConfig) => void;
}

export default function ReportKpiCards({
  kpis,
  onCardClick,
}: ReportKpiCardsProps) {
  const valueFor = (card: KpiCardConfig): string => {
    const raw = (kpis as Record<string, number> | undefined)?.[card.key] ?? 0;

    return card.format === 'money' ? formatCurrency(raw) : formatNumber(raw);
  };

  return (
    <div className="stats">
      {KPI_CARDS.map((card) => (
        <div
          key={card.key}
          className="stat clickable"
          onClick={() => onCardClick(card)}
          title={`Open ${card.label} details`}
        >
          <div className="ic" style={{ background: card.color }}>
            <span className="material-symbols-rounded">{card.icon}</span>
          </div>

          <div>
            <div className="l">{card.label}</div>
            <div className="v">{kpis ? valueFor(card) : '—'}</div>
            <div className="s">Click for details</div>
          </div>
        </div>
      ))}
    </div>
  );
}