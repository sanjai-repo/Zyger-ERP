import type { ItemMasterDto } from '../../../../types/master.types';
import type {
  SirDto,
  SirLineDto,
  SirPayload,
} from '../../../../types/inventory/stockIssueRequest.types';
import {
  toNumber,
  toOptionalNumber,
  todayISO,
} from '../../../../utils/format';

export interface SirLineFormState {
  itemCode: string;
  itemDesc: string;
  requestedQty: string;
  approvedQty: string;
  returnable: string;
  remarks: string;
}

export interface SirFormState {
  date: string;
  department: string;
  requestedBy: string;
  requiredDate: string;
  jobOrderNo: string;
  purpose: string;
  remarks: string;
  lines: SirLineFormState[];
}

const DIRTY_LINE_KEYS: Array<keyof SirLineFormState> = [
  'itemCode',
  'requestedQty',
  'approvedQty',
  'returnable',
  'remarks',
];

export function createEmptyLine(): SirLineFormState {
  return {
    itemCode: '',
    itemDesc: '',
    requestedQty: '',
    approvedQty: '',
    returnable: '',
    remarks: '',
  };
}

export function createEmptyForm(): SirFormState {
  return {
    date: todayISO(),
    department: '',
    requestedBy: '',
    requiredDate: '',
    jobOrderNo: '',
    purpose: '',
    remarks: '',
    lines: [createEmptyLine()],
  };
}

export function isLineDirty(line: SirLineFormState): boolean {
  return DIRTY_LINE_KEYS.some((key) => String(line[key] ?? '').trim() !== '');
}

function lineFromDto(
  line: SirLineDto,
  itemsMap: Map<string, ItemMasterDto>
): SirLineFormState {
  const item = itemsMap.get(line.itemCode);

  return {
    itemCode: line.itemCode ?? '',
    itemDesc: line.itemDesc ?? item?.description ?? '',
    requestedQty: line.requestedQty?.toString() ?? '',
    approvedQty: line.approvedQty?.toString() ?? '',
    returnable: line.returnable ?? '',
    remarks: line.remarks ?? '',
  };
}

export function formFromDto(
  dto: SirDto,
  items: ItemMasterDto[]
): SirFormState {
  const itemsMap = new Map(items.map((item) => [item.code, item]));

  return {
    date: dto.date ?? '',
    department: dto.department ?? '',
    requestedBy: dto.requestedBy ?? '',
    requiredDate: dto.requiredDate ?? '',
    jobOrderNo: dto.jobOrderNo ?? '',
    purpose: dto.purpose ?? '',
    remarks: dto.remarks ?? '',
    lines:
      dto.lines && dto.lines.length > 0
        ? dto.lines.map((line) => lineFromDto(line, itemsMap))
        : [createEmptyLine()],
  };
}

export function buildPayload(form: SirFormState): SirPayload {
  const activeLines = form.lines.filter(isLineDirty);

  return {
    date: form.date,
    department: form.department,
    requestedBy: form.requestedBy.trim(),
    requiredDate: form.requiredDate,
    jobOrderNo: form.jobOrderNo.trim() || undefined,
    purpose: form.purpose.trim(),
    remarks: form.remarks.trim() || undefined,
    lines: activeLines.map((line) => ({
      itemCode: line.itemCode.trim(),
      requestedQty: toNumber(line.requestedQty),
      approvedQty: toOptionalNumber(line.approvedQty),
      returnable: line.returnable,
      remarks: line.remarks.trim() || undefined,
    })),
  };
}

export function validateSirForm(form: SirFormState): string[] {
  const errors: string[] = [];

  if (!form.date) {
    errors.push('Date is required.');
  }

  if (!form.department) {
    errors.push('Department is required.');
  }

  if (!form.requestedBy.trim()) {
    errors.push('Requested By is required.');
  }

  if (!form.requiredDate) {
    errors.push('Required Date is required.');
  }

  if (!form.purpose.trim()) {
    errors.push('Purpose is required.');
  }

  const activeLines = form.lines.filter(isLineDirty);

  if (activeLines.length === 0) {
    errors.push('At least one line item is required.');
  }

  activeLines.forEach((line, index) => {
    const lineNo = index + 1;

    if (!line.itemCode.trim()) {
      errors.push(`Line ${lineNo}: Item Code is required.`);
    }

    const qty = toNumber(line.requestedQty);

    if (!qty || qty <= 0) {
      errors.push(`Line ${lineNo}: Requested Qty is required.`);
    }

    if (!line.returnable) {
      errors.push(`Line ${lineNo}: Returnable is required.`);
    }

    const approved = toOptionalNumber(line.approvedQty);

    if (approved !== undefined && approved < 0) {
      errors.push(`Line ${lineNo}: Approved Qty cannot be negative.`);
    }
  });

  return [...new Set(errors)];
}