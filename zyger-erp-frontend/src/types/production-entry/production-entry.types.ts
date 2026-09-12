/**
 * PHASE 1 — Frontend Production types (Task 1).
 *
 * Strict TypeScript interfaces based on DEC-PROD-001 (final-part-centric
 * operation-event execution) and DEC-PROD-004 (no direct stock writes — this
 * layer only records production facts; posting intents are separate).
 *
 * Additive file in its own directory to avoid colliding with the pre-existing
 * working-tree types/production/production.types.ts.
 */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
}

/** Operation-level Production Entry (DEC-PROD-001 operation-event model). */
export interface ProductionEntryDTO {
  id?: string;
  workOrderNumber: string;
  routeSheetNo: string;
  operationId: string;
  machineId: string;
  operatorId: string;
  shiftId: string;
  actualStartDateTime: string;
  actualEndDateTime: string;
  processedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  reworkQty: number;
  scrapQty: number;
}
