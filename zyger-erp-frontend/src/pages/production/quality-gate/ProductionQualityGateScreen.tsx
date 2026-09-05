import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import StatusBadge from '../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import {
  getGateStatus,
  listOverrides,
  getOverride,
  requestOverride,
  signOverride,
  OVERRIDE_STATUS_STYLE,
  GATE_STATUS_STYLE,
} from '../../../services/productionQualityGateApi';
import type {
  GateBlocker,
  GateOverride,
  GateStatusDto,
  OperationGateRow,
} from '../../../services/productionQualityGateApi';

interface AuditEvent {
  id?: number;
  eventType?: string;
  previousStatus?: string;
  newStatus?: string;
  changedByUser?: string;
  timestamp?: string;
  detailsJson?: string;
}

export function ProductionQualityGateScreen(_props: { screenId: string }) {
  const { toast } = useToast();
  const { can } = useAuth();

  const [jobCardNumber, setJobCardNumber] = useState('');
  const [gate, setGate] = useState<GateStatusDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [overrides, setOverrides] = useState<GateOverride[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(true);

  const [requestTarget, setRequestTarget] = useState<GateBlocker | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [requestQty, setRequestQty] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);

  const [auditTarget, setAuditTarget] = useState<GateOverride | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditBusy, setAuditBusy] = useState(false);

  const [signBusyId, setSignBusyId] = useState<number | null>(null);

  const loadOverrides = useCallback(async () => {
    setOverridesLoading(true);
    try {
      setOverrides(await listOverrides());
    } catch (e) {
      toast(getApiErrorMessage(e, 'Override list load failed.'), 'error');
    }
    setOverridesLoading(false);
  }, [toast]);

  useEffect(() => {
    loadOverrides();
  }, [loadOverrides]);

  const loadGate = useCallback(async () => {
    const jc = jobCardNumber.trim();
    if (!jc) {
      toast('Enter a Job Card number.', 'error');
      return;
    }
    setLoading(true);
    try {
      setGate(await getGateStatus(jc));
    } catch (e) {
      toast(getApiErrorMessage(e, 'Gate status load failed.'), 'error');
    }
    setLoading(false);
  }, [jobCardNumber, toast]);

  const doSign = async (ovr: GateOverride, kind: 'quality' | 'production' | 'plant-head') => {
    setSignBusyId(ovr.id);
    try {
      const updated = await signOverride(ovr.id, kind);
      toast(`Signed (${kind}). Status: ${updated.status}.`);
      await loadOverrides();
      if (gate) setGate(await getGateStatus(gate.jobCardNumber));
    } catch (e) {
      toast(getApiErrorMessage(e, 'Signing failed. Verify your authority roles.'), 'error');
    }
    setSignBusyId(null);
  };

  const submitRequest = async (note: string) => {
    if (!requestTarget) return;
    setRequestBusy(true);
    try {
      const payload: Record<string, unknown> = {
        inspectionId: requestTarget.inspectionId,
        reason: note.trim() || requestReason.trim(),
        quantity: Number(requestQty),
      };
      if (requestTarget.operationCode) payload.operationCode = requestTarget.operationCode;
      const created = await requestOverride(payload);
      toast(`Override request #${created.id} raised (${created.status}).`);
      setRequestTarget(null);
      setRequestReason('');
      setRequestQty('');
      await loadOverrides();
      if (gate) setGate(await getGateStatus(gate.jobCardNumber));
    } catch (e) {
      toast(getApiErrorMessage(e, 'Override request failed.'), 'error');
    }
    setRequestBusy(false);
  };

  const viewAudit = async (ovr: GateOverride) => {
    setAuditTarget(ovr);
    setAuditBusy(true);
    try {
      const detail = await getOverride(ovr.id);
      setAuditEvents((detail.audit ?? []) as AuditEvent[]);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Audit load failed.'), 'error');
      setAuditEvents([]);
    }
    setAuditBusy(false);
  };

  const discharge = async (ovr: GateOverride) => {
    if (jobCardNumber.trim() !== ovr.jobCardNumber && ovr.jobCardNumber) {
      setJobCardNumber(ovr.jobCardNumber ?? '');
    }
    setGate(null);
    try {
      setGate(await getGateStatus(ovr.jobCardNumber || jobCardNumber.trim()));
      toast('Gate status refreshed for the override job card.');
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to refresh gate status.'), 'error');
    }
  };

  const blockersWithAction = (row?: OperationGateRow): GateBlocker[] => row?.blockers?.filter((b) => b.inspectionId) ?? [];

  return (
    <>
      <div className="pg-head">
        <h1>Production Quality Gate</h1>
        <p>CLAR-PROD-012 &ndash; block next operation / entry post while inspection is PENDING, FAIL or HELD, unless a one-time override was approved.</p>
      </div>

      <div className="panel">
        <div className="row">
          <div className="col">
            <label className="lbl">Job Card number</label>
            <input
              className="inp"
              value={jobCardNumber}
              onChange={(e) => setJobCardNumber(e.target.value)}
              placeholder="e.g. JCF-2026-000123"
              onKeyDown={(e) => {
                if (e.key === 'Enter') loadGate();
              }}
            />
          </div>
          <div className="col">
            <label className="lbl">&nbsp;</label>
            <button className="btn btn-p" onClick={loadGate} disabled={loading}>
              {loading ? 'Checking…' : 'Check gate'}
            </button>
          </div>
        </div>
      </div>

      {gate && (
        <>
          <div className="panel">
            <h3>
              Gate: {gate.jobCardNumber}{' '}
              <StatusBadge status={gate.jobCardGate} variant={GATE_STATUS_STYLE} />
            </h3>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Op</th>
                    <th>Subjob</th>
                    <th>Seq</th>
                    <th>Status</th>
                    <th>Planned</th>
                    <th>Completed</th>
                    <th>Gate</th>
                    <th>Blockers</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {gate.operations.map((row, i) => {
                    const blockers = blockersWithAction(row);
                    return (
                      <tr key={i}>
                        <td>{row.operationCode}</td>
                        <td>{row.subjobNumber}</td>
                        <td>{row.sequenceNo}</td>
                        <td>{row.status}</td>
                        <td>{row.plannedQuantity}</td>
                        <td>{row.completedQuantity}</td>
                        <td>
                          <StatusBadge status={row.qualityGate ?? 'CLEAR'} variant={GATE_STATUS_STYLE} />
                        </td>
                        <td>
                          {blockers.map((b) => (
                            <span key={b.docNo}>
                              <StatusBadge status={`${b.docNo} [${b.gateStatus}]`} variant={GATE_STATUS_STYLE} />
                            </span>
                          ))}
                        </td>
                        <td>
                          {row.qualityBlocked &&
                            blockers.map((b) => (
                              <button
                                key={b.docNo}
                                className="btn btn-sm btn-w"
                                disabled={!can('production', 'Edit')}
                                onClick={() => {
                                  setRequestTarget(b);
                                  setRequestReason('');
                                  setRequestQty(String(row.plannedQuantity ?? ''));
                                }}
                              >
                                Request override
                              </button>
                            ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="panel">
        <h3>Overrides {overridesLoading && <span className="muted">(loading…)</span>}</h3>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Inspection</th>
                <th>Job Card</th>
                <th>Op</th>
                <th>Category</th>
                <th>Status</th>
                <th>Approvers</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.inspectionNumber}</td>
                  <td>{o.jobCardNumber}</td>
                  <td>{o.operationCode}</td>
                  <td>{o.category}</td>
                  <td>
                    <StatusBadge status={o.status} variant={OVERRIDE_STATUS_STYLE} />
                  </td>
                  <td>
                    {(o.qualityApproverUser ? `QC: ${o.qualityApproverUser}` : '') +
                      (o.productionApproverUser ? ` / Prod: ${o.productionApproverUser}` : '') +
                      (o.plantHeadApproverUser ? ` / PH: ${o.plantHeadApproverUser}` : '')}
                  </td>
                  <td>
                    {o.status === 'PENDING' && can('production', 'Approve') && (
                      <button
                        className="ibtn"
                        title="Sign as Quality Supervisor"
                        disabled={signBusyId === o.id}
                        onClick={() => doSign(o, 'quality')}
                      >
                        <span className="material-symbols-rounded">approval</span>
                      </button>
                    )}
                    {o.status === 'PENDING' && can('production', 'Approve') && (
                      <button
                        className="ibtn"
                        title="Sign as Production Supervisor"
                        disabled={signBusyId === o.id}
                        onClick={() => doSign(o, 'production')}
                      >
                        <span className="material-symbols-rounded">check</span>
                      </button>
                    )}
                    {o.status === 'PENDING' && can('production', 'Approve') && (
                      <button
                        className="ibtn"
                        title="Sign as Plant Head"
                        disabled={signBusyId === o.id}
                        onClick={() => doSign(o, 'plant-head')}
                      >
                        <span className="material-symbols-rounded">fact_check</span>
                      </button>
                    )}
                    {(o.status === 'PENDING' || o.status === 'APPROVED') && (
                      <button className="ibtn" title="View audit trail" onClick={() => viewAudit(o)}>
                        <span className="material-symbols-rounded">history</span>
                      </button>
                    )}
                    {o.status === 'APPLIED' && (
                      <button className="ibtn" title="Refresh gate for this job card" onClick={() => discharge(o)}>
                        <span className="material-symbols-rounded">refresh</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {overrides.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    No override requests recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmActionModal
        open={requestTarget != null}
        title="Request production quality gate override"
        body={
          requestTarget
            ? `Inspection ${requestTarget.docNo} [${requestTarget.gateStatus}] requires an approved override (joint Quality + Production, or Plant Head). The override is one-time, operation-scoped and audited.`
            : ''
        }
        okLabel="Raise request"
        busy={requestBusy}
        onClose={() => setRequestTarget(null)}
        onConfirm={(note) => submitRequest(note)}
      />

      <ConfirmActionModal
        open={auditTarget != null}
        title={`Override #${auditTarget?.id ?? ''} audit trail`}
        body={
          auditBusy
            ? 'Loading…'
            : JSON.stringify(auditEvents.map((e) => ({
                event: e.eventType,
                from: e.previousStatus,
                to: e.newStatus,
                by: e.changedByUser,
                at: e.timestamp,
              })))
        }
        okLabel="Close"
        onClose={() => setAuditTarget(null)}
        onConfirm={() => setAuditTarget(null)}
      />
    </>
  );
}

export default ProductionQualityGateScreen;