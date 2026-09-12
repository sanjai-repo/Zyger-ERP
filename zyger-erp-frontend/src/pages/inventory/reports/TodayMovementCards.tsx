import { useQuery } from '@tanstack/react-query';
import { inventoryReportsService } from '../../../services/inventoryReportsService';
import { formatNumber } from '../../../utils/format';

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Received Today / Issued Today — uses the backend movement summary, which
 * counts only physical stock in/out transactions (no QC/status moves or
 * reversals), so the numbers match the ledger balance. */
export default function TodayMovementCards() {
  const today = toDateInput(new Date());

  const query = useQuery({
    queryKey: ['inventory-reports', 'today-movement', today],
    queryFn: ({ signal }) =>
      inventoryReportsService.getOverview({ fromDate: today, toDate: today }, signal),
    staleTime: 1000 * 30,
    retry: 1,
  });

  const receivedQty = query.data?.receivedToday?.qty ?? 0;
  const issuedQty = query.data?.issuedToday?.qty ?? 0;

  return (
    <div className="stats">
      <div className="stat">
        <div className="ic" style={{ background: 'var(--green)' }}>
          <span className="material-symbols-rounded">call_received</span>
        </div>
        <div>
          <div className="l">Received Today</div>
          <div className="v">{query.isPending ? '—' : formatNumber(receivedQty)}</div>
          <div className="s">Goods that came into the store today</div>
        </div>
      </div>

      <div className="stat">
        <div className="ic" style={{ background: 'var(--blue)' }}>
          <span className="material-symbols-rounded">call_made</span>
        </div>
        <div>
          <div className="l">Issued Today</div>
          <div className="v">{query.isPending ? '—' : formatNumber(issuedQty)}</div>
          <div className="s">Goods sent out of the store today</div>
        </div>
      </div>
    </div>
  );
}