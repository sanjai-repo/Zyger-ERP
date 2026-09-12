import type {
  StockAmendmentDto,
  StockAmendmentPayload,
} from '../../../../types/inventory/adjustment.types';
import { toNumber, todayISO } from '../../../../utils/format';

export interface StockAmendmentFormState {
  date: string;
  itemCode: string;
  location: string;
  batchNo: string;
  systemQty: string;
  correctedQty: string;
  differenceQty: string;
  reasonCode: string;
  remarks: string;
}

export function createEmptyForm(): StockAmendmentFormState {
  return {
    date: todayISO(),
    itemCode: '',
    location: '',
    batchNo: '',
    systemQty: '',
    correctedQty: '',
    differenceQty: '',
    reasonCode: '',
    remarks: '',
  };
}

export function formFromDto(
  dto: StockAmendmentDto
): StockAmendmentFormState {
  return {
    date: dto.date ?? '',
    itemCode: dto.itemCode ?? '',
    location: dto.location ?? '',
    batchNo: dto.batchNo ?? '',
    systemQty: dto.systemQty?.toString() ?? '',
    correctedQty: dto.correctedQty?.toString() ?? '',
    differenceQty: dto.differenceQty?.toString() ?? '',
    reasonCode: dto.reasonCode ?? '',
    remarks: dto.remarks ?? '',
  };
}

export function buildPayload(
  form: StockAmendmentFormState
): StockAmendmentPayload {
  return {
    date: form.date,
    itemCode: form.itemCode.trim(),
    location: form.location.trim(),
    batchNo: form.batchNo.trim() || undefined,
    correctedQty: toNumber(form.correctedQty),
    reasonCode: form.reasonCode.trim(),
    remarks: form.remarks.trim(),
  };
}

export function calculateDifference(
  systemQty: string,
  correctedQty: string
): string {
  const system = toNumber(systemQty);
  const corrected = toNumber(correctedQty);
  return String(corrected - system);
}

export function validateStockAmendmentForm(
  form: StockAmendmentFormState
): string[] {
  const errors: string[] = [];

  if (!form.date) {
    errors.push('Date is required.');
  }

  if (!form.itemCode.trim()) {
    errors.push('Item is required.');
  }

  if (!form.location.trim()) {
    errors.push('Location is required.');
  }

  const correctedQty = toNumber(form.correctedQty);

  if (form.correctedQty.trim() === '' || correctedQty < 0) {
    errors.push('Corrected Qty is required and must be zero or greater.');
  }

  if (!form.reasonCode.trim()) {
    errors.push('Reason Code is required.');
  }

  if (!form.remarks.trim()) {
    errors.push('Remarks is required.');
  }

  return [...new Set(errors)];
}