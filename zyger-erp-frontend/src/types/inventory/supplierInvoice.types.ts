export type SupplierInvoiceDocumentAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'post'
  | 'cancel'
  | 'reopen';

export interface SupplierInvoiceAttachment {
  id: string;
  fileName: string;
}

export interface PurchaseInvoicePayload {
  date: string;
  supplier: string;
  purchaseOrderNo: string;
  supplierInvoiceNo: string;
  taxAmount?: number;
  totalAmount: number;
  dueDate?: string;
}

export interface PurchaseInvoiceDto {
  id?: string;
  docNo?: string;
  date: string;
  supplier: string;
  purchaseOrderNo: string;
  supplierInvoiceNo: string;
  taxAmount?: number;
  totalAmount: number;
  dueDate?: string;
  attachments?: SupplierInvoiceAttachment[];
  status: string;
}

export interface PurchaseInvoiceListRowDto {
  id: string;
  docNo: string;
  date: string;
  supplier?: string;
  totalAmount?: number;
  status: string;
}

export interface SubcontractInvoiceLinePayload {
  itemCode: string;
  processedQty: number;
  rate: number;
}

export interface SubcontractInvoicePayload {
  date: string;
  vendor: string;
  labourOrderNo: string;
  process: string;
  totalAmount: number;
  lines: SubcontractInvoiceLinePayload[];
}

export interface SubcontractInvoiceLineDto {
  itemCode: string;
  itemDesc?: string;
  processedQty?: number;
  rate?: number;
  amount?: number;
}

export interface SubcontractInvoiceDto {
  id?: string;
  docNo?: string;
  date: string;
  vendor: string;
  labourOrderNo: string;
  process: string;
  totalAmount: number;
  attachments?: SupplierInvoiceAttachment[];
  status: string;
  lines: SubcontractInvoiceLineDto[];
}

export interface SubcontractInvoiceListRowDto {
  id: string;
  docNo: string;
  date: string;
  vendor?: string;
  totalAmount?: number;
  status: string;
}

export interface SupplierInvoiceListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
}