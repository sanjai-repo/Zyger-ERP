export type ReturnPartySource = 'suppliers' | 'customers' | 'departments';

export type ReturnManagementDocumentAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'post'
  | 'cancel'
  | 'reopen';

export interface ReturnManagementTypeConfig {
  screenId: string;
  title: string;
  prefix: string;
  icon: string;
  subtitle: string;
  apiPath: string;
  transactionType: string;
  partySource: ReturnPartySource;
  partyLabel: string;
}

export interface ReturnManagementLinePayload {
  itemCode: string;
  returnedQty: number;
  acceptedQty?: number;
  rejectedQty?: number;
  batchNo?: string;
  heatNo?: string;
  location: string;
  stockStatus?: string;
  originalIssueNo?: string;
  remarks?: string;
}

export interface ReturnManagementPayload {
  date: string;
  party: string;
  originalDocumentNo: string;
  originalDcDate?: string;
  soNumber?: string;
  customerPoNumber?: string;
  originalIssueType?: string;
  jobOrderNo?: string;
  condition?: string;
  reduceConsumption?: boolean;
  reasonCode: string;
  inspectionRequired?: string;
  remarks?: string;
  lines: ReturnManagementLinePayload[];
}

export interface ReturnManagementLineDto {
  itemCode: string;
  itemDesc?: string;
  returnedQty?: number;
  acceptedQty?: number;
  rejectedQty?: number;
  batchNo?: string;
  heatNo?: string;
  location?: string;
  stockStatus?: string;
  originalIssueNo?: string;
  remarks?: string;
}

export interface ReturnManagementDto {
  id?: string;
  docNo?: string;
  date: string;
  party: string;
  originalDocumentNo: string;
  originalDcDate?: string;
  soNumber?: string;
  customerPoNumber?: string;
  originalIssueType?: string;
  jobOrderNo?: string;
  condition?: string;
  reduceConsumption?: boolean;
  reasonCode: string;
  inspectionRequired?: string;
  remarks?: string;
  status: string;
  lines: ReturnManagementLineDto[];
}

export interface ReturnManagementListRowDto {
  id: string;
  docNo: string;
  date: string;
  party?: string;
  reasonCode?: string;
  qty?: number;
  status: string;
}

export interface ReturnManagementListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
}