import { useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface ComponentBreakdown {
  componentCode: string;
  componentDescription: string;
  uom: string;
  requiredQty: number;
  availableQty: number;
  status: 'OK' | 'SHORT';
}

interface FeasibilityResult {
  maxProducibleQty: number;
  limitingComponent: string;
  limitingComponentAvailableQty?: number;
  isFeasible: boolean;
  decisionAction?: string;
  decisionRemarks?: string;
  bomIdUsed?: number;
  resultJson?: string;
  breakdown: ComponentBreakdown[];
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  OK:    { color: '#28a745', bg: '#d4edda' },
  SHORT: { color: '#dc3545', bg: '#f8d7da' },
};

export default function FgPossibleScreen() {
  const { toast } = useToast();
  const [itemCode, setItemCode] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [includeWip, setIncludeWip] = useState(true);
  const [includeOpenPo, setIncludeOpenPo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FeasibilityResult | null>(null);
  const [checked, setChecked] = useState(false);
  const [orderQty, setOrderQty] = useState<number | ''>('');
  const [decisionAction, setDecisionAction] = useState('');
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);

  const checkFeasibility = async () => {
    if (!itemCode.trim()) { toast('Item code is required.', 'error'); return; }
    setBusy(true);
    try {
      const { data: itemData } = await apiClient.get(`/master/items?search=${encodeURIComponent(itemCode.trim())}`);
      const items = itemData.content ?? itemData ?? [];
      const found = items.find((it: { code: string }) => it.code === itemCode.trim());

      if (!found) {
        toast(`Item "${itemCode}" not found.`, 'error');
        setBusy(false);
        return;
      }

      try {
        const payload: Record<string, unknown> = { itemCode: itemCode.trim() };
        if (targetDate) payload.targetDate = targetDate;
        if (qty) payload.quantity = qty;
        payload.includeWip = includeWip;
        payload.includeOpenPo = includeOpenPo;
        const { data } = await apiClient.post('/v1/planning/fg-possible/check', payload);
        setResult(data);
      } catch {
        setResult({
          maxProducibleQty: 0,
          limitingComponent: 'N/A',
          isFeasible: false,
          breakdown: [],
        });
      }
      setChecked(true);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Feasibility check failed.'), 'error');
    }
    setBusy(false);
  };

  return (
    <>
      <div className="pg-head">
        <h1>FG Possible</h1>
        <p>Finished Goods Feasibility Check</p>
      </div>

      <div className="panel">
        <div className="toolbar">
          <label className="fld">
            <span>Item Code *</span>
            <input className="in" placeholder="e.g. FG-001" value={itemCode} onChange={(e) => { setItemCode(e.target.value); setChecked(false); setResult(null); }} />
          </label>
          <label className="fld">
            <span>Target Date</span>
            <input className="in" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </label>
          <label className="fld">
            <span>Target Qty</span>
            <input className="in" type="number" step="1" min="1" placeholder="Leave empty for max" value={qty} onChange={(e) => setQty(e.target.value ? Number(e.target.value) : '')} />
          </label>
          <label className="fld">
            <span>Order/Required Qty</span>
            <input className="in" type="number" step="1" min="1" placeholder="Target qty" value={orderQty} onChange={(e) => setOrderQty(e.target.value ? Number(e.target.value) : '')} />
          </label>
          <label className="fld" style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 20 }}>
            <input type="checkbox" checked={includeWip} onChange={(e) => setIncludeWip(e.target.checked)} />
            <span style={{ fontSize: 13 }}>Include WIP</span>
          </label>
          <label className="fld" style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 20 }}>
            <input type="checkbox" checked={includeOpenPo} onChange={(e) => setIncludeOpenPo(e.target.checked)} />
            <span style={{ fontSize: 13 }}>Include Open PO</span>
          </label>
          <button className="btn btn-p" onClick={checkFeasibility} disabled={busy}>
            <span className="material-symbols-rounded">search</span> Check Feasibility
          </button>
        </div>
      </div>

      {!checked && (
        <div className="panel">
          <div className="empty"><span className="material-symbols-rounded">select_all</span> Select an item and click Check Feasibility</div>
        </div>
      )}

      {checked && !result && (
        <div className="panel">
          <div className="empty"><span className="material-symbols-rounded">info</span> Select an item and click Check Feasibility</div>
        </div>
      )}

      {result && (
        <>
          <div className="panel">
            <div className="panel-h">
              <h2>
                <span className="material-symbols-rounded">{result.isFeasible ? 'check_circle' : 'cancel'}</span> Feasibility Result
              </h2>
            </div>
            {/* FRS §3.5: Three-number result panel */}
            <div style={{ display: 'flex', gap: 16, padding: '16px 20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 150, textAlign: 'center', padding: 20, background: '#f0f9ff', borderRadius: 8, border: '2px solid #bfdbfe' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Order / Required Qty</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1e40af' }}>{orderQty || result.maxProducibleQty || 0}</div>
              </div>
              <div style={{ flex: 1, minWidth: 150, textAlign: 'center', padding: 20, background: result.isFeasible ? '#f0fdf4' : '#fef2f2', borderRadius: 8, border: `2px solid ${result.isFeasible ? '#bbf7d0' : '#fecaca'}` }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>FG Possible Qty</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: result.isFeasible ? '#16a34a' : '#dc2626' }}>{result.maxProducibleQty}</div>
              </div>
              <div style={{ flex: 1, minWidth: 150, textAlign: 'center', padding: 20, background: result.maxProducibleQty < (orderQty || 0) ? '#fef2f2' : '#f0fdf4', borderRadius: 8, border: `2px solid ${result.maxProducibleQty < (orderQty || 0) ? '#fecaca' : '#bbf7d0'}` }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Shortage Qty</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: result.maxProducibleQty < (orderQty || 0) ? '#dc2626' : '#16a34a' }}>{Math.max(0, (orderQty || 0) - result.maxProducibleQty)}</div>
              </div>
            </div>
            {/* Limiting Factor */}
            <div style={{ padding: '0 20px 12px' }}>
              <label className="fld" style={{ marginBottom: 0 }}>
                <span>Limiting Factor</span>
                <span className="in" style={{ display: 'block', padding: '8px 12px', background: '#fffbeb', borderRadius: 4, fontWeight: 600, color: '#92400e' }}>{result.limitingComponent || '—'}</span>
              </label>
            </div>
            {/* FRS §3.5: Decision Action */}
            <div style={{ padding: '0 20px 16px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>Decision Action</h4>
              <div className="fgrid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <label className="fld">
                  <span>Action</span>
                  <select className="in" value={decisionAction} onChange={(e) => setDecisionAction(e.target.value)}>
                    <option value="">Select action...</option>
                    <option value="PURCHASE">Purchase Additional Material</option>
                    <option value="ALT_MATERIAL">Use Approved Alternative Material</option>
                    <option value="RESCHEDULE">Reschedule Production</option>
                    <option value="SPLIT_BATCH">Split Production Batch</option>
                    <option value="REPRIORITIZE">Reprioritize Another Order</option>
                  </select>
                </label>
                <label className="fld">
                  <span>Remarks</span>
                  <input className="in" value={decisionRemarks} onChange={(e) => setDecisionRemarks(e.target.value)} placeholder="Decision notes..." />
                </label>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-h">
              <h2>Component Breakdown</h2>
            </div>
            {result.breakdown.length > 0 ? (
              <div className="twrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Component Code</th>
                      <th>Description</th>
                      <th>UOM</th>
                      <th>Required Qty</th>
                      <th>Available Qty</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.breakdown.map((comp, idx) => {
                      const sc = STATUS_COLORS[comp.status] ?? { color: '#888', bg: '#e9ecef' };
                      return (
                        <tr key={idx}>
                          <td>{comp.componentCode}</td>
                          <td>{comp.componentDescription}</td>
                          <td>{comp.uom}</td>
                          <td>{comp.requiredQty}</td>
                          <td>{comp.availableQty}</td>
                          <td>
                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: sc.color, background: sc.bg }}>
                              {comp.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty"><span className="material-symbols-rounded">info</span> No component data available.</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
