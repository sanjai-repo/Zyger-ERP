import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface LedgerRow {
  id: number;
  entryDate: string;
  txType: string;
  refDocType: string;
  refDocNo: string;
  amount: number;
  runningBalance: number;
  remarks: string;
}

interface LedgerData {
  partyCode: string;
  partyName: string | null;
  balance: number;
  entries: LedgerRow[];
}

interface Ageing {
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
  totalOutstanding: number;
}

const money = (n: number) => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// FRS DOC-PUR-FRS-02 §11 (PUR-09) — Supplier Ledger, reachable from the Supplier Master list.
// Read-only: entries are written automatically when a Purchase Invoice or a Purchase Return
// (with "Debit Note Required") POSTs.
export default function SupplierLedgerPage({ partyCode, onBack }: { partyCode: string; onBack: () => void }) {
  const { toast } = useToast();
  const [data, setData] = useState<LedgerData | null>(null);
  const [ageing, setAgeing] = useState<Ageing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partyCode) return;
    setLoading(true);
    Promise.all([
      apiClient.get(`/master/vendor-ledger/${encodeURIComponent(partyCode)}`),
      apiClient.get(`/master/vendor-ledger/${encodeURIComponent(partyCode)}/ageing`),
    ]).then(([ledgerRes, ageingRes]) => {
      setData(ledgerRes.data);
      setAgeing(ageingRes.data);
    }).catch((e) => {
      toast(getApiErrorMessage(e, 'Failed to load ledger.'), 'error');
    }).finally(() => setLoading(false));
  }, [partyCode]);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <button type="button" className="ibtn" onClick={onBack} title="Back">
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Supplier Ledger — {data?.partyName || partyCode}</h2>
          <div style={{ fontSize: '13px', color: '#64748b' }}>{partyCode}</div>
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : !data ? (
        <div>No ledger data.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div className="stat-card" style={{ padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: '8px', minWidth: '160px' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Current Balance Payable</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: (data.balance ?? 0) > 0 ? '#b45309' : '#166534' }}>{money(data.balance)}</div>
            </div>
            {ageing && (
              <>
                <div className="stat-card" style={{ padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: '8px', minWidth: '120px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>0–30 days</div>
                  <div style={{ fontSize: '16px', fontWeight: 600 }}>{money(ageing.bucket_0_30)}</div>
                </div>
                <div className="stat-card" style={{ padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: '8px', minWidth: '120px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>31–60 days</div>
                  <div style={{ fontSize: '16px', fontWeight: 600 }}>{money(ageing.bucket_31_60)}</div>
                </div>
                <div className="stat-card" style={{ padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: '8px', minWidth: '120px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>61–90 days</div>
                  <div style={{ fontSize: '16px', fontWeight: 600 }}>{money(ageing.bucket_61_90)}</div>
                </div>
                <div className="stat-card" style={{ padding: '14px 18px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: '8px', minWidth: '120px' }}>
                  <div style={{ fontSize: '12px', color: '#991b1b' }}>90+ days</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#991b1b' }}>{money(ageing.bucket_90_plus)}</div>
                </div>
              </>
            )}
          </div>

          <table className="tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="num">S.No</th>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Remarks</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No ledger activity yet — entries appear here once a Purchase Invoice or a debit-note Purchase Return posts against this supplier.</td></tr>
              ) : (
                data.entries.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="num mut">{idx + 1}</td>
                    <td>{row.entryDate}</td>
                    <td>{row.txType}</td>
                    <td>{row.refDocType}: {row.refDocNo}</td>
                    <td>{row.remarks}</td>
                    <td style={{ textAlign: 'right', color: row.amount >= 0 ? '#166534' : '#b91c1c' }}>{money(row.amount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{money(row.runningBalance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
