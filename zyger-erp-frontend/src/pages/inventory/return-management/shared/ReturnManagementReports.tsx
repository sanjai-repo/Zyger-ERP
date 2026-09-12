import { useState, useEffect } from 'react';
import { useToast } from '../../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../../utils/apiError';

type ReturnTab =
  | 'register'
  | 'pending-dc'
  | 'pending-invoice'
  | 'pending-stock'
  | 'damaged'
  | 'consumption';

export default function ReturnManagementReports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ReturnTab>('register');
  const [loading, setLoading] = useState<boolean>(false);

  // Return Register filters
  const [returnType, setReturnType] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [partyFilter, setPartyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceNo, setSourceNo] = useState<string>('');
  const [registerRows, setRegisterRows] = useState<any[]>([]);

  const [pendingDcRows, setPendingDcRows] = useState<any[]>([]);
  const [pendingInvoiceRows, setPendingInvoiceRows] = useState<any[]>([]);
  const [pendingStockRows, setPendingStockRows] = useState<any[]>([]);

  // Damaged / Rejected / Scrap filters
  const [damagedStatus, setDamagedStatus] = useState<string>('ALL');
  const [damagedLocation, setDamagedLocation] = useState<string>('');
  const [damagedItem, setDamagedItem] = useState<string>('');
  const [damagedRows, setDamagedRows] = useState<any[]>([]);

  // Consumption Adjustment filters
  const [conStartDate, setConStartDate] = useState<string>('');
  const [conEndDate, setConEndDate] = useState<string>('');
  const [conJobRef, setConJobRef] = useState<string>('');
  const [conItem, setConItem] = useState<string>('');
  const [consumptionRows, setConsumptionRows] = useState<any[]>([]);

  const fetchRegister = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (returnType !== 'ALL') q.set('returnType', returnType);
      if (startDate) q.set('startDate', startDate);
      if (endDate) q.set('endDate', endDate);
      if (partyFilter) q.set('party', partyFilter);
      if (statusFilter !== 'ALL') q.set('status', statusFilter);
      if (sourceNo) q.set('sourceNo', sourceNo);
      const res = await fetch(`/api/inventory/return-management/reports/register?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch return register');
      setRegisterRows(await res.json());
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Return Register'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingDc = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/return-management/reports/pending-dc-return');
      if (!res.ok) throw new Error('Failed to fetch pending DC return');
      setPendingDcRows(await res.json());
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Pending DC Return'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvoice = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/return-management/reports/pending-invoice-return');
      if (!res.ok) throw new Error('Failed to fetch pending invoice return');
      setPendingInvoiceRows(await res.json());
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Pending Invoice Return'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingStock = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/return-management/reports/pending-stock-return');
      if (!res.ok) throw new Error('Failed to fetch pending stock return');
      setPendingStockRows(await res.json());
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Pending Stock Return'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDamaged = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (damagedStatus !== 'ALL') q.set('status', damagedStatus);
      if (damagedLocation) q.set('location', damagedLocation);
      if (damagedItem) q.set('itemCode', damagedItem);
      const res = await fetch(`/api/inventory/return-management/reports/damaged-rejected-scrap?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch damaged/rejected/scrap stock');
      setDamagedRows(await res.json());
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Damaged/Rejected/Scrap Stock'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchConsumption = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (conStartDate) q.set('startDate', conStartDate);
      if (conEndDate) q.set('endDate', conEndDate);
      if (conJobRef) q.set('jobRef', conJobRef);
      if (conItem) q.set('itemCode', conItem);
      const res = await fetch(`/api/inventory/return-management/reports/consumption-adjustment?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch consumption adjustment report');
      setConsumptionRows(await res.json());
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Consumption Adjustment Report'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'register') fetchRegister();
    else if (activeTab === 'pending-dc') fetchPendingDc();
    else if (activeTab === 'pending-invoice') fetchPendingInvoice();
    else if (activeTab === 'pending-stock') fetchPendingStock();
    else if (activeTab === 'damaged') fetchDamaged();
    else if (activeTab === 'consumption') fetchConsumption();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div>
      <div className="pg-head">
        <h1>
          <span className="material-symbols-rounded" style={{ marginRight: '8px', verticalAlign: 'bottom' }}>assignment_return</span>
          Return Management Registers & Reports
        </h1>
        <p>Return Register, pending returns, damaged/rejected/scrap stock and consumption adjustments</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid var(--border, #e0e0e0)', paddingBottom: '8px' }}>
        {([
          ['register', 'table_chart', 'Return Register'],
          ['pending-dc', 'pending_actions', 'Pending DC Return'],
          ['pending-invoice', 'receipt_long', 'Pending Invoice Return'],
          ['pending-stock', 'inventory', 'Pending Stock Return'],
          ['damaged', 'report_gmailerrorred', 'Damaged/Rejected/Scrap'],
          ['consumption', 'sync_alt', 'Consumption Adjustment'],
        ] as Array<[ReturnTab, string, string]>).map(([key, icon, label]) => (
          <button key={key} type="button" className={`btn ${activeTab === key ? 'btn-p' : ''}`} onClick={() => setActiveTab(key)}>
            <span className="material-symbols-rounded">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'register' && (
        <div className="panel">
          <div className="fgrid" style={{ marginBottom: '16px' }}>
            <label className="fld">
              <span>Return Type</span>
              <select className="in" value={returnType} onChange={(e) => setReturnType(e.target.value)}>
                <option value="ALL">All Return Types</option>
                <option value="dc-return">DC Return</option>
                <option value="invoice-return">Invoice Return</option>
                <option value="stock-return">Stock Return</option>
              </select>
            </label>
            <label className="fld">
              <span>From Date</span>
              <input type="date" className="in" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="fld">
              <span>To Date</span>
              <input type="date" className="in" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <label className="fld">
              <span>Party</span>
              <input className="in" value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} />
            </label>
            <label className="fld">
              <span>Source No</span>
              <input className="in" value={sourceNo} onChange={(e) => setSourceNo(e.target.value)} />
            </label>
            <label className="fld">
              <span>Status</span>
              <select className="in" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="POSTED">POSTED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>
            <div className="fld" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" className="btn btn-p" onClick={fetchRegister} disabled={loading}>
                <span className="material-symbols-rounded">search</span>
                Apply Filters
              </button>
            </div>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Type</th><th>Return No</th><th>Date</th><th>Party</th><th>Source No</th>
                  <th>Reason</th><th>Condition</th><th>Total Qty</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>Loading Return Register...</td></tr>
                ) : registerRows.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>No returns found</td></tr>
                ) : (
                  registerRows.map((r, i) => (
                    <tr key={i}>
                      <td><span className="badge">{r.docType}</span></td>
                      <td><b>{r.docNo}</b></td>
                      <td>{r.docDate}</td>
                      <td>{r.party}</td>
                      <td>{r.sourceNo || '-'}</td>
                      <td>{r.reasonCode || '-'}</td>
                      <td>{r.condition || '-'}</td>
                      <td className="num">{r.totalQty}</td>
                      <td><span className={`badge ${r.status === 'POSTED' ? 'success' : r.status === 'CANCELLED' ? 'danger' : 'warn'}`}>{r.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pending-dc' && (
        <div className="panel">
          <div className="panel-h"><h2>Pending DC Return (Zero / Partial Quantity Returned)</h2></div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr><th>Return No</th><th>Date</th><th>Customer</th><th>Original DC</th><th>Total Qty</th><th>Days Ageing</th><th>Bucket</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                : pendingDcRows.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>No pending DC returns</td></tr>
                : pendingDcRows.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.docNo}</b></td><td>{r.docDate}</td><td>{r.party}</td><td>{r.sourceNo}</td>
                    <td className="num">{r.totalQty}</td><td className="num">{r.ageingDays}</td><td>{r.ageingBucket}</td>
                    <td><span className="badge warn">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pending-invoice' && (
        <div className="panel">
          <div className="panel-h"><h2>Pending Invoice Return & Credit Note Status</h2></div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr><th>Return No</th><th>Date</th><th>Customer</th><th>Original Invoice</th><th>Credit Note</th>
                  <th>Tax Reversal</th><th>Total Qty</th><th>Days Ageing</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                : pendingInvoiceRows.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>No pending invoice returns</td></tr>
                : pendingInvoiceRows.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.docNo}</b></td><td>{r.docDate}</td><td>{r.party}</td><td>{r.sourceNo}</td>
                    <td>{r.creditNoteNo || '—'}</td><td>{r.taxReversalApplicable || '—'}</td>
                    <td className="num">{r.totalQty}</td><td className="num">{r.ageingDays}</td>
                    <td><span className="badge warn">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pending-stock' && (
        <div className="panel">
          <div className="panel-h"><h2>Pending Stock Return</h2></div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr><th>Return No</th><th>Date</th><th>Department</th><th>Original Issue</th><th>Total Qty</th><th>Days Ageing</th><th>Bucket</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                : pendingStockRows.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>No pending stock returns</td></tr>
                : pendingStockRows.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.docNo}</b></td><td>{r.docDate}</td><td>{r.party}</td><td>{r.sourceNo}</td>
                    <td className="num">{r.totalQty}</td><td className="num">{r.ageingDays}</td><td>{r.ageingBucket}</td>
                    <td><span className="badge warn">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'damaged' && (
        <div className="panel">
          <div className="fgrid" style={{ marginBottom: '16px' }}>
            <label className="fld">
              <span>Bucket</span>
              <select className="in" value={damagedStatus} onChange={(e) => setDamagedStatus(e.target.value)}>
                <option value="ALL">All Buckets</option>
                <option value="DAMAGED">DAMAGED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="SCRAP">SCRAP</option>
              </select>
            </label>
            <label className="fld"><span>Location</span><input className="in" value={damagedLocation} onChange={(e) => setDamagedLocation(e.target.value)} /></label>
            <label className="fld"><span>Item Code</span><input className="in" value={damagedItem} onChange={(e) => setDamagedItem(e.target.value)} /></label>
            <div className="fld" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" className="btn btn-p" onClick={fetchDamaged} disabled={loading}>
                <span className="material-symbols-rounded">search</span>
                Apply Filters
              </button>
            </div>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr><th>Item Code</th><th>Location</th><th>Batch</th><th>Heat</th><th>Status</th><th>Qty</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                : damagedRows.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>No qualifying stock</td></tr>
                : damagedRows.map((r, i) => {
                    const label = { DAMAGED: 'Damaged', REJECTED: 'Rejected', SCRAP: 'Scrap' }[r.stockStatus as string] || r.stockStatus;
                    return (
                      <tr key={i}>
                        <td>{r.itemCode}</td><td>{r.location}</td><td>{r.batchNo || '-'}</td><td className="num">{r.heatNo || '-'}</td>
                        <td><span className={`badge ${r.stockStatus === 'SCRAP' ? 'danger' : r.stockStatus === 'REJECTED' ? 'warn' : 'danger'}`}>{label}</span></td>
                        <td className="num">{r.qty}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'consumption' && (
        <div className="panel">
          <div className="fgrid" style={{ marginBottom: '16px' }}>
            <label className="fld"><span>From Date</span><input type="date" className="in" value={conStartDate} onChange={(e) => setConStartDate(e.target.value)} /></label>
            <label className="fld"><span>To Date</span><input type="date" className="in" value={conEndDate} onChange={(e) => setConEndDate(e.target.value)} /></label>
            <label className="fld"><span>Issue No</span><input className="in" value={conJobRef} onChange={(e) => setConJobRef(e.target.value)} /></label>
            <label className="fld"><span>Item Code</span><input className="in" value={conItem} onChange={(e) => setConItem(e.target.value)} /></label>
            <div className="fld" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" className="btn btn-p" onClick={fetchConsumption} disabled={loading}>
                <span className="material-symbols-rounded">search</span>
                Apply Filters
              </button>
            </div>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr><th>Return No</th><th>Return Date</th><th>Issue No</th><th>Item Code</th><th>Returned Qty</th><th>Condition</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                : consumptionRows.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>No consumption adjustments</td></tr>
                : consumptionRows.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.returnDocNo}</b></td><td>{r.returnDate}</td><td>{r.issueNo}</td><td>{r.itemCode}</td>
                    <td className="num">{r.returnedQty}</td><td>{r.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}