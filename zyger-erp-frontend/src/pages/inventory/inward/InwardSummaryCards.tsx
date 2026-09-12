import { INWARD_TYPE_LIST, type InwardType } from '../../../config/inwardConfig';
import type { InwardDashboardSummary } from '../../../types/inward.types';
import { formatMoney, formatNumber } from '../../../utils/format';

interface InwardSummaryCardsProps {
  summary?: InwardDashboardSummary;
  activeType: InwardType | 'ALL' | null;
  onSelectType: (type: InwardType | 'ALL') => void;
  onOpenPending?: () => void;
}

export default function InwardSummaryCards({
  summary,
  activeType,
  onSelectType,
  onOpenPending,
}: InwardSummaryCardsProps) {
  const total = summary?.total ?? { count: 0, qty: 0, amount: 0 };
  const pending = summary?.pending ?? { count: 0, qty: 0, amount: 0 };

  return (
    <div className="inward-cards">
      {/* Hero: Total Inward, with each type's share of the total as a single split bar —
          the four colors below reappear on their own cards so the bar reads as a legend too. */}
      <div
        className={`inward-hero ${activeType === 'ALL' ? 'is-active' : ''}`}
        onClick={() => onSelectType('ALL')}
        role="button"
        tabIndex={0}
      >
        <div className="inward-hero-ic">
          <span className="material-symbols-rounded">inventory</span>
        </div>
        <div className="inward-hero-body">
          <div className="inward-hero-top">
            <span className="inward-hero-label">Total Inward</span>
            <span className="inward-hero-value">{formatNumber(total.count)}</span>
            <span className="inward-hero-sub">
              Qty {formatNumber(total.qty)} &nbsp;•&nbsp; {formatMoney(total.amount)}
            </span>
          </div>
          <div className="inward-split" aria-hidden="true">
            {INWARD_TYPE_LIST.map((config) => {
              const value = summary?.byType?.[config.type]?.count ?? 0;
              const pct = total.count > 0 ? (value / total.count) * 100 : 0;
              return pct > 0 ? (
                <span
                  key={config.type}
                  className="inward-split-seg"
                  style={{ width: `${pct}%`, background: config.color }}
                  title={`${config.label}: ${formatNumber(value)}`}
                />
              ) : null;
            })}
            {total.count === 0 && <span className="inward-split-seg empty" style={{ width: '100%' }} />}
          </div>
        </div>
      </div>

      <div className="inward-cards-grid">
        <div
          className={`inward-card is-pending ${pending.count > 0 ? 'needs-action' : ''}`}
          onClick={() => onOpenPending?.()}
          title="Open pending inward documents"
          role="button"
          tabIndex={0}
        >
          {pending.count > 0 && <span className="inward-card-flag">Needs action</span>}
          <div className="inward-card-ic pending">
            <span className="material-symbols-rounded">hourglass_top</span>
          </div>
          <div className="inward-card-label">Pending Approval</div>
          <div className="inward-card-value">{formatNumber(pending.count)}</div>
          <div className="inward-card-sub">
            Qty {formatNumber(pending.qty)} • {formatMoney(pending.amount)}
          </div>
        </div>

        {INWARD_TYPE_LIST.map((config) => {
          const value = summary?.byType?.[config.type] ?? { count: 0, qty: 0, amount: 0 };
          const share = total.count > 0 ? Math.round((value.count / total.count) * 100) : 0;

          return (
            <div
              key={config.type}
              className={`inward-card ${activeType === config.type ? 'is-active' : ''}`}
              onClick={() => onSelectType(config.type)}
              role="button"
              tabIndex={0}
            >
              <div className="inward-card-ic" style={{ background: config.color }}>
                <span className="material-symbols-rounded">{config.icon}</span>
              </div>
              <div className="inward-card-label">{config.label}</div>
              <div className="inward-card-value">{formatNumber(value.count)}</div>
              <div className="inward-card-sub">
                Qty {formatNumber(value.qty)} • {formatMoney(value.amount)}
              </div>
              <div className="inward-card-share">{share}% of total</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
