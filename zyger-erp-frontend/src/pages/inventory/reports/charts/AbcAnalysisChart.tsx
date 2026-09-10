import { formatCurrency, formatNumber } from '../../../../utils/format';
import type { AbcTier } from '../../../../types/inventory/reports.types';

const TIER_COLOR: Record<AbcTier['tier'], string> = {
  A: '#28c76f',
  B: '#ff9f43',
  C: '#ea5455',
};

const TIER_LABEL: Record<AbcTier['tier'], string> = {
  A: 'A — high value',
  B: 'B — medium value',
  C: 'C — low value',
};

interface AbcAnalysisChartProps {
  data: AbcTier[];
}

/** Single stacked horizontal bar, segments sized by % of total stock value —
 * the shape the spec calls for over a 3-slice pie, since it reads correctly
 * with "% of total value" as a second dimension per segment. */
export default function AbcAnalysisChart({ data }: AbcAnalysisChartProps) {
  const totalValue = data.reduce((sum, tier) => sum + tier.value, 0);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          height: 34,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        {data.map((tier) => (
          <div
            key={tier.tier}
            title={`${TIER_LABEL[tier.tier]}: ${tier.itemCount} items, ${formatCurrency(tier.value)} (${tier.valuePct}%)`}
            style={{
              width: `${Math.max(tier.valuePct, tier.valuePct > 0 ? 4 : 0)}%`,
              background: TIER_COLOR[tier.tier],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {tier.valuePct >= 8 ? `${tier.tier} ${tier.valuePct}%` : ''}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        {data.map((tier) => (
          <div key={tier.tier} style={{ fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: TIER_COLOR[tier.tier],
                  display: 'inline-block',
                }}
              />
              {TIER_LABEL[tier.tier]}
            </div>
            <div className="mut" style={{ marginTop: 2 }}>
              {formatNumber(tier.itemCount)} items · {formatCurrency(tier.value)} ({tier.valuePct}%
              {totalValue === 0 ? ', no stock value yet' : ''})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
