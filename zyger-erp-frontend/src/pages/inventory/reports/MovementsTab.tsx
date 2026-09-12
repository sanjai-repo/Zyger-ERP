import type { MovementSummary } from '../../../types/inventory/reports.types';
import { formatNumber } from '../../../utils/format';
import { IN_TX_TYPES, OUT_TX_TYPES, txMovementLabel } from './movementLabels';

function lineList(
  summary: MovementSummary | undefined,
  order: readonly string[]
): Array<{ type: string; label: string; count: number; qty: number }> {
  const byType = summary?.byType ?? {};
  return order
    .filter((type) => byType[type])
    .map((type) => ({
      type,
      label: txMovementLabel(type),
      count: byType[type].count,
      qty: byType[type].qty,
    }));
}

function MovementCard({
  title,
  icon,
  color,
  summary,
  kind,
}: {
  title: string;
  icon: string;
  color: string;
  summary: MovementSummary | undefined;
  kind: 'in' | 'out';
}) {
  const totalQty = summary?.qty ?? 0;
  const order = kind === 'in' ? IN_TX_TYPES : OUT_TX_TYPES;
  const rows = lineList(summary, order);
  const totalRowCount = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="panel">
      <div className="panel-h">
        <h2>
          <span
            className="material-symbols-rounded"
            style={{ color, fontWeight: 700 }}
          >
            {icon}
          </span>
          {title}
        </h2>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{formatNumber(totalQty)}</div>
          <div className="mut" style={{ fontSize: 12 }}>
            {formatNumber(totalRowCount)} transaction{totalRowCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>
      {rows.length > 0 ? (
        <div className="twrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Movement</th>
                <th className="num">Transactions</th>
                <th className="num">Qty</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.type}>
                  <td>{row.label}</td>
                  <td className="num">{formatNumber(row.count)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>
                    {formatNumber(row.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <span className="material-symbols-rounded">inbox</span>
          Nothing moved in this period.
        </div>
      )}
    </div>
  );
}

export default function MovementsTab({
  received,
  issued,
  receivedToday,
  issuedToday,
}: {
  received: MovementSummary | undefined;
  issued: MovementSummary | undefined;
  receivedToday: MovementSummary | undefined;
  issuedToday: MovementSummary | undefined;
}) {
  const periodIn = received?.qty ?? 0;
  const periodOut = issued?.qty ?? 0;
  const todayIn = receivedToday?.qty ?? 0;
  const todayOut = issuedToday?.qty ?? 0;
  const net = periodIn - periodOut;

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="ic" style={{ background: 'var(--green)' }}>
            <span className="material-symbols-rounded">call_received</span>
          </div>
          <div>
            <div className="l">Received Today</div>
            <div className="v">{formatNumber(todayIn)}</div>
            <div className="s">Goods that came into the store today</div>
          </div>
        </div>

        <div className="stat">
          <div className="ic" style={{ background: 'var(--blue)' }}>
            <span className="material-symbols-rounded">call_made</span>
          </div>
          <div>
            <div className="l">Issued Today</div>
            <div className="v">{formatNumber(todayOut)}</div>
            <div className="s">Goods sent out of the store today</div>
          </div>
        </div>

        <div
          className="stat"
          style={{
            borderLeft: `5px solid ${net >= 0 ? 'var(--green)' : 'var(--red)'}`,
          }}
        >
          <div
            className="ic"
            style={{ background: net >= 0 ? 'var(--green)' : 'var(--red)' }}
          >
            <span className="material-symbols-rounded">
              {net >= 0 ? 'trending_up' : 'trending_down'}
            </span>
          </div>
          <div>
            <div className="l">Net Change (period)</div>
            <div className="v">
              {net >= 0 ? '+' : ''}
              {formatNumber(net)}
            </div>
            <div className="s">
              Received minus issued = stock went {net >= 0 ? 'up' : 'down'}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 14,
        }}
      >
        <MovementCard
          title={`Received — ${formatNumber(periodIn)}`}
          icon="arrow_downward"
          color="var(--green)"
          summary={received}
          kind="in"
        />
        <MovementCard
          title={`Issued — ${formatNumber(periodOut)}`}
          icon="arrow_upward"
          color="var(--blue)"
          summary={issued}
          kind="out"
        />
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>
            <span className="material-symbols-rounded">rule</span>
            How to read this
          </h2>
        </div>
        <div style={{ padding: 4, fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
          <p>
            <strong>Received</strong> = every time goods came into a store (purchase orders, job
            inwards, general inward, DC / invoice / stock returns, finished-goods receipts,
            transfers in).
          </p>
          <p>
            <strong>Issued</strong> = every time goods left a store (raw material issue, job DC,
            sales DC, general DC, stock release, purchase return, production consumption).
          </p>
          <p>
            <strong>Net change</strong> = received − issued for the selected period. A&nbsp;positive
            number means stores ended richer than they started; a&nbsp;negative number means stock
            was consumed more than it was replaced.
          </p>
        </div>
      </div>
    </>
  );
}