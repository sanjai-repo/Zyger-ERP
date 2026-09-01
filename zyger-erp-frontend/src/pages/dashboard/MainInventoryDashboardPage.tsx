import { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/format';

export default function MainInventoryDashboardPage({ onNavigateToQC, onNavigateToInward }: { onNavigateToQC?: () => void; onNavigateToInward?: () => void }) {
  const { t } = useLanguage();

  const [stockList, setStockList] = useState<any[]>([]);
  const [inwardSummary, setInwardSummary] = useState<any>({ totalCount: 0, totalQty: 0, pendingCount: 0 });
  const [loading, setLoading] = useState(false);
  const [stockSearch, setStockSearch] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stock balances
      const resStock = await apiClient.get('/reports/stock-balance?size=100');
      const stockData: any = resStock.data;
      const stocks = Array.isArray(stockData) ? stockData : stockData?.content || [];
      setStockList(stocks);

      // Fetch inwards summary
      const resDash = await apiClient.get('/inventory/inward-dashboard');
      const dashboardData: any = resDash.data;
      if (dashboardData) {
        setInwardSummary({
          totalCount: dashboardData?.total?.count || 0,
          totalQty: dashboardData?.total?.qty || 0,
          pendingCount: dashboardData?.pending?.count || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = stockList.filter((item) => {
    if (!stockSearch) return true;
    const q = stockSearch.toLowerCase();
    return (
      (item.itemCode && item.itemCode.toLowerCase().includes(q)) ||
      (item.itemName && item.itemName.toLowerCase().includes(q)) ||
      (item.specification && item.specification.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>
      {/* Top Header */}
      <div className="pg-head pg-head-flex" style={{ marginBottom: '24px' }}>
        <div className="pg-head-text">
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            📊 {t('currentStock')} & Inventory Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)' }}>
            Real-time Material Inward, Quality Inspections, Usable Inventory & Vendor Reconciliations
          </p>
        </div>
      </div>

      {/* Top Summary Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Card 1: Today's Inward Total */}
        <div
          className="card"
          onClick={() => onNavigateToInward?.()}
          style={{ padding: '20px', borderRadius: '12px', cursor: 'pointer', borderLeft: '5px solid var(--blue, #2563eb)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Today's Inward Count</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                {formatNumber(inwardSummary.totalCount)} Entries
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--blue)', marginTop: '4px' }}>
                Total Received Qty: {formatNumber(inwardSummary.totalQty)}
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--blue-light, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--blue, #2563eb)', fontSize: '28px' }}>move_to_inbox</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pending Quality Tickets */}
        <div
          className="card"
          onClick={() => onNavigateToQC?.()}
          style={{ padding: '20px', borderRadius: '12px', cursor: 'pointer', borderLeft: '5px solid var(--yellow, #f59e0b)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('pendingInspection')}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--yellow-dark, #b45309)', marginTop: '4px' }}>
                {formatNumber(inwardSummary.pendingCount)} Tickets
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--yellow-dark)', marginTop: '4px', textDecoration: 'underline' }}>
                Click to inspect now →
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--yellow-light, #fef3c7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--yellow, #f59e0b)', fontSize: '28px' }}>hourglass_top</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Active Stock Items */}
        <div className="card" style={{ padding: '20px', borderRadius: '12px', borderLeft: '5px solid var(--green, #16a34a)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Stock Items</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                {formatNumber(stockList.length)} Items
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--green)', marginTop: '4px' }}>
                Active Usable Stock
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--green-light, #dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--green, #16a34a)', fontSize: '28px' }}>inventory_2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="card" style={{ padding: '24px', borderRadius: '12px', background: 'var(--bg-card, #ffffff)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--green, #16a34a)' }}>inventory</span>
            📦 {t('currentStock')} Inventory Report
          </h3>

          <div style={{ width: '320px' }}>
            <input
              type="text"
              className="f-input"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              placeholder="Search by Item Name, Code or Spec..."
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading inventory report...</div>
        ) : filteredStock.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No inventory stock records found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted, #f8fafc)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Item Code</th>
                  <th style={{ padding: '12px 16px' }}>{t('itemName')}</th>
                  <th style={{ padding: '12px 16px' }}>{t('specification')}</th>
                  <th style={{ padding: '12px 16px' }}>Location</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>{t('goodStock')}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((row, idx) => {
                  const qty = Number(row.qty || row.onHand || row.available || 0);
                  const isLow = qty <= 10;

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--p-color)' }}>
                        {row.itemCode || row.item || 'ITM-001'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        {row.itemName || row.itemDesc || row.itemCode}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        {row.specification || row.spec || 'Standard Spec'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {row.location || row.loc || 'RAW_MATERIAL_STORE'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: isLow ? 'var(--red)' : 'var(--green)' }}>
                        {formatNumber(qty)} {row.uom || 'Pcs'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: isLow ? 'var(--red-light, #fee2e2)' : 'var(--green-light, #dcfce7)',
                            color: isLow ? 'var(--red-dark, #991b1b)' : 'var(--green-dark, #166534)',
                          }}
                        >
                          {isLow ? 'Low Stock' : 'Available'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
