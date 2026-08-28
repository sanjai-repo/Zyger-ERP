import { useMemo, useState } from 'react';
import { useTabs } from '../../../contexts/TabsContext';
import { useToast } from '../../../contexts/ToastContext';
import { getScreenComponent } from '../../../config/screenRegistry';
import { useReportsOverview, useStockSummary } from '../../../hooks/useInventoryReports';
import { inventoryReportsService } from '../../../services/inventoryReportsService';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatCurrency, formatNumber } from '../../../utils/format';
import ReportKpiCards from './ReportKpiCards';
import type { KpiCardConfig } from './reportsConfig';
import DrilldownPage from './DrilldownPage';
import StatusBarChart from './charts/StatusBarChart';
import CategoryDonut from './charts/CategoryDonut';
import LocationBarChart from './charts/LocationBarChart';
import TrendLineChart from './charts/TrendLineChart';
import AccuracyGauge from './charts/AccuracyGauge';
import TopItemsBarChart from './charts/TopItemsBarChart';

type Period = 'LAST_7' | 'LAST_30' | 'THIS_MONTH' | 'THIS_YEAR';

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getRange(period: Period): { fromDate: string; toDate: string } {
  const now = new Date();
  const toDate = toDateInput(now);

  if (period === 'LAST_7') {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return { fromDate: toDateInput(from), toDate };
  }

  if (period === 'LAST_30') {
    const from = new Date(now);
    from.setDate(now.getDate() - 29);
    return { fromDate: toDateInput(from), toDate };
  }

  if (period === 'THIS_MONTH') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fromDate: toDateInput(from), toDate };
  }

  const from = new Date(now.getFullYear(), 0, 1);
  return { fromDate: toDateInput(from), toDate };
}

export default function InventoryReportsPage() {
  const { openTab } = useTabs();
  const { toast } = useToast();

  const [period, setPeriod] = useState<Period>('LAST_30');
  const [view, setView] = useState<'overview' | 'simple'>('overview');

  const { fromDate, toDate } = useMemo(() => getRange(period), [period]);

  const overviewQuery = useReportsOverview(fromDate, toDate);
  const stockSummaryQuery = useStockSummary();

  const handleCardClick = (card: KpiCardConfig) => {
    if (card.screenId) {
      openTab({
        id: card.screenId,
        label: card.label,
        icon: card.icon,
        component: getScreenComponent(card.screenId),
        props: { title: card.label, screenId: card.screenId },
      });
      return;
    }

    if (card.drilldown) {
      openTab({
        id: `drilldown-${card.drilldown}`,
        label: card.label,
        icon: card.icon,
        component: DrilldownPage,
        props: { drilldownType: card.drilldown },
      });
    }
  };

  const openScreenTab = (screenId: string, label: string, icon: string) => {
    openTab({
      id: screenId,
      label,
      icon,
      component: getScreenComponent(screenId),
      props: { title: label, screenId },
    });
  };

  const openDrilldownTab = (type: string, label: string, icon: string) => {
    openTab({
      id: `drilldown-${type}`,
      label,
      icon,
      component: DrilldownPage,
      props: { drilldownType: type },
    });
  };

  const handleSimpleExport = async (format: 'xlsx' | 'pdf') => {
    try {
      await inventoryReportsService.exportFile(
        'simple',
        'Stock Snapshot',
        { page: 0, size: 10 },
        format
      );
      toast('Stock snapshot downloaded.');
    } catch (exportError) {
      toast(
        getApiErrorMessage(
          exportError,
          'Export failed. Backend export endpoint is not available.'
        ),
        'error'
      );
    }
  };

  const overview = overviewQuery.data;
  const stockSummary = stockSummaryQuery.data;
  const totals = stockSummary?.totals;

  return (
    <>
      <div className="pg-head">
        <h1>Inventory Reports</h1>
        <p>BI dashboard — cards, charts, ledger & current stock</p>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>Time Period:</span>
            <select
              className="in"
              value={period}
              onChange={(event) => setPeriod(event.target.value as Period)}
              style={{ width: '160px' }}
            >
              <option value="LAST_7">Last 7 Days</option>
              <option value="LAST_30">Last 30 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_YEAR">This Year</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>View:</span>
            <select
              className="in"
              value={view}
              onChange={(event) => setView(event.target.value as 'overview' | 'simple')}
              style={{ width: '150px' }}
            >
              <option value="overview">Detailed Report</option>
              <option value="simple">Simple Report</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn"
              onClick={() =>
                openScreenTab('inventory-log', 'Inventory Log', 'menu_book')
              }
            >
              <span className="material-symbols-rounded">menu_book</span>
              Inventory Log
            </button>

            <button
              className="btn"
              onClick={() =>
                openScreenTab('current-stock', 'Current Stock', 'inventory')
              }
            >
              <span className="material-symbols-rounded">inventory</span>
              Current Stock
            </button>
          </div>
        </div>
      </div>

      {view === 'simple' ? (
        stockSummaryQuery.isPending ? (
          <div className="panel">
            <div className="empty">
              <span className="material-symbols-rounded">hourglass_empty</span>
              Loading simple inventory report...
            </div>
          </div>
        ) : stockSummaryQuery.isError ? (
          <div className="panel">
            <div className="empty">
              <span className="material-symbols-rounded">error</span>
              {getApiErrorMessage(
                stockSummaryQuery.error,
                'Unable to load the simple inventory report.'
              )}
              <div style={{ marginTop: '14px' }}>
                <button className="btn" onClick={() => stockSummaryQuery.refetch()}>
                  <span className="material-symbols-rounded">refresh</span>
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14,
              }}
            >
              <div className="panel" style={{ background: 'var(--green-bg, #e7f6ec)', borderLeft: '5px solid var(--green)' }}>
                <div className="panel-h"><h2><span className="material-symbols-rounded">inventory_2</span> Items in Store</h2></div>
                <div style={{ padding: 8, fontSize: 28, fontWeight: 800 }}>{formatNumber(totals?.itemCount)}</div>
                <div style={{ padding: '0 8px 8px', color: 'var(--muted)' }}>
                  {formatNumber(totals?.qtyOnHand)} pieces total
                </div>
              </div>

              <div className="panel" style={{ background: 'var(--purple-bg, #f0ecfb)', borderLeft: '5px solid var(--purple)' }}>
                <div className="panel-h"><h2><span className="material-symbols-rounded">payments</span> Stock Value</h2></div>
                <div style={{ padding: 8, fontSize: 28, fontWeight: 800 }}>{formatCurrency(totals?.value)}</div>
                <div style={{ padding: '0 8px 8px', color: 'var(--muted)' }}>Total value of items in store</div>
              </div>

              <div className="panel" style={{ background: '#fdf3e7', borderLeft: '5px solid var(--yellow)' }}>
                <div className="panel-h"><h2><span className="material-symbols-rounded">warning</span> Low Stock</h2></div>
                <div style={{ padding: 8, fontSize: 28, fontWeight: 800 }}>{formatNumber(totals?.lowStockCount)}</div>
                <div style={{ padding: '0 8px 8px', color: 'var(--muted)' }}>Items running low, need reorder</div>
              </div>

              <div className="panel" style={{ background: '#fdecec', borderLeft: '5px solid var(--red)' }}>
                <div className="panel-h"><h2><span className="material-symbols-rounded">block</span> Not Available</h2></div>
                <div style={{ padding: 8, fontSize: 28, fontWeight: 800 }}>{formatNumber(totals?.notAvailableCount)}</div>
                <div style={{ padding: '0 8px 8px', color: 'var(--muted)' }}>Items not in store right now</div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-h">
                <h2><span className="material-symbols-rounded">category</span> Stock by Item Group</h2>
              </div>
              <div className="twrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Item Group</th>
                      <th className="num">Items</th>
                      <th className="num">Qty in Store</th>
                      <th className="num">Value</th>
                      <th className="num">Not Available</th>
                      <th className="num">Low Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stockSummary?.groups ?? []).map((group) => (
                      <tr key={group.group}>
                        <td>{group.group}</td>
                        <td className="num">{formatNumber(group.itemCount)}</td>
                        <td className="num">{formatNumber(group.qtyOnHand)}</td>
                        <td className="num">{formatCurrency(group.value)}</td>
                        <td className="num" style={{ color: group.notAvailableCount > 0 ? 'var(--red)' : undefined }}>
                          {formatNumber(group.notAvailableCount)}
                        </td>
                        <td className="num" style={{ color: group.lowStockCount > 0 ? 'var(--yellow)' : undefined }}>
                          {formatNumber(group.lowStockCount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {(stockSummary?.notAvailableItems?.length ?? 0) > 0 && (
              <div className="panel">
                <div className="panel-h">
                  <h2><span className="material-symbols-rounded">block</span> Items Not Available</h2>
                  <button className="btn" onClick={() => openDrilldownTab('not-available', 'Not Available', 'inventory_2')}>
                    <span className="material-symbols-rounded">open_in_new</span>
                    View All
                  </button>
                </div>
                <div className="twrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Name</th>
                        <th>Group</th>
                        <th>Location</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stockSummary?.notAvailableItems ?? []).slice(0, 8).map((item) => (
                        <tr key={item.itemCode}>
                          <td>{item.itemCode}</td>
                          <td>{item.itemName}</td>
                          <td>{item.itemGroup}</td>
                          <td>{item.defaultWarehouse || '—'}</td>
                          <td><span className="badge" style={{ background: 'var(--red-bg, #fdecec)', color: 'var(--red)' }}>Not Available</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="panel" style={{ textAlign: 'center' }}>
              <button className="btn" onClick={() => handleSimpleExport('pdf')}>
                <span className="material-symbols-rounded">print</span>
                Print / Save PDF
              </button>
              <span style={{ width: 8, display: 'inline-block' }} />
              <button className="btn" onClick={() => handleSimpleExport('xlsx')}>
                <span className="material-symbols-rounded">download</span>
                Excel
              </button>
            </div>
          </>
        )
      ) : overviewQuery.isPending ? (
        <div className="panel">
          <div className="empty">
            <span className="material-symbols-rounded">hourglass_empty</span>
            Loading inventory reports...
          </div>
        </div>
      ) : overviewQuery.isError ? (
        <div className="panel">
          <div className="empty">
            <span className="material-symbols-rounded">error</span>
            {getApiErrorMessage(
              overviewQuery.error,
              'Unable to load inventory reports.'
            )}
            <div style={{ marginTop: '14px' }}>
              <button className="btn" onClick={() => overviewQuery.refetch()}>
                <span className="material-symbols-rounded">refresh</span>
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ReportKpiCards kpis={overview?.kpis} onCardClick={handleCardClick} />

          <div className="report-grid">
            <div className="panel">
              <div className="panel-h">
                <h2>
                  <span className="material-symbols-rounded">bar_chart</span>
                  Inventory Status (Monthly)
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                <StatusBarChart data={overview?.monthlyStatus ?? []} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-h">
                <h2>
                  <span className="material-symbols-rounded">donut_large</span>
                  Stock by Category
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                <CategoryDonut data={overview?.categoryDistribution ?? []} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-h">
                <h2>
                  <span className="material-symbols-rounded">show_chart</span>
                  Inward vs Issue Trend
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                <TrendLineChart data={overview?.inwardIssueTrend ?? []} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-h">
                <h2>
                  <span className="material-symbols-rounded">warehouse</span>
                  Stock by Location
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                <LocationBarChart data={overview?.locationDistribution ?? []} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-h">
                <h2>
                  <span className="material-symbols-rounded">leaderboard</span>
                  Top 10 Items by Value
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                <TopItemsBarChart data={overview?.topItemsByValue ?? []} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-h">
                <h2>
                  <span className="material-symbols-rounded">warning</span>
                  Inventory Accuracy
                </h2>
              </div>
              <div style={{ padding: 16 }}>
                <AccuracyGauge value={overview?.kpis?.accuracyPct ?? 0} />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-h">
              <h2>
                <span className="material-symbols-rounded">category</span>
                Stock by Item Group
              </h2>
              <button className="btn" onClick={() => openDrilldownTab('current-stock', 'Current Stock', 'inventory')}>
                <span className="material-symbols-rounded">open_in_new</span>
                Current Stock
              </button>
            </div>
            {stockSummaryQuery.isPending ? (
              <div className="empty">
                <span className="material-symbols-rounded">hourglass_empty</span>
                Loading item group summary...
              </div>
            ) : (
              <div className="twrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Item Group</th>
                      <th className="num">Items</th>
                      <th className="num">Qty in Store</th>
                      <th className="num">Value</th>
                      <th className="num">Not Available</th>
                      <th className="num">Low Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stockSummary?.groups ?? []).map((group) => (
                      <tr key={group.group}>
                        <td>{group.group}</td>
                        <td className="num">{formatNumber(group.itemCount)}</td>
                        <td className="num">{formatNumber(group.qtyOnHand)}</td>
                        <td className="num">{formatCurrency(group.value)}</td>
                        <td className="num" style={{ color: group.notAvailableCount > 0 ? 'var(--red)' : undefined }}>
                          {formatNumber(group.notAvailableCount)}
                        </td>
                        <td className="num" style={{ color: group.lowStockCount > 0 ? 'var(--yellow)' : undefined }}>
                          {formatNumber(group.lowStockCount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}