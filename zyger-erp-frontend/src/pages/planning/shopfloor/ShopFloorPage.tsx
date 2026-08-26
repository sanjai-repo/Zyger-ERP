import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import { useAuth } from '../../../contexts/AuthContext';
import StatusBadge from '../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import { useFormKeyboard } from '../../../hooks/useFormKeyboard';
import { useUnsavedWarning } from '../../../hooks/useUnsavedWarning';

/** FRS §6.6: Compact, touch-friendly Shop Floor Entry form for shop-floor use. */

const TOUCH_FIELD_STYLE: React.CSSProperties = {
  fontSize: 16,
  padding: '12px 14px',
  borderRadius: 8,
  border: '2px solid #d1d5db',
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 48,
};

const TOUCH_LABEL_STYLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 4,
};

type ActionModal = { action: string; danger: boolean };

export default function ShopFloorPage({ initialDocId }: { initialDocId?: string | number }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [mode, setMode] = useState<'list' | 'form'>(initialDocId ? 'form' : 'list');
  const [documentId, setDocumentId] = useState<string | null>(initialDocId ? String(initialDocId) : null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [isBusy, setIsBusy] = useState(false);
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<Array<Record<string, unknown>>>([]);
  const [workOrders, setWorkOrders] = useState<Array<Record<string, unknown>>>([]);

  const editable = !documentId || ['DRAFT'].includes(String(form.status ?? 'DRAFT'));
  const genericStatus = String(form.status ?? 'DRAFT');
  const canSubmit = editable && genericStatus === 'DRAFT';
  const canApprove = !documentId || genericStatus === 'SUBMITTED';
  const canPost = !documentId || genericStatus === 'APPROVED';

  useUnsavedWarning(mode === 'form' && editable && Object.keys(form).length > 0);
  useFormKeyboard({ onSave: handleSave, onEscape: () => setMode('list') });

  const loadWorkOrders = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/v1/planning/work-order', { params: { status: 'RELEASED,IN_PROCESS', size: 200 } });
      setWorkOrders(data?.content ?? data ?? []);
    } catch { /* ignore */ }
  }, []);

  const loadEntries = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/v1/planning/shop-floor-entry', { params: { size: 50, page: 0, sort: 'date,desc', ...(search ? { search } : {}) } });
      setEntries(data?.content ?? data ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Failed to load entries'), 'error'); }
  }, [search]);

  useEffect(() => { if (mode === 'list') loadEntries(); }, [mode, loadEntries]);
  useEffect(() => { if (mode === 'form') loadWorkOrders(); }, [mode, loadWorkOrders]);

  useEffect(() => {
    if (!documentId || mode !== 'form') return;
    (async () => {
      try {
        const { data } = await apiClient.get(`/v1/planning/shop-floor-entry/${documentId}`);
        setForm(data);
      } catch (e) { toast(getApiErrorMessage(e, 'Failed to load entry'), 'error'); }
    })();
  }, [documentId, mode]);

  async function handleSave() {
    if (!form.workOrderNo) { toast('Work Order No is required.', 'error'); return; }
    if (!form.operatorCode) { toast('Operator is required.', 'error'); return; }
    setIsBusy(true);
    try {
      const payload = { ...form, operatorCode: form.operatorCode || user?.username };
      if (documentId) {
        await apiClient.put(`/v1/planning/shop-floor-entry/${documentId}`, payload);
        toast('Entry saved.', 'success');
      } else {
        const { data } = await apiClient.post('/v1/planning/shop-floor-entry', payload);
        setDocumentId(String(data.id));
        setForm(data);
        toast('Entry created.', 'success');
      }
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed'), 'error'); }
    setIsBusy(false);
  }

  async function runAction(action: string, note?: string) {
    if (!documentId) return;
    setIsBusy(true);
    try {
      const { data } = await apiClient.post(`/v1/planning/shop-floor-entry/${documentId}/actions/${action}`, { note: note || '' });
      setForm(data);
      setActionModal(null);
      toast(`${action.charAt(0).toUpperCase() + action.slice(1)} successful.`, 'success');
    } catch (e) { toast(getApiErrorMessage(e, `${action} failed`), 'error'); }
    setIsBusy(false);
  }

  function updateField(key: string, value: unknown) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  return (
    <>
      <div className="pg-head" style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Shop Floor Entry</h1>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Touch-optimized production recording</p>
          </div>
          {documentId && <StatusBadge status={genericStatus} />}
        </div>
      </div>

      {mode === 'list' && (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <input className="in" placeholder="Search entries..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ ...TOUCH_FIELD_STYLE, maxWidth: 400 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {entries.map((e) => (
              <div key={e.id} onClick={() => { setDocumentId(String(e.id)); setMode('form'); }}
                style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={(ev) => (ev.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                onMouseLeave={(ev) => (ev.currentTarget.style.boxShadow = 'none')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{String(e.docNo ?? `#${e.id}`)}</span>
                  <StatusBadge status={String(e.status ?? 'DRAFT')} />
                </div>
                <div style={{ fontSize: 13, color: '#374151' }}>WO: {String(e.workOrderNo ?? '—')}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Op: {String(e.operationCode ?? '—')} | Qty: {String(e.goodQuantity ?? 0)}</div>
              </div>
            ))}
          </div>
          <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 20 }}>
            <button type="button" onClick={() => { setDocumentId(null); setForm({}); setMode('form'); }}
              style={{ width: 56, height: 56, borderRadius: 28, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 28 }}>add</span>
            </button>
          </div>
        </div>
      )}

      {mode === 'form' && (
        <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
          {/* Primary fields — large touch targets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <label style={{ gridColumn: 'span 2' }}>
              <span style={TOUCH_LABEL_STYLE}>Work Order No *</span>
              <select className="in" style={TOUCH_FIELD_STYLE} disabled={!editable || Boolean(documentId)}
                value={String(form.workOrderNo ?? '')} onChange={(e) => updateField('workOrderNo', e.target.value)}>
                <option value="">— Select Work Order —</option>
                {workOrders.map((wo) => (
                  <option key={wo.id} value={String(wo.woNumber ?? '')}>{String(wo.woNumber ?? '')} — {String(wo.itemCode ?? '')}</option>
                ))}
              </select>
            </label>
            <label>
              <span style={TOUCH_LABEL_STYLE}>Operator *</span>
              <input className="in" style={TOUCH_FIELD_STYLE} readOnly value={String(form.operatorCode ?? user?.username ?? '')} />
            </label>
            <label>
              <span style={TOUCH_LABEL_STYLE}>Operation Sequence</span>
              <input className="in" style={TOUCH_FIELD_STYLE} type="number" readOnly={!editable} value={String(form.operationSequence ?? '')} onChange={(e) => updateField('operationSequence', e.target.value)} />
            </label>
            <label>
              <span style={TOUCH_LABEL_STYLE}>Machine Code</span>
              <input className="in" style={TOUCH_FIELD_STYLE} readOnly={!editable} value={String(form.machineCode ?? '')} onChange={(e) => updateField('machineCode', e.target.value)} />
            </label>
            <label>
              <span style={TOUCH_LABEL_STYLE}>Operation Code</span>
              <input className="in" style={TOUCH_FIELD_STYLE} readOnly={!editable} value={String(form.operationCode ?? '')} onChange={(e) => updateField('operationCode', e.target.value)} />
            </label>
          </div>

          {/* Quantity entry — extra large for shop floor */}
          <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>pin</span> Quantities
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <label>
                <span style={{ ...TOUCH_LABEL_STYLE, color: '#166534' }}>Good Quantity</span>
                <input className="in" type="number" style={{ ...TOUCH_FIELD_STYLE, fontSize: 22, fontWeight: 700, textAlign: 'center', borderColor: '#86efac' }}
                  readOnly={!editable} value={String(form.goodQuantity ?? '')} onChange={(e) => updateField('goodQuantity', e.target.value)} placeholder="0" />
              </label>
              <label>
                <span style={{ ...TOUCH_LABEL_STYLE, color: '#dc2626' }}>Scrap Quantity</span>
                <input className="in" type="number" style={{ ...TOUCH_FIELD_STYLE, fontSize: 22, fontWeight: 700, textAlign: 'center', borderColor: '#fca5a5' }}
                  readOnly={!editable} value={String(form.scrapQuantity ?? '')} onChange={(e) => updateField('scrapQuantity', e.target.value)} placeholder="0" />
              </label>
              <label>
                <span style={{ ...TOUCH_LABEL_STYLE, color: '#d97706' }}>Rework Quantity</span>
                <input className="in" type="number" style={{ ...TOUCH_FIELD_STYLE, fontSize: 22, fontWeight: 700, textAlign: 'center', borderColor: '#fcd34d' }}
                  readOnly={!editable} value={String(form.reworkQuantity ?? '')} onChange={(e) => updateField('reworkQuantity', e.target.value)} placeholder="0" />
              </label>
            </div>
          </div>

          {/* Time fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <label>
              <span style={TOUCH_LABEL_STYLE}>Start Time</span>
              <input className="in" type="datetime-local" style={TOUCH_FIELD_STYLE} readOnly={!editable} value={String(form.startTime ?? '').slice(0, 16)} onChange={(e) => updateField('startTime', e.target.value)} />
            </label>
            <label>
              <span style={TOUCH_LABEL_STYLE}>End Time</span>
              <input className="in" type="datetime-local" style={TOUCH_FIELD_STYLE} readOnly={!editable} value={String(form.endTime ?? '').slice(0, 16)} onChange={(e) => updateField('endTime', e.target.value)} />
            </label>
          </div>

          {/* Inspection */}
          <label style={{ marginBottom: 20, display: 'block' }}>
            <span style={TOUCH_LABEL_STYLE}>Inspection Result</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['PASS', 'FAIL', 'HOLD', 'PENDING'].map((r) => (
                <button key={r} type="button" onClick={() => editable && updateField('inspectionResult', r)}
                  style={{ padding: '10px 20px', borderRadius: 8, border: `2px solid ${form.inspectionResult === r ? (r === 'PASS' ? '#16a34a' : r === 'FAIL' ? '#dc2626' : '#d97706') : '#d1d5db'}`,
                    background: form.inspectionResult === r ? (r === 'PASS' ? '#dcfce7' : r === 'FAIL' ? '#fef2f2' : '#fef3c7') : '#fff',
                    color: form.inspectionResult === r ? (r === 'PASS' ? '#166534' : r === 'FAIL' ? '#991b1b' : '#92400e') : '#374151',
                    fontWeight: 600, fontSize: 14, cursor: editable ? 'pointer' : 'default', transition: 'all 0.15s' }}>
                  {r}
                </button>
              ))}
            </div>
          </label>

          {/* Remarks */}
          <label style={{ marginBottom: 20, display: 'block' }}>
            <span style={TOUCH_LABEL_STYLE}>Remarks</span>
            <textarea className="in" rows={2} style={TOUCH_FIELD_STYLE} readOnly={!editable}
              value={String(form.remarks ?? '')} onChange={(e) => updateField('remarks', e.target.value)} placeholder="Optional notes..." />
          </label>

          {/* Action buttons — large touch targets */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '16px 0' }}>
            <button type="button" onClick={() => { setMode('list'); setDocumentId(null); setForm({}); }}
              style={{ padding: '12px 24px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Back
            </button>
            <div style={{ flex: 1 }} />
            {canSubmit && <button type="button" onClick={() => setActionModal({ action: 'submit', danger: false })}
              style={{ padding: '12px 28px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', minWidth: 120 }}>
              Submit
            </button>}
            {canApprove && <button type="button" onClick={() => setActionModal({ action: 'approve', danger: false })}
              style={{ padding: '12px 28px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', minWidth: 120 }}>
              Approve
            </button>}
            {canPost && <button type="button" onClick={() => setActionModal({ action: 'post', danger: false })}
              style={{ padding: '12px 28px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', minWidth: 120 }}>
              Post
            </button>}
            {editable && <button type="button" onClick={handleSave} disabled={isBusy}
              style={{ padding: '12px 28px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', minWidth: 120 }}>
              {isBusy ? 'Saving...' : documentId ? 'Save' : 'Create'}
            </button>}
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={Boolean(actionModal)}
        title={`${actionModal?.action ?? ''} Shop Floor Entry`}
        body={actionModal?.action === 'post' ? 'Post this entry? This will update parent WO quantities and cannot be undone.' : `Confirm ${actionModal?.action ?? ''}?`}
        okLabel={actionModal ? actionModal.action.charAt(0).toUpperCase() + actionModal.action.slice(1) : 'Confirm'}
        danger={actionModal?.danger ?? false}
        busy={isBusy}
        onClose={() => setActionModal(null)}
        onConfirm={(note) => actionModal && runAction(actionModal.action, note)}
      />
    </>
  );
}
