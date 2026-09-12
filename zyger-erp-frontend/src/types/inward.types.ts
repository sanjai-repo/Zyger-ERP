import type { InwardType } from '../config/inwardConfig';

export interface InwardTypeSummary {
  count: number;
  qty: number;
  amount: number;
}

export interface InwardDashboardSummary {
  total: InwardTypeSummary;
  byType: Record<InwardType, InwardTypeSummary>;
  pending: InwardTypeSummary;
}

export interface InwardPendingRow {
  id: string | number;
  docNo: string;
  date: string;
  type: InwardType | string;
  itemCode?: string;
  itemName?: string;
  reference?: string;
  party?: string;
  qty?: number;
  totalAmount?: number;
  taxAmount?: number;
  netAmount?: number;
  status: string;
  lines?: Array<Record<string, any>>;
}

export interface InwardChartPoint {
  date: string;
  PO_INWARD: number;
  LO_INWARD: number;
  JO_INWARD: number;
  GENERAL_INWARD: number;
}

export type InwardChartMetric = 'COUNT' | 'QTY' | 'AMOUNT';

export interface InwardNextNumber {
  inwardType: InwardType;
  prefix: string;
  nextNumber: string;
}

export interface InwardListRow {
  id: string;
  docNo: string;
  date: string;
  itemCode?: string;
  itemName?: string;
  reference?: string;
  party?: string;
  qty?: number;
  amount?: number;
  totalAmount?: number;
  taxAmount?: number;
  netAmount?: number;
  status: string;
  lines?: Array<Record<string, any>>;
}

export interface InwardListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface InwardLinePayload {
  itemCode: string;
  qty: number;
  rate?: number;
  acceptedQty?: number;
  rejectedQty?: number;
  batchNo?: string;
  heatNo?: string;
  location: string;
  remarks?: string;
}

export interface InwardPayload {
  inwardType: InwardType;
  date: string;
  header: Record<string, string>;
  lines: InwardLinePayload[];
}