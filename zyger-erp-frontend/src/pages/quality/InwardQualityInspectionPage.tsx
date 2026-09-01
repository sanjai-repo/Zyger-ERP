import { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function InwardQualityInspectionPage() {
  const { toast } = useToast();
  const { t } = useLanguage();

  const [pendingList, setPendingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const [acceptedQty, setAcceptedQty] = useState<string>('');
  const [rejectedQty, setRejectedQty] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingQueue();
  }, []);

  const fetchPendingQueue = async () => {
    setLoading(true);
    try {
      // Fetch pending quality inspection documents
      const res = await apiClient.get('/quality/inspections?status=PENDING');
      const data: any = res.data;
      const list = Array.isArray(data) ? data : data?.content || [];
      setPendingList(list);
    } catch (err) {
      console.error('Failed to load quality queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    const recv = ticket.receivedQuantity || ticket.inspectionQuantity || ticket.qty || 0;
    setAcceptedQty(String(recv));
    setRejectedQty('0');
    setRejectionReason('');
    setRemarks('');
  };

  const receivedNum = Number(selectedTicket?.receivedQuantity || selectedTicket?.inspectionQuantity || selectedTicket?.qty || 0);
  const acceptedNum = Number(acceptedQty || 0);
  const rejectedNum = Number(rejectedQty || 0);

  const totalSum = acceptedNum + rejectedNum;
  const isSumValid = totalSum === receivedNum && receivedNum > 0;
  const isReasonRequired = rejectedNum > 0;
  const canSave = isSumValid && (!isReasonRequired || rejectionReason.trim().length > 0);

  const handleSaveInspection = async () => {
    if (!selectedTicket || !canSave) return;

    setSubmitting(true);
    try {
      const decisionPayload = {
        acceptedQuantity: acceptedNum,
        rejectedQuantity: rejectedNum,
        rejectionReason: rejectionReason,
        remarks: remarks,
        decision: rejectedNum > 0 ? (acceptedNum > 0 ? 'PARTIAL' : 'REJECT') : 'PASS',
      };

      await apiClient.post(`/quality/inspections/${selectedTicket.id}/decide`, decisionPayload);

      toast('Quality Inspection saved successfully! Stock updated.', 'success');
      setSelectedTicket(null);
      fetchPendingQueue();
    } catch (err: any) {
      toast(err?.message || 'Failed to submit quality inspection', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="pg-head pg-head-flex" style={{ marginBottom: '24px' }}>
        <div className="pg-head-text">
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>🔍 {t('pendingInspection')}</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Unified Inspection Queue — Verify received items and update inventory stock
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr 1.3fr' : '1fr', gap: '24px' }}>
        {/* Left Side: Pending Queue */}
        <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--yellow, #f59e0b)' }}>hourglass_top</span>
            Pending Quality Tickets ({pendingList.length})
          </h3>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading queue...</div>
          ) : pendingList.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              🎉 No pending inspections! All inward material is processed.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingList.map((item) => {
                const isSelected = selectedTicket?.id === item.id;
                const typeTag = item.inwardType || item.inspectionType || 'PO';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectTicket(item)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid var(--p-color, #2563eb)' : '1px solid var(--border-color, #e2e8f0)',
                      background: isSelected ? 'var(--bg-active, #eff6ff)' : 'var(--bg-card, #ffffff)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.inspectionNumber || item.docNo || `INW-${item.id}`}</span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: 'var(--blue-light, #dbeafe)',
                          color: 'var(--blue-dark, #1e40af)',
                        }}
                      >
                        {typeTag}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
                      {item.itemName || item.itemDesc || item.itemCode || 'Raw Material Item'}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Spec: {item.specification || 'Standard Spec'}</span>
                      <span style={{ fontWeight: 700, color: 'var(--p-color)' }}>Recv Qty: {item.receivedQuantity || item.inspectionQuantity || item.qty || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Inspection Decision Workspace */}
        {selectedTicket && (
          <div className="card" style={{ padding: '24px', borderRadius: '12px', background: 'var(--bg-card, #ffffff)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--blue, #2563eb)' }}>fact_check</span>
              Inspect Ticket #{selectedTicket.inspectionNumber || selectedTicket.docNo}
            </h3>

            {/* Auto-filled Item Details */}
            <div style={{ background: 'var(--bg-muted, #f8fafc)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>{t('itemName')}:</span>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedTicket.itemName || selectedTicket.itemDesc || selectedTicket.itemCode}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>{t('receivedQty')}:</span>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--blue)' }}>{receivedNum} {selectedTicket.uom || 'Pcs'}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t('specification')}:</span>
                  <div style={{ fontWeight: 500 }}>{selectedTicket.specification || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Decision Input Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="f-label" style={{ fontWeight: 600, color: 'var(--green, #16a34a)' }}>
                    ✅ {t('acceptedQty')}
                  </label>
                  <input
                    type="number"
                    className="f-input"
                    value={acceptedQty}
                    onChange={(e) => setAcceptedQty(e.target.value)}
                    min="0"
                    max={receivedNum}
                    style={{ fontSize: '1.1rem', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label className="f-label" style={{ fontWeight: 600, color: 'var(--red, #dc2626)' }}>
                    ❌ {t('rejectedQty')}
                  </label>
                  <input
                    type="number"
                    className="f-input"
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(e.target.value)}
                    min="0"
                    max={receivedNum}
                    style={{ fontSize: '1.1rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Live Sum Check Banner */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: isSumValid ? 'var(--green-light, #dcfce7)' : 'var(--red-light, #fee2e2)',
                  color: isSumValid ? 'var(--green-dark, #15803d)' : 'var(--red-dark, #b91c1c)',
                }}
              >
                <span className="material-symbols-rounded">
                  {isSumValid ? 'check_circle' : 'warning'}
                </span>
                {isSumValid
                  ? `Sum Matched! (${acceptedNum} Accepted + ${rejectedNum} Rejected = ${receivedNum} Received)`
                  : `Sum Mismatch! Accepted (${acceptedNum}) + Rejected (${rejectedNum}) = ${totalSum}, but Received is ${receivedNum}. Please fix numbers.`}
              </div>

              {/* Rejection Reason Selector */}
              {rejectedNum > 0 && (
                <div>
                  <label className="f-label" style={{ fontWeight: 600, color: 'var(--red)' }}>
                    {t('rejectionReason')} *
                  </label>
                  <select
                    className="f-input"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    style={{ borderColor: 'var(--red)' }}
                  >
                    <option value="">-- Select Rejection Reason --</option>
                    <option value="Damaged / Physical Defect">Damaged / Physical Defect</option>
                    <option value="Wrong Item Delivered">Wrong Item Delivered</option>
                    <option value="Size Out of Spec">Size Out of Spec</option>
                    <option value="Hardness / Material Grade Out of Spec">Hardness / Material Grade Out of Spec</option>
                    <option value="Surface Finish Defect">Surface Finish Defect</option>
                    <option value="Other Defect">Other Defect</option>
                  </select>
                </div>
              )}

              <div>
                <label className="f-label">Inspector Remarks / Notes</label>
                <textarea
                  className="f-input"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional quality inspection notes..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-s"
                onClick={() => setSelectedTicket(null)}
                disabled={submitting}
              >
                {t('cancel')}
              </button>
              <button
                className="btn btn-p"
                onClick={handleSaveInspection}
                disabled={!canSave || submitting}
                style={{
                  background: canSave ? 'var(--p-color, #2563eb)' : 'var(--border-color, #cbd5e1)',
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  padding: '10px 24px',
                  fontWeight: 700,
                }}
              >
                {submitting ? 'Saving...' : `💾 ${t('save')}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
