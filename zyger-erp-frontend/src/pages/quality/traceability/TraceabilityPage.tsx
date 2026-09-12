import { useState, useCallback } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface TraceRow {
  [key: string]: unknown;
}

const FORWARD_COLS = [
  { key: 'sales_order_no', label: 'Sales Order' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'work_order_no', label: 'Work Order' },
  { key: 'job_card_no', label: 'Job Card' },
  { key: 'heat_number', label: 'Heat No' },
  { key: 'batch_number', label: 'Batch No' },
  { key: 'grn_no', label: 'GRN No' },
  { key: 'supplier_name', label: 'Supplier' },
];

const REVERSE_COLS = [
  { key: 'grn_no', label: 'GRN No' },
  { key: 'supplier_name', label: 'Supplier' },
  { key: 'heat_number', label: 'Heat No' },
  { key: 'batch_number', label: 'Batch No' },
  { key: 'job_card_no', label: 'Job Card' },
  { key: 'work_order_no', label: 'Work Order' },
  { key: 'sales_order_no', label: 'Sales Order' },
  { key: 'customer_name', label: 'Customer' },
];

export default function TraceabilityPage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<'forward' | 'reverse'>('forward');
  const [results, setResults] = useState<TraceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [fSalesOrder, setFSalesOrder] = useState('');
  const [fWorkOrder, setFWorkOrder] = useState('');
  const [fCustomer, setFCustomer] = useState('');
  const [rHeat, setRHeat] = useState('');
  const [rBatch, setRBatch] = useState('');
  const [rGrn, setRGrn] = useState('');

  const searchForward = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (fSalesOrder.trim()) params.salesOrderNo = fSalesOrder.trim();
      if (fWorkOrder.trim()) params.workOrderNo = fWorkOrder.trim();
      if (fCustomer.trim()) params.customerName = fCustomer.trim();
      const { data } = await apiClient.get('/v1/traceability/forward', { params });
      setResults(Array.isArray(data) ? data : []);
      setSearched(true);
    } catch (e) { toast(getApiErrorMessage(e, 'Search failed.'), 'error'); }
    setLoading(false);
  }, [fSalesOrder, fWorkOrder, fCustomer]);

  const searchReverse = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (rHeat.trim()) params.heatNumber = rHeat.trim();
      if (rBatch.trim()) params.batchNumber = rBatch.trim();
      if (rGrn.trim()) params.grnNo = rGrn.trim();
      const { data } = await apiClient.get('/v1/traceability/reverse', { params });
      setResults(Array.isArray(data) ? data : []);
      setSearched(true);
    } catch (e) { toast(getApiErrorMessage(e, 'Search failed.'), 'error'); }
    setLoading(false);
  }, [rHeat, rBatch, rGrn]);

  const cols = mode === 'forward' ? FORWARD_COLS : REVERSE_COLS;

  return (
    <>
      <div className="pg-head"><h1>Material Traceability</h1><p>Forward & reverse traceability across the supply chain (GBL-09)</p></div>

      <div className="panel">
        <div className="panel-h">
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn ${mode === 'forward' ? 'btn-p' : ''}`} onClick={() => { setMode('forward'); setResults([]); setSearched(false); }}>
              <span className="material-symbols-rounded">arrow_forward</span> Forward
            </button>
            <button className={`btn ${mode === 'reverse' ? 'btn-p' : ''}`} onClick={() => { setMode('reverse'); setResults([]); setSearched(false); }}>
              <span className="material-symbols-rounded">arrow_back</span> Reverse
            </button>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {mode === 'forward' ? (
            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <label className="fld"><span>Sales Order No</span><input className="in" value={fSalesOrder} onChange={(e) => setFSalesOrder(e.target.value)} placeholder="e.g. SO-2026-0001" /></label>
              <label className="fld"><span>Work Order No</span><input className="in" value={fWorkOrder} onChange={(e) => setFWorkOrder(e.target.value)} placeholder="e.g. WO-2026-0001" /></label>
              <label className="fld"><span>Customer Name</span><input className="in" value={fCustomer} onChange={(e) => setFCustomer(e.target.value)} placeholder="Search customer..." /></label>
            </div>
          ) : (
            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <label className="fld"><span>Heat Number</span><input className="in" value={rHeat} onChange={(e) => setRHeat(e.target.value)} placeholder="e.g. HT-001" /></label>
              <label className="fld"><span>Batch Number</span><input className="in" value={rBatch} onChange={(e) => setRBatch(e.target.value)} placeholder="e.g. BAT-001" /></label>
              <label className="fld"><span>GRN No</span><input className="in" value={rGrn} onChange={(e) => setRGrn(e.target.value)} placeholder="e.g. GRN-2026-0001" /></label>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-p" onClick={mode === 'forward' ? searchForward : searchReverse} disabled={loading}>
              <span className="material-symbols-rounded">search</span> {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {searched && (
        <div className="panel">
          <div className="panel-h"><h2><span className="material-symbols-rounded">account_tree</span> Results ({results.length})</h2></div>
          {results.length === 0 ? (
            <div className="empty"><span className="material-symbols-rounded">search_off</span> No traceability records found for this search.</div>
          ) : (
            <div className="twrap">
              <table className="tbl">
                <thead>
                  <tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i}>{cols.map((c) => <td key={c.key}>{String(row[c.key] ?? '\u2014')}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
