import apiClient from '../api/axiosClient';

export type DispositionKind = 'REJECTION' | 'SCRAP' | 'REWORK';

export interface DispositionLine {
  lineNo?: number;
  itemCode: string;
  itemName?: string;
  quantity?: number;
  uom?: string;
  reasonCode?: string;
  reasonDescription?: string;
  disposition?: string;
  batchNumber?: string;
  location?: string;
  warehouse?: string;
  sourceOperationCode?: string;
  targetOperationCode?: string;
  ncrNumber?: string;
  authorizationNumber?: string;
  remarks?: string;
}

export interface DispositionDoc {
  id: number;
  docNumber: string;
  entryId?: number;
  entryNumber?: string;
  workOrderNumber?: string;
  jobCardNumber?: string;
  inspectionDate?: string;
  inspector?: string;
  status: string;
  isReversal?: boolean;
  reversedFromDocId?: number;
  remarks?: string;
  lines?: DispositionLine[];
}

export interface EntryOption {
  id: number;
  entryNumber: string;
  workOrderNumber?: string;
  jobCardNumber?: string;
  partCode?: string;
  partDescription?: string;
  rejectedQuantity?: number;
  scrapQuantity?: number;
  reworkQuantity?: number;
}

export const DISPOSITION_FAMILIES: Record<string, { kind: DispositionKind; basePath: string }> = {
  REJECTION: { kind: 'REJECTION', basePath: '/v1/production/rejections' },
  SCRAP: { kind: 'SCRAP', basePath: '/v1/production/scraps' },
  REWORK: { kind: 'REWORK', basePath: '/v1/production/reworks' },
};

export async function listDispositionDocs(basePath: string): Promise<DispositionDoc[]> {
  const { data } = await apiClient.get(basePath);
  return Array.isArray(data) ? data : data?.content ?? [];
}

export async function createDispositionDoc(basePath: string, form: Record<string, unknown>): Promise<DispositionDoc> {
  const { data } = await apiClient.post(basePath, form);
  return data;
}

export async function updateDispositionDoc(basePath: string, id: number, form: Record<string, unknown>): Promise<DispositionDoc> {
  const { data } = await apiClient.put(`${basePath}/${id}`, form);
  return data;
}

export async function runDispositionAction(basePath: string, id: number, action: string, body: Record<string, unknown> = {}): Promise<DispositionDoc> {
  const { data } = await apiClient.post(`${basePath}/${id}/actions/${action}`, body);
  return data;
}