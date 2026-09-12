import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryReportsService } from '../../../services/inventoryReportsService';
import { formatNumber } from '../../../utils/format';
import { getApiErrorMessage } from '../../../utils/apiError';
import DrilldownPage from './DrilldownPage';

type Period = 'daily' | 'weekly' | 'monthly';

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getPeriodRange(period: Period): { fromDate: string; toDate: string; label: string } {
  const now = new Date();
  const toDate = toDateInput(now);

  if (period === 'daily') {
    return { fromDate: toDate, toDate, label: 'Today' };
  }

  if (period === 'weekly') {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return { fromDate: toDateInput(from), toDate, label: 'Last 7 Days' };
  }

  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { fromDate: toDateInput(from), toDate, label: 'This Month' };
}

export default function PeriodReportPage() {
  const [period, setPeriod] = useState<Period>('daily');
  const { fromDate, toDate, label } = useMemo(() => getPeriodRange(period), [period]);

  const summaryQuery = useQuery({
    queryKey: ['inventory-reports', 'period-summary', fromDate, toDate],
    queryFn: ({ signal }) =>
      inventoryReportsService.getStockLedger(
        { page: 0, size: 2000, fromDate, toDate },
        signal
      ),
    staleTime: 1000 * 30,
    retry: 1,
  });

  const totals = useMemo(() => {
    const rows = summaryQuery.data?.content ?? [];
    let received = 0;
    let issued = 0;
    let transferred = 0;

    rows.forEach((row) => {
      const inQty = Number(row.inQty ?? 0);
      const outQty = Number(row.outQty ?? 0);
      received += inQty;
      issued += outQty;
      if (String(row.txType ?? '').toUpperCase().includes('TRANSFER')) {
        transferred += inQty;
      }
    });

    return { received, issued, transferred };
  }, [summaryQuery.data]);

  return (
    <>
      <div className="pg-head">
        <h1>Inventory Reports — Daily / Weekly / Monthly</h1>
        <p>Received, issued &amp; transferred stock, rolled up by period</p>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ display: 'flex', gap: '8px', padding: '4px' }}>
          {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              className={period === p ? 'btn btn-p' : 'btn'}
              onClick={() => setPeriod(p)}
              style={{ textTransform: 'capitalize' }}
            >
              {p}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--muted)', alignSelf: 'center' }}>
            {label} · {fromDate} – {toDate}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
        }}
      >
        <div className="panel" style={{ background: 'var(--green-bg, #e7f6ec)', borderLeft: '5px solid var(--green)' }}>
          <div className="panel-h"><h2><span className="material-symbols-rounded">call_received</span> Received</h2></div>
          <div style={{ padding: 8, fontSize: 28, fontWeight: 800 }}>
            {summaryQuery.isPending ? '—' : formatNumber(totals.received)}
          </div>
          <div style={{ padding: '0 8px 8px', color: 'var(--muted)' }}>Total inward qty, {label.toLowerCase()}</div>
        </div>

        <div className="panel" style={{ background: 'var(--blue-bg, #eef6ff)', borderLeft: '5px solid var(--blue)' }}>
          <div className="panel-h"><h2><span className="material-symbols-rounded">call_made</span> Issued</h2></div>
          <div style={{ padding: 8, fontSize: 28, fontWeight: 800 }}>
            {summaryQuery.isPending ? '—' : formatNumber(totals.issued)}
          </div>
          <div style={{ padding: '0 8px 8px', color: 'var(--muted)' }}>Total outward qty, {label.toLowerCase()}</div>
        </div>

        <div className="panel" style={{ background: 'var(--purple-bg, #f0ecfb)', borderLeft: '5px solid var(--purple)' }}>
          <div className="panel-h"><h2><span className="material-symbols-rounded">sync_alt</span> Transferred</h2></div>
          <div style={{ padding: 8, fontSize: 28, fontWeight: 800 }}>
            {summaryQuery.isPending ? '—' : formatNumber(totals.transferred)}
          </div>
          <div style={{ padding: '0 8px 8px', color: 'var(--muted)' }}>Store-to-store transfer qty</div>
        </div>
      </div>

      {summaryQuery.isError && (
        <div className="panel">
          <div className="empty">
            <span className="material-symbols-rounded">error</span>
            {getApiErrorMessage(summaryQuery.error, 'Unable to load period totals.')}
          </div>
        </div>
      )}

      {/* Transaction log for the period — reuses the Inventory Log drilldown's own
          filter bar (search, date range, item, location, txn type), pre-seeded to
          this period's date range; remounts per period via `key` so switching
          Daily/Weekly/Monthly re-seeds the date filter. */}
      <DrilldownPage key={period} drilldownType="inventory-log" initialFilters={{ fromDate, toDate }} />
    </>
  );
}
