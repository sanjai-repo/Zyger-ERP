import type { PageDto } from '../api.types';

/**
 * Production module type foundation (DOC 18 P1; DOC 13 API spec).
 *
 * Naming follows TERM-PROD-001 / ADR-PROD-002: `ProductionOrder` is the canonical
 * term for the existing `work_order`; the legacy term "Work Order" is retained only
 * where screens use it. Document-type keys match those used by the Production API
 * (see DOC 13 and the backend ProductionController).
 */

// ─── Shared ────────────────────────────────────────────────────────────────

export interface ProductionListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ProductionActionPayload {
  action: string;
  note?: string;
  qty?: number;
}

// ─── Production Order (canonical term for work_order) ────────────────────

export interface ProductionOrder {
  id: number;
  workOrderNumber: string;
  woNumber?: string;
  orderType?: string;
  status: string;
  partCode?: string;
  partDescription?: string;
  plannedQuantity?: number;
  completedQuantity?: number;
  producedQty?: number;
  releasedDate?: string;
  plannedStartDate?: string;
  dueDate?: string;
  customerCode?: string;
}

// ─── Job Card ─────────────────────────────────────────────────────────────

export interface JobCard {
  id: number;
  jobCardNumber: string;
  workOrderId?: number;
  workOrderNumber?: string;
  partCode?: string;
  partDescription?: string;
  revision?: string;
  plannedQuantity?: number;
  completedQuantity?: number;
  reworkQuantity?: number;
  rejectedQuantity?: number;
  scrapQuantity?: number;
  priority?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  routeSheetNumber?: string;
  bomNumber?: string;
  customerCode?: string;
  status: string;
  completionStatus?: string;
  subjobs?: JobCardSubjob[];
}

export interface JobCardSubjob {
  id: number;
  jobCardId?: number;
  subjobNumber?: string;
  routeOperationId?: number;
  operationCode?: string;
  operationDescription?: string;
  sequenceNo?: number;
  machineCode?: string;
  operatorCode?: string;
  workCenterCode?: string;
  plannedQuantity?: number;
  completedQuantity?: number;
  reworkQuantity?: number;
  rejectedQuantity?: number;
  scrapQuantity?: number;
  startTime?: string;
  endTime?: string;
  status: string;
  inspectionRequired?: boolean;
}

// ─── Production Entry ─────────────────────────────────────────────────────

export interface ProductionEntry {
  id: number;
  entryNumber: string;
  jobCardId?: number;
  workOrderId?: number;
  partCode?: string;
  processQty?: number;
  goodQuantity?: number;
  rejectedQuantity?: number;
  scrapQuantity?: number;
  reworkQuantity?: number;
  status: string;
  entryDate?: string;
}

export interface ProductionEntryLinePayload {
  itemCode: string;
  processQty: number;
  goodQuantity?: number;
  rejectedQuantity?: number;
  scrapQuantity?: number;
  reworkQuantity?: number;
  machineCode?: string;
  operatorCode?: string;
  remarks?: string;
}

// ─── Product Conversion ───────────────────────────────────────────────────

export interface ProductConversion {
  id: number;
  conversionNumber: string;
  status: string;
  inputItemCode?: string;
  inputQuantity?: number;
  outputItemCode?: string;
  outputQuantity?: number;
  sourceWarehouse?: string;
  destinationWarehouse?: string;
  conversionDate?: string;
}

// ─── Production Return ────────────────────────────────────────────────────

export interface ProductionReturn {
  id: number;
  returnNumber: string;
  status: string;
  itemCode?: string;
  quantity?: number;
  condition?: string;
  location?: string;
  warehouse?: string;
  batchNumber?: string;
  returnDate?: string;
}

// ─── Production Log Sheet ─────────────────────────────────────────────────

export interface ProductionLogSheet {
  id: number;
  logNumber: string;
  status: string;
  logDate?: string;
  jobCardId?: number;
  machineCode?: string;
  operatorCode?: string;
  remarks?: string;
}

export interface ProductionLogActivity {
  id: number;
  logSheetId: number;
  activityCode?: string;
  activityName?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}

// ─── Idle Time ────────────────────────────────────────────────────────────

export interface IdleTimeEntry {
  id: number;
  entryNumber: string;
  status: string;
  machineCode?: string;
  reasonCode?: string;
  reason?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}

// ─── Pending / Dashboard ──────────────────────────────────────────────────

export interface ProductionPendingRow {
  id: number;
  docNumber: string;
  docType: string;
  reference?: string;
  itemCode?: string;
  itemName?: string;
  qty?: number;
  status: string;
}

export interface ProductionDashboardSummary {
  totalOrders: number;
  ordersInProcess: number;
  jobsOpen: number;
  jobsCompleted: number;
  entriesToday: number;
  pendingApprovals: number;
}

// ─── Response type helpers ────────────────────────────────────────────────

export type ProductionPage<T> = PageDto<T>;

// ─── Production Material Request (P6, SCR-PROD-MREQ-001) ─────────────────

export interface ProductionMaterialRequestLine {
  id?: number;
  itemCode: string;
  itemDescription?: string;
  requiredQty: number;
  issuedQty?: number;
  uom?: string;
  storeCode?: string;
  rack?: string;
  bin?: string;
  lot?: string;
  batchNumber?: string;
  lineRemarks?: string;
}

export interface ProductionMaterialRequest {
  id?: number;
  reqNo?: string;
  jobCardId?: number | null;
  jobCardNumber?: string;
  workOrderNumber?: string;
  reqDate?: string;
  status?: string;
  requestedBy?: string;
  remarks?: string;
  issuedAt?: string;
  closedAt?: string;
  lines?: ProductionMaterialRequestLine[];
}

// ─── Production Material Consumption (P6, SCR-PROD-CONSUME-001) ──────────

export interface ProductionConsumptionLine {
  id?: number;
  itemCode: string;
  itemDescription?: string;
  issuedQty?: number;
  consumedQty: number;
  returnQty?: number;
  scrapQty?: number;
  batchNumber?: string;
  uom?: string;
  location?: string;
  lineRemarks?: string;
}

export interface ProductionConsumption {
  id?: number;
  version?: number;
  consumptionNo?: string;
  jobCardId?: number | null;
  jobCardNumber?: string;
  workOrderNumber?: string;
  materialRequestNo?: string;
  consumptionDate?: string;
  status?: string;
  postedAt?: string;
  remarks?: string;
  lines?: ProductionConsumptionLine[];
}