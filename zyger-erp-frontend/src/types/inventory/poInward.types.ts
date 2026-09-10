export type DocumentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'POSTED'
  | 'REJECTED'
  | 'CANCELLED';

export type DocumentAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'post'
  | 'cancel'
  | 'reopen';

export interface PoInwardLinePayload {
  itemCode: string;
  itemDesc?: string;
  description?: string;
  uom?: string;
  receivedQty: number;
  rate?: number;
  amount?: number;
  discount?: number;
  tax?: number;
  taxAmount?: number;
  netAmount?: number;
  acceptedQty?: number;
  rejectedQty?: number;
  rejectedReason?: string;
  batchNo?: string;
  heatNo?: string;
  location: string;
  remarks?: string;
}

export interface PoInwardPayload {
  date: string;
  supplier: string;
  purchaseOrderNo?: string;
  supplierChallanNo?: string;
  supplierInvoiceNo?: string;
  dcNumber?: string;
  qcRequired?: string;
  vehicleNo?: string;
  receivedBy: string;
  remarks?: string;
  lines: PoInwardLinePayload[];
}

export interface PoInwardLineDto {
  itemCode: string;
  itemDesc?: string;
  description?: string;
  uom?: string;
  receivedQty?: number;
  rate?: number;
  amount?: number;
  discount?: number;
  tax?: number;
  taxAmount?: number;
  netAmount?: number;
  acceptedQty?: number;
  rejectedQty?: number;
  rejectedReason?: string;
  batchNo?: string;
  heatNo?: string;
  location?: string;
  remarks?: string;
}

export interface PoInwardDto {
  id?: string;
  docNo?: string;
  date: string;
  supplier: string;
  purchaseOrderNo?: string;
  supplierChallanNo?: string;
  supplierInvoiceNo?: string;
  dcNumber?: string;
  qcRequired?: string;
  vehicleNo?: string;
  receivedBy: string;
  remarks?: string;
  status: DocumentStatus;
  lines: PoInwardLineDto[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PoInwardListRowDto {
  id: string;
  docNo: string;
  date: string;
  firstItemCode?: string;
  firstItemName?: string;
  supplier?: string;
  firstRate?: number;
  totalAmount?: number;
  totalQty?: number;
  taxAmount?: number;
  netAmount?: number;
  lines?: PoInwardLineDto[];
  status: DocumentStatus;
}

export interface PoInwardListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
}