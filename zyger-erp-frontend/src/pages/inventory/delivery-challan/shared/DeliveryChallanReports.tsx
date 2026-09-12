import { useState, useEffect } from 'react';
import { useToast } from '../../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../../utils/apiError';

export default function DeliveryChallanReports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'register' | 'ageing' | 'pending-invoice' | 'stock-in-transit' | 'item-movement'>('register');
  const [loading, setLoading] = useState<boolean>(false);

  // DC Register state
  const [dcType, setDcType] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [partySearch, setPartySearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [registerRows, setRegisterRows] = useState<any[]>([]);

  // Report data
  const [ageingRows, setAgeingRows] = useState<any[]>([]);
  const [pendingInvoiceRows, setPendingInvoiceRows] = useState<any[]>([]);
  const [stockInTransitRows, setStockInTransitRows] = useState<any[]>([]);

  // Item-wise Movement state
  const [itemMovStartDate, setItemMovStartDate] = useState<string>('');
  const [itemMovEndDate, setItemMovEndDate] = useState<string>('');
  const [itemMovParty, setItemMovParty] = useState<string>('');
  const [itemMovItemCode, setItemMovItemCode] = useState<string>('');
  const [itemMovStatus, setItemMovStatus] = useState<string>('ALL');
  const [itemMovementRows, setItemMovementRows] = useState<any[]>([]);

  const fetchRegister = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (dcType !== 'ALL') q.set('dcType', dcType);
      if (startDate) q.set('startDate', startDate);
      if (endDate) q.set('endDate', endDate);
      if (partySearch) q.set('party', partySearch);
      if (statusFilter !== 'ALL') q.set('status', statusFilter);

      const res = await fetch(`/api/inventory/delivery-challan/reports/register?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch DC register');
      const data = await res.json();
      setRegisterRows(data);
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load DC Register'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgeing = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/delivery-challan/reports/job-work-ageing');
      if (!res.ok) throw new Error('Failed to fetch Job Work Ageing report');
      const data = await res.json();
      setAgeingRows(data);
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Job Work Ageing Report'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvoice = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/delivery-challan/reports/pending-invoice');
      if (!res.ok) throw new Error('Failed to fetch DC Pending Invoice report');
      const data = await res.json();
      setPendingInvoiceRows(data);
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Pending Invoice Report'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockInTransit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/delivery-challan/reports/stock-in-transit');
      if (!res.ok) throw new Error('Failed to fetch Stock in Transit report');
      const data = await res.json();
      setStockInTransitRows(data);
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Stock in Transit Report'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchItemMovement = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('dcType', 'ALL');
      if (itemMovStartDate) q.set('startDate', itemMovStartDate);
      if (itemMovEndDate) q.set('endDate', itemMovEndDate);
      if (itemMovParty) q.set('party', itemMovParty);
      if (itemMovItemCode) q.set('itemCode', itemMovItemCode);
      if (itemMovStatus !== 'ALL') q.set('status', itemMovStatus);
      const res = await fetch(`/api/inventory/delivery-challan/reports/dc-wise-item-movement?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch Item Movement report');
      const data = await res.json();
      setItemMovementRows(data);
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Item-wise Movement Report'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'register') fetchRegister();
    else if (activeTab === 'ageing') fetchAgeing();
    else if (activeTab === 'pending-invoice') fetchPendingInvoice();
    else if (activeTab === 'stock-in-transit') fetchStockInTransit();
    else if (activeTab === 'item-movement') fetchItemMovement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const confirmReceipt = async (id: number) => {
    try {
      const res = await fetch(`/api/inventory/delivery-challan/transfer-dc/${id}/actions/confirm-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Receipt confirmed from report' }),
      });
      if (!res.ok) throw new Error('Confirmation failed');
      toast('Receipt confirmed at destination');
      fetchStockInTransit();
    } catch (err) {
      toast(getApiErrorMessage(err, 'Confirm receipt failed'), 'error');
    }
  };

  return (
    <div>
      <div className="pg-head">
        <h1>
          <span className="material-symbols-rounded" style={{ marginRight: '8px', verticalAlign: 'bottom' }}>analytics</span>
          Delivery Challan Registers & Reports
        </h1>
        <p>Comprehensive register and pending action tracking for JO DC, General DC, and Transfer DC</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid var(--border, #e0e0e0)', paddingBottom: '8px' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'register' ? 'btn-p' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          <span className="material-symbols-rounded">table_chart</span>
          DC Register
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'ageing' ? 'btn-p' : ''}`}
          onClick={() => setActiveTab('ageing')}
        >
          <span className="material-symbols-rounded">schedule</span>
          Job Work Ageing
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'pending-invoice' ? 'btn-p' : ''}`}
          onClick={() => setActiveTab('pending-invoice')}
        >
          <span className="material-symbols-rounded">receipt_long</span>
          DC Pending for Invoice
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'stock-in-transit' ? 'btn-p' : ''}`}
          onClick={() => setActiveTab('stock-in-transit')}
        >
          <span className="material-symbols-rounded">local_shipping</span>
          Stock-in-Transit
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'item-movement' ? 'btn-p' : ''}`}
          onClick={() => setActiveTab('item-movement')}
        >
          <span className="material-symbols-rounded">swap_vert</span>
          DC-wise Item Movement
        </button>
      </div>

      {activeTab === 'register' && (
        <div className="panel">
          <div className="fgrid" style={{ marginBottom: '16px' }}>
            <label className="fld">
              <span>DC Type</span>
              <select className="in" value={dcType} onChange={(e) => setDcType(e.target.value)}>
                <option value="ALL">All DC Types</option>
                <option value="jo-dc">JO DC</option>
                <option value="general-dc">General DC</option>
                <option value="transfer-dc">Transfer DC</option>
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
              <span>Party / Location Search</span>
              <input className="in" placeholder="Search party or branch" value={partySearch} onChange={(e) => setPartySearch(e.target.value)} />
            </label>

            <label className="fld">
              <span>Status</span>
              <select className="in" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="POSTED">POSTED</option>
                <option value="RECEIVED">RECEIVED</option>
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
                  <th>DC Type</th>
                  <th>DC No</th>
                  <th>Date</th>
                  <th>Counter-Party</th>
                  <th>From Location</th>
                  <th>To Location</th>
                  <th>Ref No</th>
                  <th>Lines</th>
                  <th>Total Qty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '24px' }}>Loading DC Register...</td>
                  </tr>
                ) : registerRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '24px' }}>No Delivery Challans found</td>
                  </tr>
                ) : (
                  registerRows.map((r, i) => (
                    <tr key={i}>
                      <td><span className="badge">{r.docType}</span></td>
                      <td><b>{r.docNo}</b></td>
                      <td>{r.docDate}</td>
                      <td>{r.party}</td>
                      <td>{r.fromLocation}</td>
                      <td>{r.toLocation}</td>
                      <td>{r.referenceNo || '-'}</td>
                      <td className="num">{r.lineCount}</td>
                      <td className="num">{r.totalQty}</td>
                      <td><span className={`badge ${r.status === 'POSTED' || r.status === 'CONFIRMED' ? 'success' : r.status === 'CANCELLED' ? 'danger' : 'warn'}`}>{r.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ageing' && (
        <div className="panel">
          <div className="panel-h">
            <h2>Job Work Ageing Report (Goods Sent Outside Processing Pending Return)</h2>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>JO DC No</th>
                  <th>DC Date</th>
                  <th>Job Worker</th>
                  <th>Job Order No</th>
                  <th>Process Name</th>
                  <th>Item Code</th>
                  <th>Dispatched Qty</th>
                  <th>Expected Return Date</th>
                  <th>Days Pending</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '24px' }}>Loading Job Work Ageing Report...</td>
                  </tr>
                ) : ageingRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '24px' }}>No pending job work items</td>
                  </tr>
                ) : (
                  ageingRows.map((r, i) => (
                    <tr key={i}>
                      <td><b>{r.dcNo}</b></td>
                      <td>{r.dcDate}</td>
                      <td>{r.jobWorker}</td>
                      <td>{r.jobOrderNo || '-'}</td>
                      <td>{r.processName || '-'}</td>
                      <td>{r.itemCode}</td>
                      <td className="num">{r.dispatchedQty}</td>
                      <td>{r.expectedReturnDate || '-'}</td>
                      <td className="num"><b>{r.daysPending} days</b></td>
                      <td>
                        <span className={`badge ${r.status === 'OVERDUE' ? 'danger' : 'warn'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pending-invoice' && (
        <div className="panel">
          <div className="panel-h">
            <h2>General DCs Pending for Tax Invoice Conversion</h2>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>General DC No</th>
                  <th>DC Date</th>
                  <th>Customer</th>
                  <th>DC Against</th>
                  <th>Sales Order No</th>
                  <th>Vehicle No</th>
                  <th>Total Qty</th>
                  <th>Total Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>Loading Pending Invoice Report...</td>
                  </tr>
                ) : pendingInvoiceRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>No General DCs pending invoice</td>
                  </tr>
                ) : (
                  pendingInvoiceRows.map((r, i) => (
                    <tr key={i}>
                      <td><b>{r.dcNo}</b></td>
                      <td>{r.dcDate}</td>
                      <td>{r.customer}</td>
                      <td>{r.dcAgainst}</td>
                      <td>{r.salesOrderNo || '-'}</td>
                      <td>{r.vehicleNo || '-'}</td>
                      <td className="num">{r.totalQty}</td>
                      <td className="num">₹ {r.totalAmount?.toFixed(2)}</td>
                      <td>
                        <span className="badge info">Pending Invoicing</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'stock-in-transit' && (
        <div className="panel">
          <div className="panel-h">
            <h2>Stock-in-Transit Report (Transfer DCs Pending Destination Receipt)</h2>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Transfer DC No</th>
                  <th>DC Date</th>
                  <th>From Location</th>
                  <th>To Location</th>
                  <th>Transfer Type</th>
                  <th>Vehicle No</th>
                  <th>LR No</th>
                  <th>Total Qty</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>Loading Stock in Transit Report...</td>
                  </tr>
                ) : stockInTransitRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>No stock currently in transit</td>
                  </tr>
                ) : (
                  stockInTransitRows.map((r, i) => (
                    <tr key={i}>
                      <td><b>{r.dcNo}</b></td>
                      <td>{r.dcDate}</td>
                      <td>{r.fromLocation}</td>
                      <td>{r.toLocation}</td>
                      <td>{r.transferType}</td>
                      <td>{r.vehicleNo || '-'}</td>
                      <td>{r.lrNo || '-'}</td>
                      <td className="num">{r.totalQty}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-p"
                          onClick={() => confirmReceipt(r.id)}
                        >
                          Confirm Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'item-movement' && (
        <div className="panel">
          <div className="fgrid" style={{ marginBottom: '16px' }}>
            <label className="fld">
              <span>From Date</span>
              <input type="date" className="in" value={itemMovStartDate} onChange={(e) => setItemMovStartDate(e.target.value)} />
            </label>

            <label className="fld">
              <span>To Date</span>
              <input type="date" className="in" value={itemMovEndDate} onChange={(e) => setItemMovEndDate(e.target.value)} />
            </label>

            <label className="fld">
              <span>Party / Location Search</span>
              <input className="in" placeholder="Search party or branch" value={itemMovParty} onChange={(e) => setItemMovParty(e.target.value)} />
            </label>

            <label className="fld">
              <span>Item Code</span>
              <input className="in" placeholder="e.g. RM-200" value={itemMovItemCode} onChange={(e) => setItemMovItemCode(e.target.value)} />
            </label>

            <label className="fld">
              <span>Status</span>
              <select className="in" value={itemMovStatus} onChange={(e) => setItemMovStatus(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="POSTED">POSTED</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="RECEIVED">RECEIVED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>

            <div className="fld" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" className="btn btn-p" onClick={fetchItemMovement} disabled={loading}>
                <span className="material-symbols-rounded">search</span>
                Apply Filters
              </button>
            </div>
          </div>

          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>DC Type</th>
                  <th>DC No</th>
                  <th>Date</th>
                  <th>Movement</th>
                  <th>Item Code</th>
                  <th>Description</th>
                  <th>Batch</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Qty</th>
                  <th>UOM</th>
                  <th>Purpose</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: 'center', padding: '24px' }}>Loading DC-wise Item Movement Report...</td>
                  </tr>
                ) : itemMovementRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: 'center', padding: '24px' }}>No movements found matching the filters</td>
                  </tr>
                ) : (
                  itemMovementRows.map((r, i) => (
                    <tr key={i}>
                      <td><span className="badge">{r.docType}</span></td>
                      <td><b>{r.docNo}</b></td>
                      <td>{r.docDate}</td>
                      <td><span className={`badge ${r.movement?.includes('SEND') || r.movement === 'DISPATCH' || r.movement === 'TRANSFER' ? 'warn' : 'success'}`}>{r.movement}</span></td>
                      <td>{r.itemCode}</td>
                      <td>{r.itemDesc || '-'}</td>
                      <td>{r.batchNo || '-'}</td>
                      <td>{r.fromLocation || '-'}</td>
                      <td>{r.toLocation || '-'}</td>
                      <td className="num">{r.qty}</td>
                      <td>{r.uom || 'PCS'}</td>
                      <td>{r.purpose || '-'}</td>
                      <td><span className="badge">{r.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
