import apiClient from '../api/axiosClient';

export interface GateBlocker {
  inspectionId?: number;
  docNo?: string;
  inspectionStatus?: string;
  gateStatus?: string;
  decisionStatus?: string;
  operationCode?: string;
}

export interface GateOverride {
  id: number;
  inspectionId: number;
  inspectionNumber?: string;
  jobCardNumber?: string;
  operationCode?: string;
  operationSequence?: number;
  itemCode?: string;
  quantity?: number;
  batchNumber?: string;
  reason?: string;
  category?: string;
  status: string;
  qualityApproverUser?: string;
  qualityApprovedAt?: string;
  productionApproverUser?: string;
  productionApprovedAt?: string;
  plantHeadApproverUser?: string;
  plantHeadApprovedAt?: string;
  appliedByUser?: string;
  appliedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperationGateRow {
  subjobNumber?: string;
  operationCode?: string;
  sequenceNo?: number;
  status?: string;
  plannedQuantity?: number;
  completedQuantity?: number;
  qualityGate?: string;
  qualityBlocked?: boolean;
  blockers?: GateBlocker[];
}

export interface GateStatusDto {
  jobCardNumber: string;
  jobCardGate: string;
  operations: OperationGateRow[];
  overrides: GateOverride[];
}

export async function getGateStatus(jobCardNumber: string): Promise<GateStatusDto> {
  const { data } = await apiClient.get('/v1/production/quality-gate/status', { params: { jobCardNumber } });
  return data;
}

export async function listOverrides(): Promise<GateOverride[]> {
  const { data } = await apiClient.get('/v1/production/quality-gate/overrides');
  return Array.isArray(data) ? data : data?.content ?? [];
}

export async function getOverride(id: number): Promise<{ override: GateOverride; audit: unknown[] }> {
  const { data } = await apiClient.get(`/v1/production/quality-gate/overrides/${id}`);
  return data;
}

export async function requestOverride(payload: Record<string, unknown>): Promise<GateOverride> {
  const { data } = await apiClient.post('/v1/production/quality-gate/overrides', payload);
  return data;
}

export async function signOverride(id: number, kind: 'quality' | 'production' | 'plant-head'): Promise<GateOverride> {
  const { data } = await apiClient.post(`/v1/production/quality-gate/overrides/${id}/sign-${kind}`);
  return data;
}

export const OVERRIDE_STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  PENDING: { color: '#92400e', bg: '#fef3c7' },
  APPROVED: { color: '#2563eb', bg: '#dbeafe' },
  APPLIED: { color: '#22c55e', bg: '#d4edda' },
};

export const GATE_STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  CLEAR: { color: '#22c55e', bg: '#d4edda' },
  PENDING: { color: '#92400e', bg: '#fef3c7' },
  FAIL: { color: '#dc2626', bg: '#fee2e2' },
  HELD: { color: '#dc2626', bg: '#fee2e2' },
  BLOCKED: { color: '#dc2626', bg: '#fee2e2' },
  OVERRIDDEN: { color: '#2563eb', bg: '#dbeafe' },
};