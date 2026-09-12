export type StockIssueDocumentAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'post'
  | 'cancel'
  | 'reopen';

export type StockIssueHeaderFieldType = 'text' | 'select';

export type StockIssueOptionsSource =
  | 'departments'
  | 'suppliers'
  | 'jobOrders'
  | 'grns'
  | string[];

export interface StockIssueHeaderFieldConfig {
  key: string;
  label: string;
  type: StockIssueHeaderFieldType;
  required?: boolean;
  options?: StockIssueOptionsSource;
  fixed?: string;
  span?: number;
}

export interface StockIssueTypeConfig {
  screenId: string;
  title: string;
  prefix: string;
  icon: string;
  subtitle: string;
  apiPath: string;
  transactionType: string;
  docLabel?: string;
  headerFields: StockIssueHeaderFieldConfig[];
}

export interface StockIssueLinePayload {
  itemCode: string;
  issueQty: number;
  batchNo?: string;
  heatNo?: string;
  returnable?: string;
  location: string;
  remarks?: string;
}

export interface StockIssuePayload {
  date: string;
  sourceLocation: string;
  remarks?: string;
  lines: StockIssueLinePayload[];
  [key: string]: unknown;
}

export interface StockIssueLineDto {
  itemCode: string;
  itemDesc?: string;
  issueQty?: number;
  batchNo?: string;
  heatNo?: string;
  returnable?: string;
  location?: string;
  remarks?: string;
}

export interface StockIssueDto {
  id?: string;
  docNo?: string;
  date: string;
  sourceLocation: string;
  remarks?: string;
  status: string;
  lines: StockIssueLineDto[];
  [key: string]: unknown;
}

export interface StockIssueListRowDto {
  id: string;
  docNo: string;
  date: string;
  issueRequestNo?: string;
  sourceLocation?: string;
  qty?: number;
  status: string;
  lines?: Array<{ returnable?: string }>;
}

export interface StockIssueListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
}

export interface StockAvailabilityPair {
  itemCode: string;
  location: string;
}

export interface StockAvailabilityResult {
  itemCode: string;
  location: string;
  availableQty: number;
}