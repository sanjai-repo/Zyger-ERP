import type { DrilldownRow } from '../../../types/inventory/reports.types';
import { formatNumber, toNumber } from '../../../utils/format';
import {
  classifyStock,
  reorderThreshold,
  suggestedOrderQty,
  type ReorderStatus,
} from '../../../utils/stockLevels';

const SHOW_COUNT = 5;
const SHOW_SOON_COUNT = 3;

interface LowStockAlertPanelProps {
  items: DrilldownRow[];
  soonItems: DrilldownRow[];
  isLoading: boolean;
  onCreateRequest: (itemCode: string, itemName: string, suggestedQty: number) => void;
  onViewAll: () => void;
}

function toRow(row: DrilldownRow) {
  const onHand = toNumber(row.onHandQty as string | number | null | undefined);
  const threshold = reorderThreshold({
    reorderPoint: row.reorderPoint,
    safetyStock: row.safetyStock,
    safetyQty: row.safetyQty,
  });
  const status = classifyStock(row);

  return {
    itemCode: String(row.itemCode ?? ''),
    itemName: String(row.itemName ?? row.itemCode ?? ''),
    uom: String(row.uom ?? ''),
    onHand,
    threshold,
    deficit: Math.max(0, threshold - onHand),
    suggestedQty: suggestedOrderQty(row),
    status,
  };
}

function sortRows(rows: ReturnType<typeof toRow>[]) {
  const rank: Record<ReorderStatus, number> = {
    OUT_OF_STOCK: 0,
    PURCHASE_NOW: 1,
    REORDER_SOON: 2,
    OK: 3,
  };
  return rows.sort((a, b) => {
    const r = rank[a.status] - rank[b.status];
    if (r !== 0) return r;
    return b.deficit - a.deficit;
  });
}

export default function LowStockAlertPanel({
  items,
  soonItems,
  isLoading,
  onCreateRequest,
  onViewAll,
}: LowStockAlertPanelProps) {
  const rows = sortRows(items.map(toRow));
  const soonRows = sortRows(soonItems.map(toRow));

  const topRows = rows.slice(0, SHOW_COUNT);
  const topSoonRows = soonRows.slice(0, SHOW_SOON_COUNT);

  return (
    <div className="panel" style={{ borderLeft: '4px solid var(--red)' }}>
      <div className="panel-h">
        <h2>
          <span className="material-symbols-rounded" style={{ color: 'var(--red)' }}>
            warning
          </span>
          Low Stock Alert — Action Needed
        </h2>
        {rows.length > 0 && (
          <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
            {Math.min(SHOW_COUNT, rows.length)} of {rows.length} shown
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          padding: '9px 16px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          OK
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--yellow)', display: 'inline-block' }} />
          Reorder Soon
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
          Purchase Now
        </span>
      </div>

      {isLoading ? (
        <div className="empty">
          <span className="material-symbols-rounded">hourglass_empty</span>
          Loading low stock items...
        </div>
      ) : topRows.length === 0 && topSoonRows.length === 0 ? (
        <div className="empty">
          <span className="material-symbols-rounded" style={{ color: 'var(--green)' }}>
            check_circle
          </span>
          All items are above their reorder level.
        </div>
      ) : (
        <>
          {topRows.map((row) => (
            <div
              key={row.itemCode}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr .8fr .8fr .9fr 1.2fr auto',
                gap: '10px',
                alignItems: 'center',
                padding: '11px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--red-bg, #fdecec)',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{row.itemName}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                  {row.itemCode}
                </div>
              </div>
              <div style={{ fontSize: '12px' }}>
                On Hand
                <b style={{ display: 'block', fontSize: '14px', color: 'var(--red)' }}>
                  {formatNumber(row.onHand)}
                </b>
              </div>
              <div style={{ fontSize: '12px' }}>
                Reorder At
                <b style={{ display: 'block', fontSize: '14px' }}>{formatNumber(row.threshold)}</b>
              </div>
              <div style={{ fontSize: '12px' }}>
                Suggested Order
                <b style={{ display: 'block', fontSize: '14px' }}>{formatNumber(row.suggestedQty)}</b>
              </div>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--red)' }}>
                {row.status === 'OUT_OF_STOCK'
                  ? '🔴 Out of stock — purchase immediately'
                  : '🔴 Stock is low. Please purchase this item.'}
              </div>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff', whiteSpace: 'nowrap' }}
                onClick={() => onCreateRequest(row.itemCode, row.itemName, row.suggestedQty)}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                  add_shopping_cart
                </span>
                Create Request
              </button>
            </div>
          ))}

          {topSoonRows.map((row) => (
            <div
              key={row.itemCode}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr .8fr .8fr .9fr 1.2fr auto',
                gap: '10px',
                alignItems: 'center',
                padding: '11px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--yellow-bg, #fdf3dc)',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{row.itemName}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                  {row.itemCode}
                </div>
              </div>
              <div style={{ fontSize: '12px' }}>
                On Hand
                <b style={{ display: 'block', fontSize: '14px' }}>{formatNumber(row.onHand)}</b>
              </div>
              <div style={{ fontSize: '12px' }}>
                Reorder At
                <b style={{ display: 'block', fontSize: '14px' }}>{formatNumber(row.threshold)}</b>
              </div>
              <div style={{ fontSize: '12px' }}>
                Buffer
                <b style={{ display: 'block', fontSize: '14px' }}>
                  {row.threshold > 0 ? `${formatNumber(((row.onHand - row.threshold) / row.threshold) * 100)}%` : '—'}
                </b>
              </div>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#a06a00' }}>
                🟡 Getting close to reorder level — plan a purchase soon
              </div>
              <button
                type="button"
                className="btn"
                style={{ whiteSpace: 'nowrap' }}
                disabled
                title="Not below reorder level yet — no purchase request needed"
              >
                Watch
              </button>
            </div>
          ))}

          {rows.length > SHOW_COUNT && (
            <div
              onClick={onViewAll}
              style={{
                textAlign: 'center',
                padding: '10px',
                fontSize: '12.5px',
                color: 'var(--blue)',
                fontWeight: 600,
                background: 'var(--surface)',
                cursor: 'pointer',
              }}
            >
              View all {rows.length} low-stock items →
            </div>
          )}
        </>
      )}
    </div>
  );
}
