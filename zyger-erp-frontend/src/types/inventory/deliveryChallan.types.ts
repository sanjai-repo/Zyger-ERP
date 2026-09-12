export type DeliveryChallanPartySource = 'customers' | 'suppliers';

export type DeliveryChallanDocumentAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'post'
  | 'cancel'
  | 'reopen'
  | 'confirm-receipt';

export interface DeliveryChallanTypeConfig {
  screenId: string;
  title: string;
  prefix: string;
  icon: string;
  subtitle: string;
  apiPath: string;
  transactionType: string;
  partySource: DeliveryChallanPartySource;
  partyLabel: string;
}

export interface DeliveryChallanLinePayload {
  itemCode: string;
  qty: number;
  rate?: number;
  amount?: number;
  hsnCode?: string;
  uom?: string;
  batchNo?: string;
  heatNo?: string;
  location: string;
  taxPercent?: number;
  transferValue?: number;
  remarks?: string;
}

export interface DeliveryChallanPayload {
  date: string;
  party: string;
  sourceLocation: string;
  destinationLocation?: string;
  referenceNo?: string;
  referenceDate?: string;
  vehicleNo?: string;
  transporter?: string;
  lrNo?: string;
  modeOfTransport?: string;
  linkedDocumentNo?: string;
  remarks?: string;

  // JO DC fields
  jobOrderNo?: string;
  challanPurpose?: string;
  processName?: string;
  expectedReturnDate?: string;
  jobWorkRateApplicable?: boolean;
  gstOnJobWork?: string;

  // General DC fields
  dcAgainst?: string;
  salesOrderNo?: string;
  billingAddress?: string;
  shippingAddress?: string;
  gstin?: string;
  taxApplicable?: boolean;
  paymentTerms?: string;
  convertToInvoiceLater?: boolean;

  // Transfer DC fields
  transferType?: string;
  transferRequestNo?: string;
  approvalRequired?: boolean;
  inTransitTracking?: boolean;

  lines: DeliveryChallanLinePayload[];
}

export interface DeliveryChallanLineDto {
  itemCode: string;
  itemDesc?: string;
  qty?: number;
  rate?: number;
  amount?: number;
  hsnCode?: string;
  uom?: string;
  batchNo?: string;
  heatNo?: string;
  location?: string;
  taxPercent?: number;
  transferValue?: number;
  remarks?: string;
}

export interface DeliveryChallanDto {
  id?: string;
  docNo?: string;
  date: string;
  party: string;
  sourceLocation: string;
  destinationLocation?: string;
  referenceNo?: string;
  referenceDate?: string;
  vehicleNo?: string;
  transporter?: string;
  lrNo?: string;
  modeOfTransport?: string;
  linkedDocumentNo?: string;
  remarks?: string;
  status: string;

  // JO DC fields
  jobOrderNo?: string;
  challanPurpose?: string;
  processName?: string;
  expectedReturnDate?: string;
  jobWorkRateApplicable?: boolean;
  gstOnJobWork?: string;

  // General DC fields
  dcAgainst?: string;
  salesOrderNo?: string;
  billingAddress?: string;
  shippingAddress?: string;
  gstin?: string;
  taxApplicable?: boolean;
  paymentTerms?: string;
  convertToInvoiceLater?: boolean;
  invoiced?: boolean;
  invoiceNo?: string;

  // Transfer DC fields
  transferType?: string;
  transferRequestNo?: string;
  approvalRequired?: boolean;
  approvedBy?: string;
  inTransitTracking?: boolean;
  receiptConfirmed?: boolean;
  receiptConfirmedBy?: string;

  lines: DeliveryChallanLineDto[];
}

export interface DeliveryChallanListRowDto {
  id: string;
  docNo: string;
  date: string;
  party?: string;
  vehicleNo?: string;
  qty?: number;
  status: string;
}

export interface DeliveryChallanListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
}