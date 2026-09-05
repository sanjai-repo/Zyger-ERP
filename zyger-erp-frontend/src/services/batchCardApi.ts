import apiClient from '../api/axiosClient';

export interface BatchCardAllocation {
  id?: number;
  lineNo?: number;
  batchNumber: string;
  lotNumber?: string;
  heatNumber?: string;
  quantity?: number;
  location?: string;
  remarks?: string;
}

export interface BatchCard {
  id: number;
  docNumber: string;
  physicalBatchNumber?: string;
  lotNumber?: string;
  heatNumber?: string;
  itemCode?: string;
  itemName?: string;
  uom?: string;
  quantity?: number;
  entryId?: number;
  entryNumber?: string;
  jobCardNumber?: string;
  subjobNumber?: string;
  operationCode?: string;
  status: string;
  reversalReason?: string;
  reversedFromDocId?: number;
  isReversal?: boolean;
  remarks?: string;
  allocations?: BatchCardAllocation[];
}

export interface EntryOption {
  id: number;
  entryNumber: string;
  workOrderNumber?: string;
  jobCardNumber?: string;
  partCode?: string;
  partDescription?: string;
  goodQuantity?: number;
}

export async function listBatchCards(): Promise<BatchCard[]> {
  const { data } = await apiClient.get('/v1/batch-cards');
  return Array.isArray(data) ? data : data?.content ?? [];
}

export async function createBatchCard(form: Record<string, unknown>): Promise<BatchCard> {
  const { data } = await apiClient.post('/v1/batch-cards', form);
  return data;
}

export async function updateBatchCard(id: number, form: Record<string, unknown>): Promise<BatchCard> {
  const { data } = await apiClient.put(`/v1/batch-cards/${id}`, form);
  return data;
}

export async function runBatchCardAction(id: number, action: string, body: Record<string, unknown> = {}): Promise<BatchCard> {
  const { data } = await apiClient.post(`/v1/batch-cards/${id}/actions/${action}`, body);
  return data;
}